"""
routers/upload.py — POST /api/upload

Accepts a PDF or DOCX file (resume or transcript), extracts text,
runs rule-based structured extraction, and returns both raw text
and suggested profile fields for user review.
"""

from __future__ import annotations

import io
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from typing import Any, Optional

from config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["upload"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
# Max 10 MB enforced via settings; also validate extension not content-type
# (content-type can be spoofed by the browser)


class ExtractedFieldInfo(BaseModel):
    field_name: str
    value: Any
    confidence: str
    note: Optional[str] = None


class UploadResponse(BaseModel):
    filename: str
    doc_type: str                          # "resume" or "transcript"
    extracted_text: str
    char_count: int
    page_count: int
    # Rule-based extraction results (always requires user review)
    extraction_method: str = "rule-based-regex"
    extraction_disclaimer: str = (
        "Fields below were detected using keyword/pattern matching — NOT AI. "
        "Please review and correct all values before continuing."
    )
    extracted_fields: list[ExtractedFieldInfo] = []
    suggested_profile_patch: dict[str, Any] = {}
    extraction_warnings: list[str] = []


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form(default="resume", description="'resume' or 'transcript'"),
) -> UploadResponse:
    """
    Upload a PDF or DOCX document.

    Returns:
    - Extracted raw text (for inclusion in the student profile)
    - Rule-based structured extraction (skills, GPA, etc.) for pre-filling the form
    - Warnings where extraction was uncertain

    Security notes:
    - File content is treated as untrusted text data only
    - No code in documents is executed
    - Server paths are never included in the response
    - File size and type are validated before processing
    """
    settings = get_settings()

    # ── Validate file size ────────────────────────────────────
    content = await file.read()
    if len(content) > settings.max_upload_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {settings.max_upload_size // 1024 // 1024} MB.",
        )

    if len(content) == 0:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    # ── Validate extension ────────────────────────────────────
    filename = file.filename or "unknown"
    # Never expose full server path; only use the base filename
    safe_filename = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1][:200]

    ext = ("." + safe_filename.rsplit(".", 1)[-1].lower()) if "." in safe_filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Please upload a PDF or DOCX file.",
        )

    # ── Validate doc_type ─────────────────────────────────────
    doc_type = doc_type.lower().strip()
    if doc_type not in ("resume", "transcript"):
        doc_type = "resume"

    # ── Extract raw text ──────────────────────────────────────
    try:
        if ext == ".pdf":
            raw_text, page_count = _extract_pdf(content)
        else:
            raw_text, page_count = _extract_docx(content)
    except Exception as exc:
        logger.exception("Failed to parse uploaded file")
        raise HTTPException(
            status_code=422,
            detail=f"Could not parse the file. Ensure it is not corrupted or image-only. ({type(exc).__name__})",
        )

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "No text could be extracted. "
                "If the document contains only images/scans, please convert it to a text-based PDF first."
            ),
        )

    # ── Rule-based structured extraction ─────────────────────
    extracted_fields: list[ExtractedFieldInfo] = []
    patch: dict[str, Any] = {}
    extraction_warnings: list[str] = []

    try:
        from tools.document_extractor import extract_from_resume, extract_from_transcript
        if doc_type == "transcript":
            result = extract_from_transcript(raw_text)
        else:
            result = extract_from_resume(raw_text)

        extraction_warnings = result.warnings

        # Convert ExtractionResult → ExtractedFieldInfo list
        field_map = [
            ("cgpa", result.cgpa, "medium", f"Scale: {result.cgpa_scale}"),
            ("cgpa_scale", result.cgpa_scale, "medium", None),
            ("graduation_year", result.graduation_year, "medium", None),
            ("undergraduate_university", result.university_name, "low", "Heuristic — verify"),
            ("undergraduate_degree", result.degree_name, "low", "Verify degree name"),
            ("skills", result.skills if result.skills else None, "high",
             f"{len(result.skills)} skill(s) found" if result.skills else None),
            ("projects", result.projects if result.projects else None, "low",
             "Extracted from Projects section — review carefully"),
            ("english_test", result.english_test, "high", None),
            ("english_score", result.english_score, "high", None),
            ("work_experience_years", result.work_experience_years if result.work_experience_years else None, "low",
             "Estimated from date ranges — may be inaccurate"),
            ("research_experience", result.research_experience if result.research_experience else None, "medium",
             "Detected research-related keywords"),
            ("publications", result.publications_count if result.publications_count > 0 else None, "low",
             "Estimated from publication indicators"),
            ("certifications", result.certifications if result.certifications else None, "medium", None),
        ]

        for field_name, value, confidence, note in field_map:
            if value is not None and value != [] and value != "":
                extracted_fields.append(ExtractedFieldInfo(
                    field_name=field_name,
                    value=value,
                    confidence=confidence,
                    note=note,
                ))
                patch[field_name] = value

    except Exception as exc:
        logger.exception("Extraction failed for %s", safe_filename)
        extraction_warnings.append(
            f"Structured extraction failed ({type(exc).__name__}). "
            "Raw text was saved successfully — please fill in fields manually."
        )

    logger.info(
        "Uploaded %s (%s): %d chars, %d pages, %d fields extracted",
        safe_filename, doc_type, len(raw_text), page_count, len(extracted_fields),
    )

    return UploadResponse(
        filename=safe_filename,
        doc_type=doc_type,
        extracted_text=raw_text,
        char_count=len(raw_text),
        page_count=page_count,
        extracted_fields=extracted_fields,
        suggested_profile_patch=patch,
        extraction_warnings=extraction_warnings,
    )


# ── Extraction helpers ────────────────────────────────────────

def _extract_pdf(content: bytes) -> tuple[str, int]:
    """Extract text from PDF bytes. Returns (text, page_count)."""
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(content))
    pages = len(reader.pages)
    texts = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        texts.append(page_text)
    return "\n\n".join(texts), pages


def _extract_docx(content: bytes) -> tuple[str, int]:
    """Extract text from DOCX bytes. Returns (text, estimated_page_count)."""
    from docx import Document
    doc = Document(io.BytesIO(content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    # Also extract from tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                cell_text = cell.text.strip()
                if cell_text and cell_text not in paragraphs:
                    paragraphs.append(cell_text)
    text = "\n".join(paragraphs)
    estimated_pages = max(1, len(text.split()) // 300)
    return text, estimated_pages
