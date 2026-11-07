import hmac
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header, Request, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.application import Application, Document, ApplicantDetail
from ..models.funding import FundingPeriod
from ..schemas.application import ApplicationCreate, AccessRequest, ApplicationResponse
from ..services.numbering import generate_unique_credentials
from ..services.status import transition
from ..services.pdf_service import generate_application_pdf
from ..repositories.application_repo import build_application, update_application, to_public_dict
from ..core.config import settings
from ..middleware.rate_limit import (limiter, client_ip, ensure_not_locked, register_failures,
                                     access_by_ip_app, access_by_app, access_by_ip)
from ..middleware.audit import log_action

router = APIRouter(prefix="/api/applications", tags=["applications"])

ALLOWED_EXT = {".pdf", ".jpg", ".jpeg", ".png"}
DOC_TYPE_RE = re.compile(r"^[A-Za-z0-9_\- ]{1,50}$")
_DUMMY_CODE = "X" * 12


def _detect_type(content: bytes) -> Optional[str]:
    """Identify the real file type from its first bytes (not from the filename)."""
    if content.startswith(b"%PDF-"):
        return "pdf"
    if content.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    return None


def _clean_name(name: Optional[str]) -> str:
    base = os.path.basename((name or "file").replace("\\", "/"))
    base = re.sub(r"[^\w.\- ()]", "_", base)[:150]
    return base or "file"


def get_by_credentials(db: Session, request: Request, app_no: str, code: str) -> Application:
    """Validates application number + access code with lockouts and constant-time
    comparison. Always returns the same error for 'unknown number' and 'wrong code'."""
    ip = client_ip(request)
    app_no = (app_no or "").strip().upper()[:40]
    code = (code or "").strip().upper()[:64]
    pairs = [(access_by_ip_app, f"{ip}|{app_no}"), (access_by_app, app_no), (access_by_ip, ip)]
    ensure_not_locked(*pairs)

    app = db.query(Application).filter_by(application_number=app_no).first()
    stored = (app.access_code if app else None) or _DUMMY_CODE
    ok = hmac.compare_digest(stored.encode(), code.encode()) and app is not None
    if not ok:
        register_failures(*pairs)
        log_action("PUBLIC", "Access code failure", app_no)
        raise HTTPException(404, "Invalid Application Number or Access Code.")
    access_by_ip_app.reset(f"{ip}|{app_no}")
    return app


def save_upload(app: Application, upload: UploadFile, doc_type: str, is_signed: bool, db: Session):
    if not DOC_TYPE_RE.match(doc_type or ""):
        raise HTTPException(400, "Invalid document type.")
    if len(app.documents) >= settings.MAX_DOCS_PER_APPLICATION:
        raise HTTPException(400, "Maximum number of documents reached for this application.")

    ext = os.path.splitext(upload.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, "File type not allowed. Use PDF, JPG, JPEG or PNG.")

    limit = settings.MAX_UPLOAD_MB * 1024 * 1024
    content = upload.file.read(limit + 1)  # never load more than limit+1 bytes
    if len(content) > limit:
        raise HTTPException(400, f"File exceeds {settings.MAX_UPLOAD_MB}MB limit.")
    if not content:
        raise HTTPException(400, "Empty file.")

    real = _detect_type(content)
    claimed = "jpg" if ext in (".jpg", ".jpeg") else ext.lstrip(".")
    if real is None or real != claimed:
        raise HTTPException(400, "File content does not match its type. Upload a genuine PDF, JPG or PNG.")

    folder = os.path.join(settings.STORAGE_DIR, app.application_number)
    os.makedirs(folder, mode=0o700, exist_ok=True)
    fname = f"{uuid.uuid4().hex}.{real}"
    fd = os.open(os.path.join(folder, fname), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as fh:
        fh.write(content)

    db.add(Document(application_id=app.id, doc_type=doc_type,
                    file_path=os.path.join(app.application_number, fname),
                    original_name=_clean_name(upload.filename), file_type=real,
                    file_size=len(content), is_signed_form=is_signed))


def _find_duplicate(db: Session, reg_number: str, institution: str, exclude_app_id: int = None):
    q = (db.query(Application)
         .join(ApplicantDetail, ApplicantDetail.application_id == Application.id)
         .filter(ApplicantDetail.reg_number == reg_number)
         .filter(ApplicantDetail.institution == institution)
         .filter(Application.status != "Rejected"))
    if exclude_app_id:
        q = q.filter(Application.id != exclude_app_id)
    return q.first()


@router.post("", response_model=ApplicationResponse, status_code=201)
@limiter.limit("5/minute;30/hour")
def create_application(request: Request, payload: ApplicationCreate, db: Session = Depends(get_db)):
    period = db.get(FundingPeriod, payload.funding_period_id)
    if not period or not period.is_active:
        raise HTTPException(400, "No active bursary application period.")
    today = datetime.now(timezone.utc).date()
    if period.closing_date and today > period.closing_date:
        raise HTTPException(400, "The bursary application period has closed.")

    reg_number = payload.applicant.reg_number.strip()
    institution = payload.applicant.institution.strip()
    if _find_duplicate(db, reg_number, institution):
        # Do NOT reveal the existing application number to strangers.
        raise HTTPException(
            400,
            "An application already exists for this registration/admission number and institution. "
            "If it is yours, use 'Continue Application' with your Application Number and Access Code."
        )

    app_no, code = generate_unique_credentials(db, today.year)
    app = build_application(db, payload, app_no, code)
    transition(db, app, "Draft", "System", "Application created (draft).")
    db.commit()
    log_action("PUBLIC", "Application created", app_no)
    return app


@router.put("/{application_number}", response_model=ApplicationResponse)
@limiter.limit("20/minute")
def update_existing_application(request: Request, application_number: str, payload: ApplicationCreate,
                                x_access_code: str = Header(...), db: Session = Depends(get_db)):
    # Access code now travels in the X-Access-Code header, not the URL (URLs end up in logs).
    app = get_by_credentials(db, request, application_number, x_access_code)
    if app.status not in ("Draft", "Correction Required"):
        raise HTTPException(400, f"Application can no longer be edited (status: {app.status}).")

    reg_number = payload.applicant.reg_number.strip()
    institution = payload.applicant.institution.strip()
    if _find_duplicate(db, reg_number, institution, exclude_app_id=app.id):
        raise HTTPException(400, "Another application already exists for this registration/admission "
                                 "number and institution.")

    app = update_application(db, app, payload)
    log_action("PUBLIC", "Application draft updated", app.application_number)
    return app


@router.post("/access")
@limiter.limit("10/minute")
def access_application(request: Request, payload: AccessRequest, db: Session = Depends(get_db)):
    app = get_by_credentials(db, request, payload.application_number, payload.access_code)
    return to_public_dict(app)


@router.post("/{application_number}/submit")
@limiter.limit("10/minute")
def submit_application(request: Request, application_number: str, access_code: str = Form(..., max_length=64),
                       db: Session = Depends(get_db)):
    app = get_by_credentials(db, request, application_number, access_code)
    if app.status not in ("Draft", "Correction Required"):
        raise HTTPException(400, f"Application already submitted (status: {app.status}).")
    app.submitted_at = datetime.now(timezone.utc)
    transition(db, app, "Submitted", "Student", "Application submitted.")
    transition(db, app, "Awaiting Physical Verification", "System")
    db.commit()
    log_action("PUBLIC", "Application submitted", app.application_number)
    return {"application_number": app.application_number, "status": app.status}


@router.post("/{application_number}/documents")
@limiter.limit("30/minute")
def upload_document(request: Request, application_number: str,
                    access_code: str = Form(..., max_length=64),
                    doc_type: str = Form(..., max_length=50), file: UploadFile = File(...),
                    db: Session = Depends(get_db)):
    app = get_by_credentials(db, request, application_number, access_code)
    if app.status not in ("Draft", "Correction Required"):
        raise HTTPException(400, "Documents are read-only at this stage. Wait for admin review.")
    save_upload(app, file, doc_type, False, db)
    db.commit()
    return {"message": "Document uploaded."}


@router.post("/{application_number}/signed-form")
@limiter.limit("10/minute")
def upload_signed_form(request: Request, application_number: str,
                       access_code: str = Form(..., max_length=64),
                       file: UploadFile = File(...), db: Session = Depends(get_db)):
    app = get_by_credentials(db, request, application_number, access_code)
    if app.status not in ("Awaiting Physical Verification", "Submitted"):
        raise HTTPException(400, f"Signed form cannot be uploaded while status is {app.status}.")
    save_upload(app, file, "signed_form", True, db)
    app.signed_form_uploaded_at = datetime.now(timezone.utc)
    transition(db, app, "Signed Form Uploaded", "Student")
    transition(db, app, "Under Admin Review", "System")
    db.commit()
    log_action("PUBLIC", "Signed form uploaded", app.application_number)
    return {"message": "Signed/stamped form uploaded.", "status": app.status}


# POST (not GET) so the access code is in the body, never in the URL.
@router.post("/{application_number}/pdf")
@limiter.limit("10/minute")
def download_pdf(request: Request, application_number: str, payload: AccessRequest,
                 db: Session = Depends(get_db)):
    app = get_by_credentials(db, request, application_number, payload.access_code)
    pdf = generate_application_pdf(app)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{app.application_number}.pdf"'})