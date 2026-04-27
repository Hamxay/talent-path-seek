from __future__ import annotations

from typing import Optional

from pypdf import PdfReader


class PdfExtractionService:
    def extract_text(self, file_path: str) -> str:
        reader = PdfReader(file_path)
        parts: list[str] = []
        for page in reader.pages:
            txt: Optional[str] = page.extract_text()
            if txt:
                parts.append(txt)
        # Keep raw text simple; caller can normalize later.
        return "\n\n".join(parts).strip()

