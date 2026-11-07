import os
from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.security import (DUMMY_HASH, check_csrf, create_token, get_current_admin, hash_password,
                             require_roles, validate_password_strength, verify_password)
from ..database import get_db
from ..middleware.audit import log_action
from ..middleware.rate_limit import (client_ip, ensure_not_locked, limiter, login_by_ip,
                                     login_by_ip_user, login_by_user, register_failures)
from ..models.application import (AdminNote, Allocation, AllocationHistory, Application, AuditLog,
                                  CorrectionRequest, Document, Notification, VerificationRecord)
from ..models.funding import FundingPeriod
from ..models.user import User
from ..repositories.application_repo import to_public_dict
from ..schemas.admin import (AdminLogin, AllocationIn, CorrectionRequestIn, DisburseIn, NoteIn,
                             StatusUpdate, VerificationIn)
from ..services import excel_service
from ..services.pdf_service import generate_application_pdf
from ..services.status import transition

router = APIRouter(prefix="/api/admin", tags=["admin"])

COOKIE_PATH = "/api"
MAX_IMPORT_BYTES = 5 * 1024 * 1024


# ---------- helpers ----------
def _like(term: str) -> str:
    """Escape LIKE wildcards so users can't craft expensive patterns."""
    esc = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{esc}%"


# ---------- AUTH ----------
@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, response: Response, payload: AdminLogin, db: Session = Depends(get_db)):
    check_csrf(request)
    ip = client_ip(request)
    ident = (payload.username or "").strip().lower()[:128]
    pairs = [(login_by_ip_user, f"{ip}|{ident}"), (login_by_user, ident), (login_by_ip, ip)]
    ensure_not_locked(*pairs)

    user = db.query(User).filter(or_(func.lower(User.username) == ident,
                                     func.lower(User.email) == ident)).first()
    # Always run one bcrypt verification so timing doesn't reveal if the user exists.
    ok = verify_password((payload.password or "")[:128],
                         user.password_hash if user else DUMMY_HASH) and user is not None
    if not ok:
        register_failures(*pairs)
        log_action(ident or "unknown", "Admin login FAILED")
        raise HTTPException(401, "Invalid credentials.")
    if not user.is_active:
        raise HTTPException(403, "Account disabled.")

    login_by_ip_user.reset(f"{ip}|{ident}")
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    log_action(user.username, "Admin login")

    token = create_token({"sub": str(user.id), "role": user.role})
    response.set_cookie(settings.COOKIE_NAME, token,
                        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                        httponly=True, secure=settings.cookie_secure, samesite="strict",
                        path=COOKIE_PATH, domain=settings.COOKIE_DOMAIN)
    # The token is only in the httpOnly cookie, never in the response body.
    return {"role": user.role, "full_name": user.full_name}


@router.post("/logout")
def logout(request: Request, response: Response):
    check_csrf(request)
    response.delete_cookie(settings.COOKIE_NAME, path=COOKIE_PATH, domain=settings.COOKIE_DOMAIN)
    return {"message": "Logged out."}


@router.get("/me")
def me(admin=Depends(get_current_admin)):
    return {"username": admin.username, "role": admin.role, "full_name": admin.full_name}


class PasswordChangeIn(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(max_length=72)


@router.post("/change-password")
@limiter.limit("5/minute")
def change_password(request: Request, payload: PasswordChangeIn, db: Session = Depends(get_db),
                    admin=Depends(get_current_admin)):
    if not verify_password(payload.current_password, admin.password_hash):
        log_action(admin.username, "Password change FAILED")
        raise HTTPException(400, "Current password is incorrect.")
    err = validate_password_strength(payload.new_password, admin.username)
    if err:
        raise HTTPException(400, err)
    if verify_password(payload.new_password, admin.password_hash):
        raise HTTPException(400, "New password must be different from the current one.")
    admin.password_hash = hash_password(payload.new_password)
    db.commit()
    log_action(admin.username, "Password changed")
    return {"message": "Password updated."}


# ---------- DASHBOARD ----------
@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    def cnt(status): return db.query(Application).filter_by(status=status).count()
    total = db.query(Application).count()
    requested = db.query(func.coalesce(func.sum(Application.amount_requested), 0)).scalar()
    allocated = db.query(func.coalesce(func.sum(Allocation.amount), 0)).scalar()
    period = db.query(FundingPeriod).filter_by(is_active=True).first()
    fund = float(period.total_fund) if period else 0
    by_ward_rows = (db.query(Application.applicant.property.mapper.class_.ward, func.count())
                    .join(Application.applicant)
                    .group_by(Application.applicant.property.mapper.class_.ward).all())
    return {"total_applications": total,
            "drafts": cnt("Draft"), "submitted": cnt("Submitted"),
            "awaiting_verification": cnt("Awaiting Physical Verification"),
            "signed_uploaded": cnt("Signed Form Uploaded"), "under_review": cnt("Under Admin Review"),
            "correction_required": cnt("Correction Required"), "verified": cnt("Verified"),
            "approved": cnt("Approved"), "rejected": cnt("Rejected"),
            "allocated_count": cnt("Amount Allocated"),
            "disbursed": cnt("Disbursed"),
            "amount_requested": float(requested), "amount_allocated": float(allocated),
            "total_fund": fund, "remaining_fund": fund - float(allocated),
            "by_ward": {w: c for w, c in by_ward_rows}}


# ---------- APPLICATIONS ----------
@router.get("/applications")
def list_applications(status: Optional[str] = Query(None, max_length=50),
                      ward: Optional[str] = Query(None, max_length=100),
                      institution: Optional[str] = Query(None, max_length=100),
                      search: Optional[str] = Query(None, max_length=100),
                      sort: str = Query("newest", max_length=20),
                      page: int = Query(1, ge=1, le=100000), size: int = Query(25, ge=1, le=100),
                      db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    q = db.query(Application).join(Application.applicant)
    A = Application.applicant.property.mapper.class_
    if status: q = q.filter(Application.status == status)
    if ward: q = q.filter(A.ward == ward)
    if institution: q = q.filter(A.institution.ilike(_like(institution), escape="\\"))
    if search:
        like = _like(search)
        q = q.filter(or_(Application.application_number.ilike(like, escape="\\"),
                         A.full_name.ilike(like, escape="\\"), A.reg_number.ilike(like, escape="\\"),
                         A.id_number.ilike(like, escape="\\")))
    sort_map = {"newest": Application.created_at.desc(), "oldest": Application.created_at.asc(),
                "highest_request": Application.amount_requested.desc(),
                "lowest_request": Application.amount_requested.asc()}
    q = q.order_by(sort_map.get(sort, sort_map["newest"]))
    total = q.count()
    items = q.offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page,
            "items": [{**to_public_dict(a), "access_code": None} for a in items]}


@router.get("/applications/{app_id}")
def get_application(app_id: int, db: Session = Depends(get_db),
                    admin=Depends(get_current_admin)):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Application not found.")
    data = to_public_dict(app)
    data["access_code"] = None  # staff must never see the applicant's access code
    data["documents"] = [{"id": d.id, **d_} for d, d_ in zip(app.documents, data["documents"])]
    data["notes"] = [{"note": n.note, "is_student_visible": n.is_student_visible,
                      "created_by": n.created_by, "created_at": str(n.created_at)}
                     for n in db.query(AdminNote).filter_by(application_id=app.id)]
    log_action(admin.username, "Application viewed", app.application_number)
    return data


# Statuses that may only be reached through their dedicated endpoints
# (allocation, disbursement) or by the applicant flow. ADJUST to your workflow.
_BLOCKED_VIA_PATCH = {"Draft", "Submitted", "Awaiting Physical Verification", "Signed Form Uploaded",
                      "Amount Allocated", "Disbursed"}
_VERIFIER_ALLOWED = {"Under Admin Review", "Correction Required", "Verified"}


@router.patch("/applications/{app_id}/status")
def update_status(app_id: int, payload: StatusUpdate, db: Session = Depends(get_db),
                  admin=Depends(require_roles("BURSARY_ADMIN", "VERIFICATION_OFFICER"))):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Not found.")
    if admin.role != "SUPER_ADMIN":
        if payload.status in _BLOCKED_VIA_PATCH:
            raise HTTPException(403, "This status cannot be set manually.")
        if admin.role == "VERIFICATION_OFFICER" and payload.status not in _VERIFIER_ALLOWED:
            raise HTTPException(403, "Insufficient permissions for this status.")
    if payload.status == "Rejected" and not payload.reason:
        raise HTTPException(400, "Reason is required when rejecting.")
    transition(db, app, payload.status, admin.username, payload.reason or payload.remarks)
    db.commit()
    log_action(admin.username, f"Application {payload.status.lower()}", app.application_number, payload.reason)
    return {"status": app.status}


@router.post("/applications/{app_id}/verify")
def verify(app_id: int, payload: VerificationIn, db: Session = Depends(get_db),
           admin=Depends(require_roles("VERIFICATION_OFFICER", "BURSARY_ADMIN"))):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Not found.")
    db.add(VerificationRecord(application_id=app.id, checklist=",".join(payload.checklist),
                              verified_by=admin.username))
    transition(db, app, "Verified", admin.username, f"Checklist: {len(payload.checklist)} items")
    db.commit()
    log_action(admin.username, "Application verified", app.application_number)
    return {"status": app.status}


@router.post("/applications/{app_id}/correction")
def request_correction(app_id: int, payload: CorrectionRequestIn,
                       db: Session = Depends(get_db),
                       admin=Depends(require_roles("BURSARY_ADMIN", "VERIFICATION_OFFICER"))):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Not found.")
    db.add(CorrectionRequest(application_id=app.id, message=payload.message,
                             requested_by=admin.username))
    transition(db, app, "Correction Required", admin.username, payload.message)
    db.commit()
    log_action(admin.username, "Correction requested", app.application_number, payload.message)
    return {"status": app.status}


@router.post("/applications/{app_id}/notes")
def add_note(app_id: int, payload: NoteIn, db: Session = Depends(get_db),
             admin=Depends(get_current_admin)):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Not found.")
    db.add(AdminNote(application_id=app.id, note=payload.note,
                     is_student_visible=payload.is_student_visible, created_by=admin.username))
    db.commit()
    log_action(admin.username, "Note added", app.application_number)
    return {"message": "Note added."}


# ---------- DELETE (Super Admin only) ----------
def _purge_application(db: Session, app: Application):
    """Remove an application and everything attached to it from the database.
    Does NOT commit — the caller commits (or rolls back). Returns the file paths
    and folder that should be removed from disk AFTER a successful commit."""
    file_paths = [os.path.join(settings.STORAGE_DIR, d.file_path) for d in app.documents]
    folder = os.path.join(settings.STORAGE_DIR, app.application_number)

    db.query(Notification).filter_by(application_id=app.id).delete()
    db.query(VerificationRecord).filter_by(application_id=app.id).delete()
    db.query(AdminNote).filter_by(application_id=app.id).delete()
    db.query(AllocationHistory).filter_by(application_id=app.id).delete()

    if app.allocation:
        db.delete(app.allocation)

    db.delete(app)  # cascades to applicant, family, guardians, siblings, funding history,
                    # documents, status history and corrections
    return file_paths, folder


def _remove_files(file_paths, folder):
    """Best-effort disk cleanup, restricted to the storage directory. Never raises."""
    base = os.path.realpath(settings.STORAGE_DIR)

    def inside(p):
        try:
            return os.path.commonpath([base, os.path.realpath(p)]) == base
        except ValueError:
            return False

    for p in file_paths:
        try:
            if inside(p) and os.path.exists(p):
                os.remove(p)
        except Exception:
            pass
    try:
        if inside(folder) and os.path.isdir(folder) and not os.listdir(folder):
            os.rmdir(folder)
    except Exception:
        pass


class BulkDeleteIn(BaseModel):
    ids: List[int]


@router.post("/applications/bulk-delete")
def bulk_delete_applications(payload: BulkDeleteIn, db: Session = Depends(get_db),
                             admin=Depends(require_roles("SUPER_ADMIN"))):
    ids = list(dict.fromkeys(payload.ids))  # de-duplicate, keep order
    if not ids:
        raise HTTPException(400, "No applications selected.")
    if len(ids) > 500:
        raise HTTPException(400, "Too many applications selected at once (maximum 500).")

    deleted, failed = [], []
    for app_id in ids:
        app = db.get(Application, app_id)
        if not app:
            failed.append({"id": app_id, "application_number": None,
                           "reason": "Not found (it may already have been deleted)."})
            continue

        app_number = app.application_number
        applicant_name = app.applicant.full_name if app.applicant else "Unknown"

        try:
            file_paths, folder = _purge_application(db, app)
            db.commit()
        except Exception:
            db.rollback()
            log_action(admin.username, "Application delete FAILED (bulk)", app_number)
            failed.append({"id": app_id, "application_number": app_number,
                           "reason": "Delete failed. See server logs."})
            continue

        _remove_files(file_paths, folder)
        log_action(admin.username, "Application DELETED (bulk)", app_number,
                   f"Applicant: {applicant_name}")
        deleted.append(app_number)

    log_action(admin.username, "Bulk delete completed", f"{len(deleted)} deleted",
               f"{len(failed)} failed out of {len(ids)} requested")
    return {"deleted": len(deleted), "deleted_numbers": deleted, "failed": failed}


@router.delete("/applications/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_db),
                       admin=Depends(require_roles("SUPER_ADMIN"))):
    app = db.get(Application, app_id)
    if not app:
        raise HTTPException(404, "Application not found.")

    app_number = app.application_number
    applicant_name = app.applicant.full_name if app.applicant else "Unknown"
    try:
        file_paths, folder = _purge_application(db, app)
        db.commit()
    except Exception:
        db.rollback()
        log_action(admin.username, "Application delete FAILED", app_number)
        raise HTTPException(500, "Delete failed.")

    _remove_files(file_paths, folder)
    log_action(admin.username, "Application DELETED", app_number, f"Applicant: {applicant_name}")
    return {"message": f"Application {app_number} has been permanently deleted."}


# ---------- ALLOCATIONS ----------
@router.post("/applications/{app_id}/allocation")
def allocate(app_id: int, payload: AllocationIn, db: Session = Depends(get_db),
             admin=Depends(require_roles("FINANCE_OFFICER", "BURSARY_ADMIN"))):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Not found.")
    if payload.amount is None or payload.amount <= 0:
        raise HTTPException(400, "Amount must be greater than zero.")
    if app.status not in ("Approved", "Amount Allocated"):
        raise HTTPException(400, "Only approved applications can be allocated.")
    period = db.query(FundingPeriod).filter_by(is_active=True).first()
    allocated = db.query(func.coalesce(func.sum(Allocation.amount), 0)).scalar()
    new_total = float(allocated) + payload.amount - (float(app.allocation.amount) if app.allocation else 0)
    if period and new_total > float(period.total_fund) and not (payload.allow_overfund and admin.role == "SUPER_ADMIN"):
        raise HTTPException(400, f"Allocation exceeds remaining fund "
                                 f"(KSh {float(period.total_fund) - float(allocated):,.2f} remaining). "
                                 "Super Admin override required.")
    if app.allocation:
        db.add(AllocationHistory(application_id=app.id,
                                 previous_amount=app.allocation.amount,
                                 new_amount=payload.amount, changed_by=admin.username,
                                 remarks=payload.remarks))
        app.allocation.amount = payload.amount
        app.allocation.allocated_by = admin.username
        app.allocation.remarks = payload.remarks
    else:
        db.add(Allocation(application_id=app.id, amount=payload.amount,
                          allocated_by=admin.username, remarks=payload.remarks))
    transition(db, app, "Amount Allocated", admin.username, f"KSh {payload.amount:,.2f}")
    db.commit()
    log_action(admin.username, "Allocation created/changed", app.application_number,
               f"KSh {payload.amount:,.2f}")
    return {"status": app.status, "allocated": payload.amount}


# ---------- DISBURSEMENT ----------
@router.post("/applications/{app_id}/disburse")
def mark_disbursed(app_id: int, payload: DisburseIn, db: Session = Depends(get_db),
                   admin=Depends(require_roles("FINANCE_OFFICER", "BURSARY_ADMIN"))):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Not found.")
    if not app.allocation:
        raise HTTPException(400, "Cannot disburse — no allocation exists for this application.")
    if app.allocation.is_disbursed:
        raise HTTPException(400, "This allocation has already been disbursed.")
    app.allocation.is_disbursed = True
    app.allocation.disbursed_at = datetime.now(timezone.utc)
    app.allocation.disbursed_by = admin.username
    transition(db, app, "Disbursed", admin.username,
               payload.remarks or f"KSh {float(app.allocation.amount):,.2f} disbursed.")
    db.commit()
    log_action(admin.username, "Funds disbursed", app.application_number,
               f"KSh {float(app.allocation.amount):,.2f}")
    return {"status": app.status, "disbursed": True}


@router.post("/applications/{app_id}/undisburse")
def undo_disburse(app_id: int, payload: DisburseIn, db: Session = Depends(get_db),
                  admin=Depends(require_roles("SUPER_ADMIN"))):
    app = db.get(Application, app_id)
    if not app or not app.allocation or not app.allocation.is_disbursed:
        raise HTTPException(400, "Application is not disbursed.")
    app.allocation.is_disbursed = False
    app.allocation.disbursed_at = None
    app.allocation.disbursed_by = None
    transition(db, app, "Amount Allocated", admin.username,
               f"Disbursement reversed: {payload.remarks or 'no reason given'}")
    db.commit()
    log_action(admin.username, "Disbursement reversed", app.application_number, payload.remarks)
    return {"status": app.status, "disbursed": False}


# ---------- EXPORTS ----------
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/export/applications")
@limiter.limit("10/hour")
def export_applications(request: Request, db: Session = Depends(get_db),
                        admin=Depends(require_roles("REPORTING_OFFICER", "BURSARY_ADMIN"))):
    data = excel_service.export_applications(db.query(Application).all())
    log_action(admin.username, "Excel exported", "applications")
    return Response(data, media_type=XLSX,
                    headers={"Content-Disposition":
                             'attachment; filename="Turkana_South_Bursary_Applications.xlsx"'})


@router.get("/export/allocations")
@limiter.limit("10/hour")
def export_allocations(request: Request, db: Session = Depends(get_db),
                       admin=Depends(require_roles("FINANCE_OFFICER", "REPORTING_OFFICER"))):
    period = db.query(FundingPeriod).filter_by(is_active=True).first()
    data = excel_service.export_allocations(db.query(Application).all(), period)
    log_action(admin.username, "Excel exported", "allocations")
    return Response(data, media_type=XLSX,
                    headers={"Content-Disposition":
                             'attachment; filename="Turkana_South_Bursary_Allocations.xlsx"'})


@router.get("/export/template")
def export_template(admin=Depends(get_current_admin)):
    data = excel_service.allocation_template()
    return Response(data, media_type=XLSX,
                    headers={"Content-Disposition": 'attachment; filename="Allocation_Template.xlsx"'})


@router.post("/import/allocations")
@limiter.limit("10/hour")
async def import_allocations(request: Request, file: UploadFile, db: Session = Depends(get_db),
                             admin=Depends(require_roles("FINANCE_OFFICER", "SUPER_ADMIN"))):
    if not (file.filename or "").lower().endswith(".xlsx"):
        raise HTTPException(400, "Upload an .xlsx file.")
    raw = await file.read(MAX_IMPORT_BYTES + 1)
    if len(raw) > MAX_IMPORT_BYTES:
        raise HTTPException(400, "File too large (max 5MB).")
    if not raw.startswith(b"PK\x03\x04"):
        raise HTTPException(400, "Not a valid .xlsx file.")

    errors, rows = excel_service.parse_allocation_import(raw)
    if errors:
        return {"ok": False, "errors": errors, "imported": 0}
    imported = 0
    for r in rows:
        app = db.query(Application).filter_by(application_number=r["application_number"]).first()
        if not app:
            errors.append(f"{r['application_number']}: not found"); continue
        if r["amount"] is None or r["amount"] <= 0:
            errors.append(f"{r['application_number']}: amount must be greater than zero"); continue
        if app.allocation:
            db.add(AllocationHistory(application_id=app.id, previous_amount=app.allocation.amount,
                                     new_amount=r["amount"], changed_by=admin.username,
                                     remarks="Excel import"))
            app.allocation.amount = r["amount"]
        else:
            db.add(Allocation(application_id=app.id, amount=r["amount"],
                              allocated_by=admin.username, remarks=r["remarks"] or "Excel import"))
        transition(db, app, "Amount Allocated", admin.username, "Imported from Excel")
        imported += 1
    db.commit()
    log_action(admin.username, "Excel imported", "allocations", f"{imported} rows")
    return {"ok": True, "errors": errors, "imported": imported}


# ---------- PDF (admin view) ----------
@router.get("/applications/{app_id}/pdf")
def admin_pdf(app_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Not found.")
    pdf = generate_application_pdf(app)
    log_action(admin.username, "PDF downloaded", app.application_number)
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition":
                             f'attachment; filename="{app.application_number}.pdf"'})


# ---------- AUDIT LOG ----------
@router.get("/audit-logs")
def audit_logs(page: int = Query(1, ge=1, le=100000), size: int = Query(50, ge=1, le=200),
               db: Session = Depends(get_db),
               admin=Depends(require_roles("SUPER_ADMIN", "REPORTING_OFFICER"))):
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    return {"total": q.count(),
            "items": [{"user": l.user, "action": l.action, "record": l.record,
                       "detail": l.detail, "ip": l.ip_address,
                       "at": str(l.created_at)}
                      for l in q.offset((page - 1) * size).limit(size).all()]}


# ---------- USER MANAGEMENT (Super Admin) ----------
class UserCreate(BaseModel):
    username: str = Field(pattern=r"^[A-Za-z0-9_.\-]{3,50}$")
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)
    full_name: Optional[str] = Field(default=None, max_length=120)
    role: Literal["SUPER_ADMIN", "BURSARY_ADMIN", "VERIFICATION_OFFICER",
                  "FINANCE_OFFICER", "REPORTING_OFFICER"] = "BURSARY_ADMIN"
    password: str = Field(max_length=72)


@router.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db),
                admin=Depends(require_roles("SUPER_ADMIN"))):
    err = validate_password_strength(payload.password, payload.username)
    if err:
        raise HTTPException(400, err)
    if db.query(User).filter(func.lower(User.username) == payload.username.lower()).first():
        raise HTTPException(400, "Username already exists.")
    if db.query(User).filter(func.lower(User.email) == payload.email.lower()).first():
        raise HTTPException(400, "Email already in use.")
    u = User(username=payload.username, email=payload.email, full_name=payload.full_name,
             role=payload.role, password_hash=hash_password(payload.password))
    db.add(u); db.commit()
    log_action(admin.username, "Admin user created", payload.username, f"role={payload.role}")
    return {"id": u.id, "username": u.username, "role": u.role}