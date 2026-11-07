import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..core.config import settings
from ..core.security import get_current_admin
from ..models.application import Document, Application
from ..middleware.audit import log_action
from ..middleware.rate_limit import limiter

router = APIRouter(prefix="/api/documents", tags=["documents"])

MIME = {"pdf": "application/pdf", "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}


@router.get("/{doc_id}")
@limiter.limit("60/minute")
def download_document(request: Request, doc_id: int, db: Session = Depends(get_db),
                      admin=Depends(get_current_admin)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    app = db.get(Application, doc.application_id)

    # Resolve the real path and make sure it stays inside the storage directory
    # (blocks path traversal and symlink tricks).
    base = os.path.realpath(settings.STORAGE_DIR)
    path = os.path.realpath(os.path.join(base, doc.file_path))
    if os.path.commonpath([base, path]) != base:
        log_action(admin.username, "BLOCKED path traversal attempt", app.application_number if app else None)
        raise HTTPException(404, "Document not found.")
    if not os.path.isfile(path):
        raise HTTPException(404, "File missing on server.")

    log_action(admin.username, "Document downloaded", app.application_number if app else None,
               f"doc_id={doc.id}")
    safe_name = "".join(c for c in (doc.original_name or "document") if c.isprintable() and c not in '"\\/')[:150] or "document"
    return FileResponse(path, filename=safe_name,
                        media_type=MIME.get((doc.file_type or "").lower(), "application/octet-stream"))