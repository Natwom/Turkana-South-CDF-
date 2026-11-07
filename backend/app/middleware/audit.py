import logging
from contextvars import ContextVar
from typing import Optional

from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.application import AuditLog

logger = logging.getLogger("audit")

# Set once per request by the middleware in main.py so every log_action call
# records the client IP without each route having to pass it.
_request_ip: ContextVar[Optional[str]] = ContextVar("request_ip", default=None)


def set_request_ip(ip: Optional[str]) -> None:
    _request_ip.set(ip)


def _clip(value: Optional[str], n: int) -> Optional[str]:
    if value is None:
        return None
    # strip control characters to prevent log forging
    value = "".join(ch for ch in str(value) if ch.isprintable())
    return value[:n]


def log_action(user: str, action: str, record: str = None, detail: str = None, ip: str = None):
    """Write an audit entry using its own DB session. Never raises into the caller.
    Do NOT pass national IDs, phone numbers, passwords or tokens in `detail`."""
    db: Session = SessionLocal()
    try:
        db.add(AuditLog(user=_clip(user, 100), action=_clip(action, 200),
                        record=_clip(record, 100), detail=_clip(detail, 500),
                        ip_address=_clip(ip or _request_ip.get(), 64)))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to write audit log entry: %s", action)
    finally:
        db.close()