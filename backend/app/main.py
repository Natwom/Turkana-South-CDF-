import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .database import Base, engine, SessionLocal
from .core.config import settings
from .core.security import hash_password
from .models import *  # noqa: F401,F403
from .models.user import User
from .models.funding import FundingPeriod
from .routes import applications_router, documents_router, admin_router
from .middleware.rate_limit import limiter

app = FastAPI(title="Turkana South NG-CDF Bursary Management System", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(CORSMiddleware,
                   allow_origins=settings.CORS_ORIGINS.split(","),
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(applications_router)
app.include_router(documents_router)
app.include_router(admin_router)

os.makedirs(settings.STORAGE_DIR, exist_ok=True)

@app.on_event("startup")
def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).filter_by(username="superadmin").first():
            db.add(User(username="superadmin", email="admin@turkanasouth.go.ke",
                        full_name="Super Administrator", role="SUPER_ADMIN",
                        password_hash=hash_password("ChangeMe!123")))
        if not db.query(FundingPeriod).filter_by(is_active=True).first():
            db.add(FundingPeriod(name="FY 2026/2027", total_fund=10_000_000,
                                 is_active=True))
        db.commit()
    finally:
        db.close()

@app.get("/")
def root():
    return {"status": "ok", "service": "Turkana South NG-CDF Bursary API",
            "version": app.version, "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok"}