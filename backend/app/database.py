from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine_kwargs = {}
if not is_sqlite:
    # Render's Postgres drops idle connections; without these the first request after a quiet
    # period fails or stalls while SQLAlchemy discovers the dead connection.
    engine_kwargs = dict(pool_pre_ping=True, pool_recycle=300, pool_size=5, max_overflow=5)

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()