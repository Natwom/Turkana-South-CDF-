import os, uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, Response
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
from ..middleware.rate_limit import limiter
from ..middleware.audit import log_action

router = APIRouter(prefix="/api/applications", tags=["applications"])

ALLOWED_EXT = {".pdf", ".jpg", ".jpeg", ".png"}

def get_by_credentials(db: Session, app_no: str, code: str) -> Application:
    app = db.query(Application).filter_by(application_number=app_no.strip().upper(),
      access_code=code.strip().upper()).first()
    if not app:
        raise HTTPException(404, "Invalid Application Number or Access Code.")
    return app

def save_upload(app: Application, upload: UploadFile, doc_type: str, is_signed: bool, db: Session):
    ext = os.path.splitext(upload.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"File type '{ext}' not allowed. Use PDF, JPG, JPEG or PNG.")
    content = upload.file.read()
    if len(content) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(400, f"File exceeds {settings.MAX_UPLOAD_MB}MB limit.")
    folder = os.path.join(settings.STORAGE_DIR, app.application_number)
    os.makedirs(folder, exist_ok=True)
    fname = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(folder, fname), "wb") as fh:
        fh.write(content)
    doc = Document(application_id=app.id, doc_type=doc_type, file_path=os.path.join(app.application_number, fname),
                   original_name=upload.filename, file_type=ext.lstrip("."), file_size=len(content),
                   is_signed_form=is_signed)
    db.add(doc)

@router.post("", response_model=ApplicationResponse, status_code=201)
@limiter.limit("10/minute")
def create_application(payload: ApplicationCreate, request: Request, db: Session = Depends(get_db)):
    period = db.get(FundingPeriod, payload.funding_period_id)
    if not period or not period.is_active:
        raise HTTPException(400, "No active bursary application period.")
    today = datetime.now(timezone.utc).date()
    if period.closing_date and today > period.closing_date:
        raise HTTPException(400, "The bursary application period has closed.")

    reg_number = (payload.applicant.reg_number or "").strip()
    if reg_number:
        existing = (db.query(Application)
                    .join(ApplicantDetail, ApplicantDetail.application_id == Application.id)
                    .filter(ApplicantDetail.reg_number == reg_number)
                    .filter(Application.status != "Rejected")
                    .first())
        if existing:
            raise HTTPException(
                400,
                f"An application already exists for registration/admission number '{reg_number}' "
                f"(Application Number: {existing.application_number}). "
                "If this is your application, please use 'Continue Application' with your "
                "Application Number and Access Code instead of starting a new one."
            )

    app_no, code = generate_unique_credentials(db, today.year)
    app = build_application(db, payload, app_no, code)
    transition(db, app, "Draft", "System", "Application created (draft).")
    db.commit()
    log_action("PUBLIC", "Application created", app_no, ip=request.client.host if request else None)
    return app

@router.put("/{application_number}", response_model=ApplicationResponse)
@limiter.limit("20/minute")
def update_existing_application(application_number: str, payload: ApplicationCreate,
                                access_code: str, request: Request, db: Session = Depends(get_db)):
    app = get_by_credentials(db, application_number, access_code)
    if app.status not in ("Draft", "Correction Required"):
        raise HTTPException(400, f"Application can no longer be edited (status: {app.status}).")

    reg_number = (payload.applicant.reg_number or "").strip()
    if reg_number:
        existing = (db.query(Application)
                    .join(ApplicantDetail, ApplicantDetail.application_id == Application.id)
                    .filter(ApplicantDetail.reg_number == reg_number)
                    .filter(Application.status != "Rejected")
                    .filter(Application.id != app.id)
                    .first())
        if existing:
            raise HTTPException(
                400,
                f"Another application already exists for registration/admission number '{reg_number}' "
                f"(Application Number: {existing.application_number})."
            )

    app = update_application(db, app, payload)
    log_action("PUBLIC", "Application draft updated", app.application_number,
               ip=request.client.host if request else None)
    return app

@router.post("/access")
@limiter.limit("20/minute")
def access_application(payload: AccessRequest, request: Request, db: Session = Depends(get_db)):
    app = get_by_credentials(db, payload.application_number, payload.access_code)
    return to_public_dict(app)

@router.post("/{application_number}/submit")
def submit_application(application_number: str, access_code: str = Form(...),
                       request: Request = None, db: Session = Depends(get_db)):
    app = get_by_credentials(db, application_number, access_code)
    if app.status not in ("Draft", "Correction Required"):
        raise HTTPException(400, f"Application already submitted (status: {app.status}).")
    app.submitted_at = datetime.now(timezone.utc)
    transition(db, app, "Submitted", "Student", "Application submitted.")
    transition(db, app, "Awaiting Physical Verification", "System")
    db.commit()
    log_action("PUBLIC", "Application submitted", application_number,
               ip=request.client.host if request else None)
    return {"application_number": app.application_number, "status": app.status}

@router.post("/{application_number}/documents")
def upload_document(application_number: str, access_code: str = Form(...),
                    doc_type: str = Form(...), file: UploadFile = File(...),
                    request: Request = None, db: Session = Depends(get_db)):
    app = get_by_credentials(db, application_number, access_code)
    if app.status == "Draft":
        pass  # allowed before submission
    elif app.status == "Correction Required":
        pass  # allowed for corrections
    else:
        raise HTTPException(400, "Documents are read-only at this stage. Wait for admin review.")
    save_upload(app, file, doc_type, False, db)
    db.commit()
    return {"message": "Document uploaded."}

@router.post("/{application_number}/signed-form")
def upload_signed_form(application_number: str, access_code: str = Form(...),
                       file: UploadFile = File(...), request: Request = None, db: Session = Depends(get_db)):
    app = get_by_credentials(db, application_number, access_code)
    if app.status not in ("Awaiting Physical Verification", "Submitted"):
        raise HTTPException(400, f"Signed form cannot be uploaded while status is {app.status}.")
    save_upload(app, file, "signed_form", True, db)
    app.signed_form_uploaded_at = datetime.now(timezone.utc)
    transition(db, app, "Signed Form Uploaded", "Student")
    transition(db, app, "Under Admin Review", "System")
    db.commit()
    log_action("PUBLIC", "Signed form uploaded", application_number,
               ip=request.client.host if request else None)
    return {"message": "Signed/stamped form uploaded.", "status": app.status}

@router.get("/{application_number}/pdf")
def download_pdf(application_number: str, access_code: str, db: Session = Depends(get_db)):
    app = get_by_credentials(db, application_number, access_code)
    pdf = generate_application_pdf(app)
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{application_number}.pdf"'})