"""
models/student.py — StudentProfile Pydantic model.

This is the primary input to the agent workflow.
Everything the agents know about the student comes from here.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict


class StudentProfile(BaseModel):
    """
    Represents a student's academic profile and preferences.
    Validated before being passed to the agent swarm.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "Aisha Patel",
                "email": "aisha@example.com",
                "nationality": "Indian",
                "undergraduate_degree": "B.Tech",
                "undergraduate_specialization": "Computer Science",
                "undergraduate_university": "NIT Trichy",
                "cgpa": 8.7,
                "cgpa_scale": 10.0,
                "graduation_year": 2024,
                "preferred_fields": ["Machine Learning", "AI"],
                "preferred_countries": ["Germany", "Canada"],
                "annual_budget_usd": 5000,
                "needs_full_funding": True,
                "skills": ["Python", "PyTorch", "SQL"],
                "work_experience_years": 1.0,
                "research_experience": True,
                "publications": 0,
                "projects": ["Sentiment Analysis Tool", "Traffic Prediction Model"],
                "english_test": "IELTS",
                "english_score": 7.5,
                "career_goals": "I want to become an AI researcher...",
                "github_url": "https://github.com/aishapatel",
            }
        }
    )

    # ── Personal info ─────────────────────────────────────────
    full_name: str = Field(..., min_length=2, max_length=100, description="Student's full name")
    email: Optional[str] = Field(default=None, description="Contact email (optional)")
    nationality: str = Field(..., description="Country of citizenship (affects visa eligibility)")

    # ── Academic background ───────────────────────────────────
    undergraduate_degree: str = Field(..., description="Degree type, e.g. 'B.Tech', 'B.Sc'")
    undergraduate_specialization: str = Field(
        default="",
        description="Specialization/major, e.g. 'Computer Science', 'Electronics'",
    )
    undergraduate_university: str = Field(..., description="Name of undergraduate institution")
    cgpa: float = Field(..., ge=0.0, le=10.0, description="CGPA on a 10-point scale")
    cgpa_scale: float = Field(default=10.0, ge=4.0, le=10.0, description="Max CGPA scale (4 or 10)")
    graduation_year: int = Field(..., ge=2010, le=2030, description="Year of graduation or expected graduation")

    # ── Target degree ─────────────────────────────────────────
    target_degree: str = Field(default="Master's", description="Degree being pursued")
    preferred_fields: list[str] = Field(
        ...,
        min_length=1,
        description="Academic fields of interest, e.g. ['Machine Learning', 'Data Science']",
    )
    preferred_countries: list[str] = Field(
        ...,
        min_length=1,
        description="Countries to search in, e.g. ['Germany', 'Canada', 'USA']",
    )

    # ── Financial ─────────────────────────────────────────────
    annual_budget_usd: float = Field(
        default=0.0, ge=0, description="Annual budget in USD (0 = need full scholarship)"
    )
    needs_full_funding: bool = Field(
        default=False, description="True if student requires 100% funding"
    )

    # ── Qualifications ────────────────────────────────────────
    skills: list[str] = Field(default_factory=list, description="Technical and soft skills")
    work_experience_years: float = Field(default=0.0, ge=0, description="Years of relevant work experience")
    research_experience: bool = Field(default=False, description="Has prior research experience")
    publications: int = Field(default=0, ge=0, description="Number of published papers")
    projects: list[str] = Field(default_factory=list, description="Notable projects")
    certifications: list[str] = Field(default_factory=list, description="Certifications obtained")
    achievements: list[str] = Field(default_factory=list, description="Awards and achievements")
    github_url: Optional[str] = Field(default=None, description="GitHub profile URL (optional)")

    # ── Language ──────────────────────────────────────────────
    english_test: Optional[str] = Field(
        default=None, description="English test taken: IELTS, TOEFL, Duolingo, PTE, or None"
    )
    english_score: Optional[float] = Field(default=None, description="Score on the English test")

    # ── Uploaded documents ───────────────────────────────────
    resume_text: Optional[str] = Field(
        default=None, description="Extracted text from uploaded resume"
    )
    transcript_text: Optional[str] = Field(
        default=None, description="Extracted text from uploaded transcript"
    )

    # ── Additional context ────────────────────────────────────
    career_goals: str = Field(
        default="",
        description="Short paragraph about the student's career objectives",
    )
    additional_info: str = Field(
        default="",
        description="Any other relevant information",
    )

    @field_validator("cgpa")
    @classmethod
    def cgpa_within_scale(cls, v: float, info) -> float:
        return v

    @field_validator("github_url")
    @classmethod
    def validate_github_url(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            v = v.strip()
            if not v.startswith(("http://", "https://")):
                v = "https://" + v
        return v or None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            import re
            if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", v.strip()):
                raise ValueError("Invalid email address format")
        return v or None

    def cgpa_percentage(self) -> float:
        """Normalize CGPA to a 0–100 percentage for comparison."""
        return (self.cgpa / self.cgpa_scale) * 100

    def cgpa_on_4_scale(self) -> float:
        """Convert CGPA to 4-point scale."""
        return (self.cgpa / self.cgpa_scale) * 4.0

    def undergraduate_degree_full(self) -> str:
        """Return full degree string, e.g. 'B.Tech in Computer Science'."""
        if self.undergraduate_specialization:
            return f"{self.undergraduate_degree} in {self.undergraduate_specialization}"
        return self.undergraduate_degree
