from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator, Optional

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Single declarative base for every ORM model in the app."""


class _DB:
    engine: Optional[Engine] = None
    SessionLocal: Optional[sessionmaker[Session]] = None


db = _DB()


def _normalize_url(url: str) -> str:
    """
    Accept either a bare URL (`postgresql://...`) or one explicitly tagged for
    asyncpg (`postgresql+asyncpg://...`) and force it onto the synchronous
    psycopg2 driver. Keeps users from breaking startup just because of a stale
    driver suffix in .env.
    """
    if url.startswith("postgresql+asyncpg://"):
        return "postgresql+psycopg2://" + url[len("postgresql+asyncpg://"):]
    if url.startswith("postgres://"):  # legacy heroku-style
        return "postgresql+psycopg2://" + url[len("postgres://"):]
    if url.startswith("postgresql://") and "+psycopg2" not in url:
        return "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


def init_db() -> None:
    """
    Build the engine + session factory and ensure tables exist.

    For an FYP prototype we use SQLAlchemy's create_all instead of Alembic
    migrations — easy to demo, easy to explain.
    """
    url = _normalize_url(settings.DATABASE_URL)
    db.engine = create_engine(
        url,
        echo=settings.DB_ECHO,
        pool_pre_ping=True,
        future=True,
    )
    db.SessionLocal = sessionmaker(
        bind=db.engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=Session,
    )

    # Import models so SQLAlchemy registers all tables on Base.metadata.
    from app.db import models  # noqa: F401

    Base.metadata.create_all(bind=db.engine)
    _apply_lightweight_migrations(db.engine)


def _apply_lightweight_migrations(engine: Engine) -> None:
    """
    SQLAlchemy's create_all only creates *missing tables*, never altering
    existing tables. For an FYP prototype we apply a few hand-rolled schema
    deltas here so a developer who already has data does not need to drop the
    DB after we add a column or relax a NOT NULL.

    Every statement is idempotent — safe to run on every startup.
    """
    with engine.begin() as conn:
        # 1. Make sure screening_runs has the `job_id` column introduced after
        #    the original schema (job-based screening flow).
        conn.execute(text(
            "ALTER TABLE screening_runs ADD COLUMN IF NOT EXISTS job_id INTEGER"
        ))
        # 2. Relax the original NOT NULL on screening_runs.batch_id so a row
        #    can carry a job_id instead of a batch_id.
        conn.execute(text(
            "ALTER TABLE screening_runs ALTER COLUMN batch_id DROP NOT NULL"
        ))
        # 3. Add the FK to jobs(id) on screening_runs.job_id, only if it
        #    isn't already there.
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE constraint_name = 'screening_runs_job_id_fkey'
                      AND table_name = 'screening_runs'
                ) THEN
                    ALTER TABLE screening_runs
                    ADD CONSTRAINT screening_runs_job_id_fkey
                    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
                END IF;
            END$$;
        """))
        # 4. Helpful index for job-based run lookups (cheap to keep idempotent).
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_screening_runs_job_id ON screening_runs (job_id)"
        ))
        # 5. screening_results.upload_item_id and shortlist_items.upload_item_id
        #    used to FK into upload_items. They now hold EITHER an upload_items.id
        #    (PDF batch flow) OR a job_applications.id (job-applicant flow), so the
        #    rigid FK has to go. Drop them if they exist; new schemas don't
        #    create them.
        conn.execute(text(
            "ALTER TABLE screening_results "
            "DROP CONSTRAINT IF EXISTS screening_results_upload_item_id_fkey"
        ))
        conn.execute(text(
            "ALTER TABLE shortlist_items "
            "DROP CONSTRAINT IF EXISTS shortlist_items_upload_item_id_fkey"
        ))


def dispose_db() -> None:
    if db.engine is not None:
        db.engine.dispose()
    db.engine = None
    db.SessionLocal = None


@contextmanager
def get_session() -> Iterator[Session]:
    """
    Repository methods open a short-lived session via this context manager.
    On clean exit it commits; on exception it rolls back.
    """
    if db.SessionLocal is None:
        raise RuntimeError("Database not initialized. Did app startup run?")
    session = db.SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
