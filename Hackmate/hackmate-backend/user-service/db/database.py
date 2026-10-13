from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import settings

DATABASE_URL = settings.database_url

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=3,       # keep total connections well within Supabase limits
    max_overflow=5,    # 3 base + 5 overflow = 8 max per service
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
