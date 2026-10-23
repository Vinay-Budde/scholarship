"""
models/opportunity.py — ScholarshipOpportunity and related models.

These are the structured outputs that agents produce and pass between each other.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, HttpUrl


class FundingType(str, Enum):
    FULL = "full"           # tuition + living stipend
    PARTIAL = "partial"     # tuition only or partial coverage
    TUITION_WAIVER = "tuition_waiver"
    STIPEND_ONLY = "stipend_only"
    UNKNOWN = "unknown"


class EligibilityStatus(str, Enum):
    ELIGIBLE = "eligible"
    LIKELY_ELIGIBLE = "likely_eligible"
    MISSING_INFO = "missing_info"       # need more data from student
    LIKELY_INELIGIBLE = "likely_ineligible"
    INELIGIBLE = "ineligible"
    UNVERIFIED = "unverified"           # agent could not confirm


class ScholarshipOpportunity(BaseModel):
    """
    A single university program + scholarship opportunity.
    Populated by the Researcher Agent and enriched by subsequent agents.
    """

    # ── Identity ──────────────────────────────────────────────
    id: str = Field(..., description="Unique slug, e.g. 'tu-berlin-cs-daad-2025'")
    university_name: str
    program_name: str
    degree_type: str = Field(default="Master's")
    country: str
    city: str

    # ── Sources (must be real URLs, never fabricated) ─────────
    program_url: Optional[str] = Field(default=None, description="Official program page")
    scholarship_url: Optional[str] = Field(default=None, description="Official scholarship page")
    source_urls: list[str] = Field(
        default_factory=list,
        description="All URLs used as evidence for this entry",
    )

    # ── Funding ───────────────────────────────────────────────
    funding_type: FundingType = Field(default=FundingType.UNKNOWN)
    annual_tuition_usd: Optional[float] = Field(
        default=None, description="Annual tuition in USD (None = unverified)"
    )
    monthly_stipend_usd: Optional[float] = Field(
        default=None, description="Monthly living stipend in USD"
    )
    scholarship_amount_usd: Optional[float] = Field(
        default=None, description="Total scholarship value per year in USD"
    )
    funding_notes: str = Field(
        default="",
        description="Human-readable notes about funding (e.g. 'covers tuition + €850/month stipend')",
    )

    # ── Deadlines ─────────────────────────────────────────────
    application_deadline: Optional[str] = Field(
        default=None, description="Application deadline (ISO date or descriptive string)"
    )
    deadline_verified: bool = Field(
        default=False, description="True if deadline was confirmed from an official source"
    )

    # ── Requirements ──────────────────────────────────────────
    min_cgpa: Optional[float] = Field(default=None, description="Minimum GPA (on 4.0 scale)")
    cgpa_scale: float = Field(default=4.0)
    required_degree_fields: list[str] = Field(
        default_factory=list,
        description="Accepted undergraduate disciplines",
    )
    language_requirements: dict = Field(
        default_factory=dict,
        description="E.g. {'IELTS': 6.5, 'TOEFL': 90}",
    )
    work_experience_required: bool = Field(default=False)
    research_required: bool = Field(default=False)
    open_to_nationalities: list[str] = Field(
        default_factory=list,
        description="Empty list = open to all; otherwise restricts to listed nationalities",
    )
    excluded_nationalities: list[str] = Field(
        default_factory=list,
        description="Nationalities explicitly excluded (rare but important)",
    )
    other_requirements: list[str] = Field(
        default_factory=list,
        description="Any other documented requirements",
    )

    # ── Eligibility assessment (filled by Eligibility Verifier) ─
    eligibility_status: EligibilityStatus = Field(default=EligibilityStatus.UNVERIFIED)
    eligibility_notes: str = Field(default="")
    missing_requirements: list[str] = Field(
        default_factory=list,
        description="What the student still needs (e.g. 'IELTS score not provided')",
    )

    # ── Ranking (filled by Opportunity Matcher) ───────────────
    match_score: Optional[float] = Field(
        default=None, ge=0, le=100, description="0–100 match score"
    )
    rank: Optional[int] = Field(default=None, description="1 = best match")
    match_reasons: list[str] = Field(
        default_factory=list,
        description="Why this opportunity scored well",
    )
    concerns: list[str] = Field(
        default_factory=list,
        description="Potential issues or uncertainties",
    )

    # ── Data quality flags ────────────────────────────────────
    data_verified: bool = Field(
        default=False,
        description="True if key facts were confirmed from official sources",
    )
    last_verified_date: Optional[str] = Field(default=None)
    confidence: float = Field(
        default=0.5, ge=0, le=1,
        description="Agent's confidence in the accuracy of this data (0–1)",
    )
