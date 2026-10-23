"""
routers/profile.py — POST /api/profile/parse and POST /api/profile/validate

Two endpoints for Phase 2:

1. POST /api/profile/parse
   Takes raw extracted text from a resume or transcript,
   runs rule-based structured extraction, and returns a
   suggested profile patch (partial StudentProfile fields).
   ALWAYS labeled as "rule-based extraction" — never AI.

2. POST /api/profile/validate
   Takes a complete profile JSON and returns structured
   validation warnings so the user can fix issues before
   starting the research workflow.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from models.student import StudentProfile
from tools.document_extractor import (
    ExtractionResult,
    extract_from_resume,
    extract_from_transcript,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["profile"])


# ── Request / Response models ─────────────────────────────────

class ParseRequest(BaseModel):
    """Request body for POST /api/profile/parse."""
    text: str = Field(..., description="Raw text extracted from the document")
    doc_type: str = Field(default="resume", description="'resume' or 'transcript'")


class ExtractedField(BaseModel):
    """A single extracted field with its value and confidence."""
    field_name: str
    value: Any
    confidence: str   # "high" | "medium" | "low"
    note: Optional[str] = None


class ParseResponse(BaseModel):
    """Response for POST /api/profile/parse."""
    extraction_method: str = "rule-based-regex"
    disclaimer: str = (
        "These fields were extracted using keyword and pattern matching — NOT AI. "
        "All values must be reviewed and corrected by the student before use."
    )
    extracted_fields: list[ExtractedField]
    warnings: list[str]
    suggested_profile_patch: dict[str, Any]


class ValidationWarning(BaseModel):
    field: str
    severity: str   # "error" | "warning" | "info"
    message: str


class ValidateResponse(BaseModel):
    is_valid: bool
    errors: list[ValidationWarning]
    warnings: list[ValidationWarning]
    info: list[ValidationWarning]
    completeness_score: int   # 0–100
    completeness_notes: list[str]


# ── Endpoints ─────────────────────────────────────────────────

@router.post("/parse", response_model=ParseResponse)
async def parse_document(body: ParseRequest) -> ParseResponse:
    """
    Extract structured fields from raw document text using rule-based methods.

    This endpoint:
    - Uses regex and keyword matching only (not AI/LLM)
    - Treats document content as untrusted input (no code execution)
    - Returns all results clearly labeled as requiring user review
    - Never returns server paths or secret values
    """
    text = body.text
    doc_type = body.doc_type.lower().strip()

    # Run the appropriate extractor
    if doc_type == "transcript":
        result: ExtractionResult = extract_from_transcript(text)
    else:
        result: ExtractionResult = extract_from_resume(text)

    logger.info(
        "Parsed %s: found %d skills, cgpa=%s, english=%s %s",
        doc_type, len(result.skills), result.cgpa,
        result.english_test, result.english_score,
    )

    # Build extracted_fields list
    fields: list[ExtractedField] = []

    if result.cgpa is not None:
        fields.append(ExtractedField(
            field_name="cgpa",
            value=result.cgpa,
            confidence="medium",
            note=f"Detected scale: {result.cgpa_scale}",
        ))
    if result.cgpa_scale is not None:
        fields.append(ExtractedField(field_name="cgpa_scale", value=result.cgpa_scale, confidence="medium"))

    if result.graduation_year is not None:
        fields.append(ExtractedField(
            field_name="graduation_year",
            value=result.graduation_year,
            confidence="medium",
        ))

    if result.university_name:
        fields.append(ExtractedField(
            field_name="undergraduate_university",
            value=result.university_name,
            confidence="low",
            note="Please verify — heuristic detection",
        ))

    if result.degree_name:
        fields.append(ExtractedField(
            field_name="undergraduate_degree",
            value=result.degree_name,
            confidence="low",
            note="Please verify",
        ))

    if result.skills:
        fields.append(ExtractedField(
            field_name="skills",
            value=result.skills,
            confidence="high",
            note=f"{len(result.skills)} skill(s) detected from keyword matching",
        ))

    if result.projects:
        fields.append(ExtractedField(
            field_name="projects",
            value=result.projects,
            confidence="low",
            note="Project names detected from Projects section. Please review.",
        ))

    if result.english_test:
        fields.append(ExtractedField(
            field_name="english_test",
            value=result.english_test,
            confidence="high",
        ))
        fields.append(ExtractedField(
            field_name="english_score",
            value=result.english_score,
            confidence="high",
        ))

    if result.work_experience_years is not None and result.work_experience_years > 0:
        fields.append(ExtractedField(
            field_name="work_experience_years",
            value=result.work_experience_years,
            confidence="low",
            note="Estimated from date ranges. May be inaccurate.",
        ))

    if result.research_experience:
        fields.append(ExtractedField(
            field_name="research_experience",
            value=True,
            confidence="medium",
            note="Detected research-related terms",
        ))

    if result.publications_count > 0:
        fields.append(ExtractedField(
            field_name="publications",
            value=result.publications_count,
            confidence="low",
            note="Estimated from publication indicators",
        ))

    if result.certifications:
        fields.append(ExtractedField(
            field_name="certifications",
            value=result.certifications,
            confidence="medium",
        ))

    # Build patch dict (only fields that were extracted)
    patch: dict[str, Any] = {}
    for f in fields:
        patch[f.field_name] = f.value

    return ParseResponse(
        extracted_fields=fields,
        warnings=result.warnings,
        suggested_profile_patch=patch,
    )


@router.post("/validate", response_model=ValidateResponse)
async def validate_profile(profile: StudentProfile) -> ValidateResponse:
    """
    Validate a student profile and return structured warnings.

    This does not start any agent workflow — it just checks the
    profile for completeness and potential issues.
    """
    errors: list[ValidationWarning] = []
    warnings: list[ValidationWarning] = []
    info: list[ValidationWarning] = []
    completeness_notes: list[str] = []

    # ── Required field checks ─────────────────────────────────
    if profile.cgpa / profile.cgpa_scale < 0.5:
        warnings.append(ValidationWarning(
            field="cgpa",
            severity="warning",
            message=f"Your GPA ({profile.cgpa}/{profile.cgpa_scale}) is below 50%. "
                    "Many programs require ≥ 60–65%. The agents will flag this.",
        ))

    if not profile.preferred_countries:
        errors.append(ValidationWarning(
            field="preferred_countries",
            severity="error",
            message="No preferred countries selected. Please choose at least one.",
        ))

    if not profile.preferred_fields:
        errors.append(ValidationWarning(
            field="preferred_fields",
            severity="error",
            message="No preferred fields of study selected.",
        ))

    # ── Completeness checks ───────────────────────────────────
    score = 50  # base score

    if profile.skills:
        score += 10
    else:
        warnings.append(ValidationWarning(
            field="skills",
            severity="warning",
            message="No skills listed. Adding skills helps the agents match technical programs.",
        ))
        completeness_notes.append("Add technical skills (+10 pts)")

    if profile.english_test and profile.english_score:
        score += 10
    else:
        info.append(ValidationWarning(
            field="english_test",
            severity="info",
            message="No English test score provided. Many programs require IELTS ≥ 6.5 or TOEFL ≥ 90.",
        ))
        completeness_notes.append("Add English test score (+10 pts)")

    if profile.career_goals and len(profile.career_goals) > 50:
        score += 10
    else:
        info.append(ValidationWarning(
            field="career_goals",
            severity="info",
            message="Add a career goals statement (50+ words) to help the Application Coach write a better SOP.",
        ))
        completeness_notes.append("Add career goals statement (+10 pts)")

    if profile.projects:
        score += 10
    else:
        info.append(ValidationWarning(
            field="projects",
            severity="info",
            message="No projects listed. Projects are important differentiators in applications.",
        ))
        completeness_notes.append("Add project descriptions (+10 pts)")

    if profile.resume_text:
        score += 10
    else:
        info.append(ValidationWarning(
            field="resume_text",
            severity="info",
            message="Uploading a resume helps the agents find additional skills and experiences.",
        ))
        completeness_notes.append("Upload your resume (+10 pts)")

    # ── Funding check ─────────────────────────────────────────
    if profile.annual_budget_usd < 5000 and not profile.needs_full_funding:
        info.append(ValidationWarning(
            field="annual_budget_usd",
            severity="info",
            message=f"Budget ${profile.annual_budget_usd:,.0f}/year is low. "
                    "Consider checking 'needs full funding' to focus on fully-funded programs.",
        ))

    # ── GitHub / publications boost ───────────────────────────
    if profile.github_url:
        score = min(100, score + 5)
    if profile.publications > 0:
        score = min(100, score + 5)
        info.append(ValidationWarning(
            field="publications",
            severity="info",
            message=f"{profile.publications} publication(s) found — excellent for research program applications.",
        ))

    is_valid = len(errors) == 0

    return ValidateResponse(
        is_valid=is_valid,
        errors=errors,
        warnings=warnings,
        info=info,
        completeness_score=min(100, score),
        completeness_notes=completeness_notes,
    )
