import os
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from .database import Base, engine, SessionLocal
from .core.config import settings
from .core.security import hash_password, validate_password_strength
from .models import *  # noqa: F401,F403
from .models.user import User
from .models.funding import FundingPeriod
from .routes import applications_router, documents_router, admin_router
from .middleware.rate_limit import limiter
from .middleware.audit import set_request_ip

PROD = settings.is_production
MAX_BODY_BYTES = (settings.MAX_UPLOAD_MB + 2) * 1024 * 1024


def _seed():
    db = SessionLocal()
    try:
        if not db.query(User).filter_by(role="SUPER_ADMIN").first():
            generated = not settings.INITIAL_ADMIN_PASSWORD
            pw = settings.INITIAL_ADMIN_PASSWORD or secrets.token_urlsafe(18)
            if not generated:
                err = validate_password_strength(pw, settings.INITIAL_ADMIN_USERNAME)
                if err:
                    raise RuntimeError(f"INITIAL_ADMIN_PASSWORD rejected: {err}")
            db.add(User(username=settings.INITIAL_ADMIN_USERNAME, email=settings.INITIAL_ADMIN_EMAIL,
                        full_name="Super Administrator", role="SUPER_ADMIN",
                        password_hash=hash_password(pw)))
            if generated:
                print("=" * 70)
                print(f" FIRST-RUN SUPER ADMIN  username: {settings.INITIAL_ADMIN_USERNAME}")
                print(f" One-time password: {pw}")
                print(" Shown once. Log in and change it immediately.")
                print("=" * 70)
        if not db.query(FundingPeriod).filter_by(is_active=True).first():
            db.add(FundingPeriod(name="FY 2026/2027", total_fund=10_000_000, is_active=True))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.STORAGE_DIR, mode=0o700, exist_ok=True)
    if not PROD:
        Base.metadata.create_all(bind=engine)  # production uses Alembic migrations
    _seed()
    yield


app = FastAPI(
    title="Turkana South NG-CDF Bursary Management System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if PROD else "/docs",
    redoc_url=None if PROD else "/redoc",
    openapi_url=None if PROD else "/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    set_request_ip(get_remote_address(request))
    cl = request.headers.get("content-length")
    if cl and cl.isdigit() and int(cl) > MAX_BODY_BYTES:
        return JSONResponse({"detail": "Request too large."}, status_code=413)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    if PROD:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return response


app.add_middleware(SlowAPIMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.host_list)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Requested-With", "X-Access-Code"],
)

app.include_router(applications_router)
app.include_router(documents_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/api/health")
def health():
    return {"status": "ok"}