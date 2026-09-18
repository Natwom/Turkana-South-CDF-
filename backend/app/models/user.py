from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from ..database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False)
    full_name = Column(String(120))
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), default="BURSARY_ADMIN")  # SUPER_ADMIN, BURSARY_ADMIN, VERIFICATION_OFFICER, FINANCE_OFFICER, REPORTING_OFFICER, READ_ONLY_ADMIN
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    last_login = Column(DateTime)