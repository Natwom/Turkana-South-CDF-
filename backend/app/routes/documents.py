import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..core.config import settings
from ..core.security import get_current_admin
from ..models.application import Document, Application
from ..middleware.audit import log_action

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.get("/{doc_id}")
def download_document(doc_id: int, db: Session = Depends(get_db),
                      admin=Depends(get_current_admin)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    app = db.get(Application, doc.application_id)
    log_action(admin.username, "Document downloaded", app.application_number,
               doc.original_name)
    path = os.path.join(settings.STORAGE_DIR, doc.file_path)
    if not os.path.exists(path):
        raise HTTPException(404, "File missing on server.")
    return FileResponse(path, filename=doc.original_name)