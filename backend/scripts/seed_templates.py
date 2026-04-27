"""
Seed the four resume templates (modern, classic, tech, minimal) into Postgres.

Usage (from backend/):
    python -m scripts.seed_templates
"""
from __future__ import annotations

from sqlalchemy import select

from app.db.models import ResumeTemplate
from app.db.postgres import dispose_db, get_session, init_db


TEMPLATES = [
    {"key": "modern", "name": "Modern"},
    {"key": "classic", "name": "Classic"},
    {"key": "tech", "name": "Tech"},
    {"key": "minimal", "name": "Minimal"},
]


def main() -> None:
    init_db()
    try:
        with get_session() as session:
            for t in TEMPLATES:
                existing = session.execute(
                    select(ResumeTemplate).where(ResumeTemplate.key == t["key"])
                ).scalar_one_or_none()
                if existing is None:
                    session.add(ResumeTemplate(key=t["key"], name=t["name"]))
                else:
                    existing.name = t["name"]
        print("Seeded templates: modern, classic, tech, minimal")
    finally:
        dispose_db()


if __name__ == "__main__":
    main()
