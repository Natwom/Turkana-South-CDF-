from fastapi import Request
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models.application import AuditLog

def log_action(user: str, action: str, record: str = None, detail: str = None, ip: str = None):
    db: Session = SessionLocal()
    try:
        db.add(AuditLog(user=user, action=action, record=record, detail=detail, ip_address=ip))
        db.commit()
    finally:
        db.close()