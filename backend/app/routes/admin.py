import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi.responses import Response
from ..database import get_db
from ..core.config import settings
from ..core.security import (verify_password, create_token, get_current_admin, require_roles, hash_password)
from ..schemas.admin import (AdminLogin, StatusUpdate, CorrectionRequestIn,
                             VerificationIn, AllocationIn, DisburseIn, NoteIn)
from ..models.user import User
from ..models.funding import FundingPeriod
from ..models.application import (Application, Document, VerificationRecord, CorrectionRequest,
    AdminNote, Allocation, AllocationHistory, AuditLog, Notification)
from ..services.status import transition
from ..services.pdf_service import generate_application_pdf
from ..services import excel_service
from ..repositories.application_repo import to_public_dict
from ..middleware.audit import log_action

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ---------- AUTH ----------
@router.post("/login")
def login(payload: AdminLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(or_(User.username == payload.username,
                                     User.email == payload.username)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials.")
    if not user.is_active:
        raise HTTPException(403, "Account disabled.")
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    log_action(user.username, "Admin login")
    return {"access_token": create_token({"sub": str(user.id), "role": user.role}),
            "token_type": "bearer", "role": user.role, "full_name": user.full_name}

@router.get("/me")
def me(admin=Depends(get_current_admin)):
    return {"username": admin.username, "role": admin.role, "full_name": admin.full_name}

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
def list_applications(status: str = None, ward: str = None, institution: str = None,
                      search: str = None, sort: str = "newest",
                      page: int = 1, size: int = 25,
                      db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    q = db.query(Application).join(Application.applicant)
    A = Application.applicant.property.mapper.class_
    if status: q = q.filter(Application.status == status)
    if ward: q = q.filter(A.ward == ward)
    if institution: q = q.filter(A.institution.ilike(f"%{institution}%"))
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Application.application_number.ilike(like),
                         A.full_name.ilike(like), A.reg_number.ilike(like),
                         A.id_number.ilike(like)))
    sort_map = {"newest": Application.created_at.desc(), "oldest": Application.created_at.asc(),
                "highest_request": Application.amount_requested.desc(),
                "lowest_request": Application.amount_requested.asc()}
    q = q.order_by(sort_map.get(sort, sort_map["newest"]))
    total = q.count()
    items = q.offset((page-1)*size).limit(size).all()
    return {"total": total, "page": page,
            "items": [{**to_public_dict(a), "access_code": None} for a in items]}

@router.get("/applications/{app_id}")
def get_application(app_id: int, db: Session = Depends(get_db),
                    admin=Depends(get_current_admin)):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Application not found.")
    data = to_public_dict(app)
    data["documents"] = [{"id": d.id, **d_} for d, d_ in zip(app.documents, data["documents"])]
    data["notes"] = [{"note": n.note, "is_student_visible": n.is_student_visible,
                      "created_by": n.created_by, "created_at": str(n.created_at)}
                     for n in db.query(AdminNote).filter_by(application_id=app.id)]
    log_action(admin.username, "Application viewed", app.application_number)
    return data

@router.patch("/applications/{app_id}/status")
def update_status(app_id: int, payload: StatusUpdate, db: Session = Depends(get_db),
                  admin=Depends(require_roles("BURSARY_ADMIN", "VERIFICATION_OFFICER"))):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Not found.")
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
    return {"message": "Note added."}

# ---------- DELETE (Super Admin only) ----------
@router.delete("/applications/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_db),
                       admin=Depends(require_roles("SUPER_ADMIN"))):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Application not found.")

    app_number = app.application_number
    applicant_name = app.applicant.full_name if app.applicant else "Unknown"

    # Remove uploaded files from disk before deleting DB records
    for d in app.documents:
        full_path = os.path.join(settings.STORAGE_DIR, d.file_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except OSError:
                pass

    # Also try to remove the application's storage folder if now empty
    folder = os.path.join(settings.STORAGE_DIR, app_number)
    if os.path.isdir(folder):
        try:
            os.rmdir(folder)
        except OSError:
            pass  # not empty or in use — leave it

    db.delete(app)  # cascades to ApplicantDetail, FamilyDetail, Guardian, Sibling,
                    # EducationFunding, Document, StatusHistory, Allocation, CorrectionRequest
    db.commit()

    log_action(admin.username, "Application DELETED", app_number,
               f"Applicant: {applicant_name}")
    return {"message": f"Application {app_number} has been permanently deleted."}

# ---------- ALLOCATIONS ----------
@router.post("/applications/{app_id}/allocation")
def allocate(app_id: int, payload: AllocationIn, db: Session = Depends(get_db),
             admin=Depends(require_roles("FINANCE_OFFICER", "BURSARY_ADMIN"))):
    app = db.get(Application, app_id)
    if not app: raise HTTPException(404, "Not found.")
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
@router.get("/export/applications")
def export_applications(db: Session = Depends(get_db),
                        admin=Depends(require_roles("REPORTING_OFFICER", "BURSARY_ADMIN"))):
    data = excel_service.export_applications(db.query(Application).all())
    log_action(admin.username, "Excel exported", "applications")
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition":
                             'attachment; filename="Turkana_South_Bursary_Applications.xlsx"'})

@router.get("/export/allocations")
def export_allocations(db: Session = Depends(get_db),
                       admin=Depends(require_roles("FINANCE_OFFICER", "REPORTING_OFFICER"))):
    period = db.query(FundingPeriod).filter_by(is_active=True).first()
    data = excel_service.export_allocations(db.query(Application).all(), period)
    log_action(admin.username, "Excel exported", "allocations")
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition":
                             'attachment; filename="Turkana_South_Bursary_Allocations.xlsx"'})

@router.get("/export/template")
def export_template(admin=Depends(get_current_admin)):
    data = excel_service.allocation_template()
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": 'attachment; filename="Allocation_Template.xlsx"'})

@router.post("/import/allocations")
async def import_allocations(file: UploadFile, db: Session = Depends(get_db),
                             admin=Depends(require_roles("FINANCE_OFFICER", "SUPER_ADMIN"))):
    errors, rows = excel_service.parse_allocation_import(await file.read())
    if errors:
        return {"ok": False, "errors": errors, "imported": 0}
    imported = 0
    for r in rows:
        app = db.query(Application).filter_by(application_number=r["application_number"]).first()
        if not app:
            errors.append(f"{r['application_number']}: not found"); continue
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
def audit_logs(page: int = 1, size: int = 50, db: Session = Depends(get_db),
               admin=Depends(require_roles("SUPER_ADMIN", "REPORTING_OFFICER"))):
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    return {"total": q.count(),
            "items": [{"user": l.user, "action": l.action, "record": l.record,
                       "detail": l.detail, "ip": l.ip_address,
                       "at": str(l.created_at)}
                      for l in q.offset((page-1)*size).limit(size).all()]}

# ---------- USER MANAGEMENT (Super Admin) ----------
@router.post("/users")
def create_user(payload: dict, db: Session = Depends(get_db),
                admin=Depends(require_roles("SUPER_ADMIN"))):
    if db.query(User).filter_by(username=payload["username"]).first():
        raise HTTPException(400, "Username already exists.")
    u = User(username=payload["username"], email=payload["email"],
             full_name=payload.get("full_name"), role=payload.get("role", "BURSARY_ADMIN"),
             password_hash=hash_password(payload["password"]))
    db.add(u); db.commit()
    log_action(admin.username, "Admin user created", payload["username"])
    return {"id": u.id, "username": u.username, "role": u.role}