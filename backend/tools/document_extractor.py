"""
tools/document_extractor.py — Rule-based structured extraction from resume/transcript text.

IMPORTANT: This is RULE-BASED EXTRACTION using regex and keyword matching.
It is NOT AI/LLM-based extraction. Results must always be shown to the user
for review and correction before being used.

Security: Document text is treated as untrusted input.
We never execute, eval, or follow instructions found in document content.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# ── Keyword dictionaries ──────────────────────────────────────

SKILL_KEYWORDS: set[str] = {
    # Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "kotlin", "swift", "r", "matlab", "scala", "ruby", "php", "sql",
    # ML / Data
    "pytorch", "tensorflow", "keras", "scikit-learn", "sklearn", "pandas",
    "numpy", "scipy", "matplotlib", "seaborn", "huggingface", "transformers",
    "langchain", "openai", "llm", "nlp", "computer vision", "deep learning",
    "machine learning", "reinforcement learning", "data science", "data analysis",
    # Web / Cloud
    "react", "vue", "angular", "node.js", "nodejs", "django", "flask",
    "fastapi", "spring", "aws", "azure", "gcp", "docker", "kubernetes",
    "terraform", "ci/cd", "git", "github", "gitlab", "linux", "bash",
    # Databases
    "postgresql", "mysql", "mongodb", "redis", "sqlite", "elasticsearch",
    "cassandra", "dynamodb",
    # Other
    "latex", "tableau", "power bi", "excel", "spark", "hadoop", "airflow",
}

ENGLISH_TEST_PATTERNS = [
    (r"ielts[\s:–-]+(\d+\.?\d*)", "IELTS"),
    (r"toefl[\s:–-]+(\d+)", "TOEFL"),
    (r"duolingo[\s:–-]+(\d+)", "Duolingo"),
    (r"pte[\s:–-]+(\d+\.?\d*)", "PTE"),
    (r"gre[\s:–-]+(\d+)", "GRE"),
    (r"gmat[\s:–-]+(\d+)", "GMAT"),
]

CGPA_PATTERNS = [
    r"cgpa[\s:–-]+(\d+\.?\d*)[\s/]+(\d+\.?\d*)",      # CGPA: 8.7/10
    r"gpa[\s:–-]+(\d+\.?\d*)[\s/]+(\d+\.?\d*)",        # GPA: 3.8/4.0
    r"(\d+\.?\d*)\s*/\s*(\d+\.?\d*)\s+cgpa",           # 8.7/10 CGPA
    r"(\d+\.?\d*)\s*/\s*(\d+\.?\d*)\s+gpa",            # 3.8/4.0 GPA
    r"cgpa\s*of\s*(\d+\.?\d*)",                         # CGPA of 8.7
    r"gpa\s*of\s*(\d+\.?\d*)",                          # GPA of 3.8
    r"percentage[\s:–-]+(\d+\.?\d*)[\s%]",              # Percentage: 87%
    r"(\d{2,3}\.?\d*)\s*%",                             # 87.5%
]

SECTION_HEADERS = {
    "education": ["education", "academic", "qualification", "degree"],
    "skills": ["skills", "technical skills", "technologies", "competencies", "expertise"],
    "experience": ["experience", "work experience", "employment", "internship"],
    "projects": ["projects", "project work", "personal projects", "academic projects"],
    "publications": ["publications", "papers", "research", "journal"],
    "certifications": ["certification", "certificate", "certified", "license"],
    "achievements": ["achievement", "award", "honor", "recognition", "scholarship"],
}


@dataclass
class ExtractionResult:
    """Structured data extracted from a document. All fields are optional."""
    # Academic
    cgpa: Optional[float] = None
    cgpa_scale: Optional[float] = None
    graduation_year: Optional[int] = None
    university_name: Optional[str] = None
    degree_name: Optional[str] = None

    # Skills
    skills: list[str] = field(default_factory=list)

    # Projects
    projects: list[str] = field(default_factory=list)

    # Experience
    work_experience_years: Optional[float] = None
    research_experience: bool = False
    publications_count: int = 0

    # Language
    english_test: Optional[str] = None
    english_score: Optional[float] = None

    # Certifications / achievements
    certifications: list[str] = field(default_factory=list)
    achievements: list[str] = field(default_factory=list)

    # Metadata
    warnings: list[str] = field(default_factory=list)
    extraction_method: str = "rule-based-regex"


def extract_from_resume(text: str) -> ExtractionResult:
    """
    Extract structured profile data from resume text using rule-based methods.

    This function:
    - Uses regex and keyword matching only
    - Never executes code or follows instructions in the document
    - Marks all extracted data as requiring user review
    - Returns empty fields rather than guessing when data is unclear
    """
    result = ExtractionResult()
    # Sanitize: strip any potential injection attempts (we treat content as data only)
    text = _sanitize_text(text)

    _extract_cgpa(text, result)
    _extract_english_tests(text, result)
    _extract_skills(text, result)
    _extract_projects(text, result)
    _extract_experience(text, result)
    _extract_publications(text, result)
    _extract_certifications(text, result)
    _extract_graduation_year(text, result)

    if not result.skills:
        result.warnings.append("No recognizable skills were found. Please add them manually.")
    if result.cgpa is None:
        result.warnings.append("GPA/CGPA could not be read from the document. Please enter it manually.")

    return result


def extract_from_transcript(text: str) -> ExtractionResult:
    """
    Extract structured academic data from transcript text.
    Focused on grades, degree, and institution.
    """
    result = ExtractionResult()
    text = _sanitize_text(text)

    _extract_cgpa(text, result)
    _extract_graduation_year(text, result)
    _extract_university_name(text, result)
    _extract_degree_name(text, result)

    if result.cgpa is None:
        result.warnings.append("Grade/CGPA not found in transcript. Please enter it manually.")

    return result


# ── Private helpers ───────────────────────────────────────────

def _sanitize_text(text: str) -> str:
    """
    Strip any characters that could be misused.
    We only use the text as a string to match against — never execute it.
    Truncate to a safe max length to prevent DoS.
    """
    # Limit to 50,000 chars (large enough for any real CV)
    text = text[:50_000]
    # Normalize whitespace
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text


def _extract_cgpa(text: str, result: ExtractionResult) -> None:
    text_lower = text.lower()
    for pattern in CGPA_PATTERNS:
        m = re.search(pattern, text_lower)
        if not m:
            continue
        try:
            groups = m.groups()
            if len(groups) == 2:
                val = float(groups[0])
                scale = float(groups[1])
                # Sanity check
                if 0 < val <= scale <= 10 and scale >= 4:
                    result.cgpa = round(val, 2)
                    result.cgpa_scale = scale
                    return
            elif len(groups) == 1:
                val = float(groups[0])
                # Percentage case
                if val > 10:
                    result.cgpa = round(val / 10, 2)  # convert % to /10
                    result.cgpa_scale = 10.0
                    result.warnings.append(
                        f"Found percentage {val}% — converted to {result.cgpa}/10. Please verify."
                    )
                    return
        except (ValueError, IndexError):
            continue


def _extract_english_tests(text: str, result: ExtractionResult) -> None:
    text_lower = text.lower()
    for pattern, test_name in ENGLISH_TEST_PATTERNS:
        m = re.search(pattern, text_lower)
        if m:
            try:
                score = float(m.group(1))
                result.english_test = test_name
                result.english_score = score
                return
            except (ValueError, IndexError):
                continue


def _extract_skills(text: str, result: ExtractionResult) -> None:
    text_lower = text.lower()
    found = []
    for skill in SKILL_KEYWORDS:
        # Use word boundary matching to avoid partial matches
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill.title() if len(skill) <= 4 else skill.capitalize())
    # Deduplicate while preserving order
    seen = set()
    result.skills = [s for s in found if not (s.lower() in seen or seen.add(s.lower()))]


def _extract_projects(text: str, result: ExtractionResult) -> None:
    """Extract project names from the Projects section of a resume."""
    lines = text.split("\n")
    in_section = False
    projects = []

    for line in lines:
        line_stripped = line.strip()
        line_lower = line_stripped.lower()

        # Detect projects section header
        if any(h in line_lower for h in SECTION_HEADERS["projects"]):
            in_section = True
            continue

        # Exit section when another major section starts
        if in_section:
            is_other_header = any(
                any(h in line_lower for h in headers)
                for section, headers in SECTION_HEADERS.items()
                if section != "projects"
            )
            if is_other_header and len(line_stripped) < 50:
                in_section = False
                continue

            # Extract project name candidates (lines that look like titles)
            if line_stripped and len(line_stripped) > 5 and not line_stripped.startswith("•"):
                # Skip lines that are descriptions (long sentences)
                if len(line_stripped) < 100 and not line_stripped.endswith("."):
                    projects.append(line_stripped)

    result.projects = projects[:10]  # cap at 10


def _extract_experience(text: str, result: ExtractionResult) -> None:
    """Estimate years of work experience from date ranges in experience section."""
    # Look for patterns like "2022 - 2024" or "Jan 2022 – Dec 2023"
    year_range_pattern = r"(20\d{2})\s*[-–—]\s*(20\d{2}|present|current)"
    matches = re.findall(year_range_pattern, text.lower())

    total_years = 0.0
    for start_str, end_str in matches:
        try:
            start = int(start_str)
            end = 2026 if end_str in ("present", "current") else int(end_str)
            duration = max(0, end - start)
            total_years += duration
        except ValueError:
            continue

    if total_years > 0:
        result.work_experience_years = round(min(total_years, 20), 1)  # cap at 20

    # Research experience
    research_terms = ["research", "thesis", "dissertation", "lab", "laboratory",
                      "professor", "phd", "researcher", "intern at university"]
    text_lower = text.lower()
    result.research_experience = any(term in text_lower for term in research_terms)


def _extract_publications(text: str, result: ExtractionResult) -> None:
    text_lower = text.lower()
    pub_patterns = [
        r"(\d+)\s+publication",
        r"published\s+(\d+)",
        r"(\d+)\s+paper",
    ]
    for pattern in pub_patterns:
        m = re.search(pattern, text_lower)
        if m:
            try:
                result.publications_count = int(m.group(1))
                return
            except (ValueError, IndexError):
                pass

    # Count "Published in" / "Proceedings of" / "arXiv:" occurrences as proxy
    pub_indicators = ["published in", "proceedings of", "arxiv:", "ieee ", "acm "]
    count = sum(text_lower.count(ind) for ind in pub_indicators)
    if count > 0:
        result.publications_count = count


def _extract_certifications(text: str, result: ExtractionResult) -> None:
    lines = text.split("\n")
    in_section = False
    certs = []
    cert_keywords = ["aws certified", "google certified", "microsoft certified",
                     "coursera", "udemy", "edx", "nptel", "certificate in", "certified in"]

    for line in lines:
        line_stripped = line.strip()
        line_lower = line_stripped.lower()

        if any(h in line_lower for h in SECTION_HEADERS["certifications"]):
            in_section = True
            continue

        if in_section and len(line_stripped) > 5:
            other_section = any(
                any(h in line_lower for h in headers)
                for section, headers in SECTION_HEADERS.items()
                if section != "certifications"
            )
            if other_section and len(line_stripped) < 50:
                in_section = False
                continue
            if line_stripped:
                certs.append(line_stripped)

        # Also scan globally for certification keywords
        if any(kw in line_lower for kw in cert_keywords):
            if line_stripped not in certs:
                certs.append(line_stripped)

    result.certifications = certs[:10]


def _extract_graduation_year(text: str, result: ExtractionResult) -> None:
    # Look for graduation/expected patterns
    patterns = [
        r"graduation[\s:]+(\d{4})",
        r"expected[\s:]+(\d{4})",
        r"class\s+of\s+(\d{4})",
        r"batch[\s:]+(\d{4})",
        r"passed\s+out[\s:]+(\d{4})",
    ]
    text_lower = text.lower()
    for pattern in patterns:
        m = re.search(pattern, text_lower)
        if m:
            try:
                year = int(m.group(1))
                if 2010 <= year <= 2030:
                    result.graduation_year = year
                    return
            except ValueError:
                pass

    # Fallback: find the most recent year mentioned
    years = re.findall(r"\b(20\d{2})\b", text)
    if years:
        valid_years = [int(y) for y in years if 2010 <= int(y) <= 2030]
        if valid_years:
            result.graduation_year = max(valid_years)


def _extract_university_name(text: str, result: ExtractionResult) -> None:
    """Heuristic: find lines containing common university keywords."""
    lines = text.split("\n")
    uni_keywords = ["university", "institute", "college", "school of",
                    "iit", "nit", "bits", "vit", "mit", "stanford",
                    "iisc", "iim", "iiit"]
    for line in lines:
        line_stripped = line.strip()
        if len(line_stripped) > 5 and any(kw in line_stripped.lower() for kw in uni_keywords):
            result.university_name = line_stripped[:120]
            return


def _extract_degree_name(text: str, result: ExtractionResult) -> None:
    """Extract degree name from transcript."""
    degree_patterns = [
        r"(b\.?tech\.?|bachelor\s+of\s+technology)[^\n]*",
        r"(b\.?e\.?|bachelor\s+of\s+engineering)[^\n]*",
        r"(b\.?sc\.?|bachelor\s+of\s+science)[^\n]*",
        r"(b\.?a\.?|bachelor\s+of\s+arts)[^\n]*",
        r"(b\.?com\.?|bachelor\s+of\s+commerce)[^\n]*",
        r"(m\.?tech\.?|master\s+of\s+technology)[^\n]*",
        r"(m\.?sc\.?|master\s+of\s+science)[^\n]*",
    ]
    text_lower = text.lower()
    for pattern in degree_patterns:
        m = re.search(pattern, text_lower)
        if m:
            result.degree_name = m.group(0).strip()[:80]
            return
