import secrets, string
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.application import Application
from ..core.config import settings

def generate_access_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

def next_application_number(db: Session, year: int) -> str:
    prefix = f"{settings.APPLICATION_PREFIX}-{year}-"
    last = (db.query(Application)
              .filter(Application.application_number.like(f"{prefix}%"))
              .order_by(Application.application_number.desc())
              .first())
    seq = int(last.application_number.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:06d}"

def generate_unique_credentials(db: Session, year: int) -> tuple[str, str]:
    while True:
        app_no = next_application_number(db, year)
        if not db.query(Application).filter_by(application_number=app_no).first():
            break
    while True:
        code = generate_access_code()
        if not db.query(Application).filter_by(access_code=code).first():
            break
    return app_no, code