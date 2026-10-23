"""
orchestrator/graph.py — LangGraph workflow (Phase 6 will fully implement this).

For now this module provides:
  - run_demo_workflow()  : used when DEMO_MODE=true or keys are missing
  - run_workflow()       : stub that calls demo mode until Phase 6

Demo mode generates clearly-labeled placeholder data so the full UI
can be exercised without real API calls.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from models.opportunity import (
    EligibilityStatus,
    FundingType,
    ScholarshipOpportunity,
)
from models.workflow import (
    AgentStatus,
    ApplicationChecklist,
    SOP,
    WorkflowState,
)

logger = logging.getLogger(__name__)

# ── Demo data factory ─────────────────────────────────────────

DEMO_OPPORTUNITIES = [
    {
        "id": "demo-tu-berlin-cs",
        "university_name": "TU Berlin",
        "program_name": "M.Sc. Computer Science",
        "country": "Germany",
        "city": "Berlin",
        "program_url": "https://www.tu.berlin/en/studying/study-programs/all-programs-offered/study-course/computer-science-m-sc/",
        "scholarship_url": "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
        "funding_type": FundingType.FULL,
        "funding_notes": "DAAD scholarship covers tuition + ~€850/month living stipend",
        "annual_tuition_usd": 0,
        "monthly_stipend_usd": 935,
        "application_deadline": "2025-11-30",
        "deadline_verified": True,
        "min_cgpa": 3.0,
        "cgpa_scale": 4.0,
        "language_requirements": {"IELTS": 6.5, "TOEFL": 88},
        "eligibility_status": EligibilityStatus.LIKELY_ELIGIBLE,
        "match_score": 88,
        "rank": 1,
        "data_verified": False,
        "confidence": 0.6,
    },
    {
        "id": "demo-eth-zurich-ds",
        "university_name": "ETH Zürich",
        "program_name": "M.Sc. Data Science",
        "country": "Switzerland",
        "city": "Zürich",
        "program_url": "https://ethz.ch/en/studies/master/application.html",
        "scholarship_url": "https://ethz.ch/en/studies/financial/scholarships/excellencescholarship.html",
        "funding_type": FundingType.PARTIAL,
        "funding_notes": "Excellence Scholarship covers tuition + CHF 12,000/year stipend for top applicants",
        "annual_tuition_usd": 1600,
        "monthly_stipend_usd": 1000,
        "application_deadline": "2025-12-15",
        "deadline_verified": True,
        "min_cgpa": 3.5,
        "cgpa_scale": 4.0,
        "language_requirements": {"IELTS": 7.0, "TOEFL": 100},
        "eligibility_status": EligibilityStatus.MISSING_INFO,
        "missing_requirements": ["Research statement required", "Two reference letters"],
        "match_score": 82,
        "rank": 2,
        "data_verified": False,
        "confidence": 0.6,
    },
    {
        "id": "demo-uwaterloo-ai",
        "university_name": "University of Waterloo",
        "program_name": "M.Math. Artificial Intelligence",
        "country": "Canada",
        "city": "Waterloo, Ontario",
        "program_url": "https://cs.uwaterloo.ca/future-graduate-students/areas-research/artificial-intelligence",
        "scholarship_url": "https://uwaterloo.ca/graduate-studies-postdoctoral-affairs/awards/international-masters-award-excellence",
        "funding_type": FundingType.FULL,
        "funding_notes": "International Master's Award of Excellence: CAD $10,000 + TA funding",
        "annual_tuition_usd": 22000,
        "monthly_stipend_usd": 1500,
        "application_deadline": "2026-01-15",
        "deadline_verified": False,
        "min_cgpa": 3.2,
        "cgpa_scale": 4.0,
        "language_requirements": {"IELTS": 6.5, "TOEFL": 90},
        "eligibility_status": EligibilityStatus.LIKELY_ELIGIBLE,
        "match_score": 79,
        "rank": 3,
        "data_verified": False,
        "confidence": 0.5,
    },
    {
        "id": "demo-nus-cs",
        "university_name": "National University of Singapore",
        "program_name": "M.Sc. Computer Science",
        "country": "Singapore",
        "city": "Singapore",
        "program_url": "https://www.comp.nus.edu.sg/programmes/pg/mcs/",
        "scholarship_url": "https://www.nus.edu.sg/oam/scholarships/for-graduate-students",
        "funding_type": FundingType.PARTIAL,
        "funding_notes": "Research scholarship: SGD ~$2,200/month + tuition subsidy",
        "annual_tuition_usd": 18000,
        "monthly_stipend_usd": 1600,
        "application_deadline": "2026-02-28",
        "deadline_verified": False,
        "min_cgpa": 3.0,
        "cgpa_scale": 4.0,
        "language_requirements": {"IELTS": 6.0, "TOEFL": 85},
        "eligibility_status": EligibilityStatus.ELIGIBLE,
        "match_score": 75,
        "rank": 4,
        "data_verified": False,
        "confidence": 0.5,
    },
    {
        "id": "demo-kth-ml",
        "university_name": "KTH Royal Institute of Technology",
        "program_name": "M.Sc. Machine Learning",
        "country": "Sweden",
        "city": "Stockholm",
        "program_url": "https://www.kth.se/en/studies/master/machinelearning",
        "scholarship_url": "https://www.kth.se/en/studies/master/scholarships",
        "funding_type": FundingType.TUITION_WAIVER,
        "funding_notes": "SI scholarship waives tuition (~SEK 295,000) for non-EU students",
        "annual_tuition_usd": 0,
        "monthly_stipend_usd": 0,
        "application_deadline": "2026-01-15",
        "deadline_verified": True,
        "min_cgpa": 3.0,
        "cgpa_scale": 4.0,
        "language_requirements": {"IELTS": 6.5, "TOEFL": 90},
        "eligibility_status": EligibilityStatus.LIKELY_ELIGIBLE,
        "match_score": 73,
        "rank": 5,
        "data_verified": False,
        "confidence": 0.5,
    },
    {
        "id": "demo-epfl-ds",
        "university_name": "EPFL",
        "program_name": "M.Sc. Data Science",
        "country": "Switzerland",
        "city": "Lausanne",
        "program_url": "https://www.epfl.ch/education/master/programs/data-science/",
        "scholarship_url": "https://www.epfl.ch/education/master/financial-support/",
        "funding_type": FundingType.PARTIAL,
        "funding_notes": "Master Fellowship covers CHF 16,000 for exceptional students",
        "annual_tuition_usd": 1600,
        "monthly_stipend_usd": 0,
        "application_deadline": "2026-01-07",
        "deadline_verified": False,
        "min_cgpa": 3.5,
        "cgpa_scale": 4.0,
        "language_requirements": {"IELTS": 7.0, "TOEFL": 100},
        "eligibility_status": EligibilityStatus.MISSING_INFO,
        "missing_requirements": ["Requires statement of purpose in French or English"],
        "match_score": 71,
        "rank": 6,
        "data_verified": False,
        "confidence": 0.5,
    },
    {
        "id": "demo-unimelb-ai",
        "university_name": "University of Melbourne",
        "program_name": "M.Sc. Artificial Intelligence",
        "country": "Australia",
        "city": "Melbourne",
        "program_url": "https://study.unimelb.edu.au/find/courses/graduate/master-of-artificial-intelligence/",
        "scholarship_url": "https://scholarships.unimelb.edu.au/",
        "funding_type": FundingType.PARTIAL,
        "funding_notes": "Graduate Research Scholarship: AUD $35,000/year (competitive)",
        "annual_tuition_usd": 38000,
        "monthly_stipend_usd": 2400,
        "application_deadline": "2025-10-31",
        "deadline_verified": False,
        "min_cgpa": 3.0,
        "cgpa_scale": 4.0,
        "language_requirements": {"IELTS": 6.5, "TOEFL": 79},
        "eligibility_status": EligibilityStatus.LIKELY_ELIGIBLE,
        "match_score": 68,
        "rank": 7,
        "data_verified": False,
        "confidence": 0.4,
    },
    {
        "id": "demo-aalto-cs",
        "university_name": "Aalto University",
        "program_name": "M.Sc. Computer Science",
        "country": "Finland",
        "city": "Espoo",
        "program_url": "https://www.aalto.fi/en/programmes/master-s-programme-in-computer-science",
        "scholarship_url": "https://www.aalto.fi/en/study-at-aalto/scholarships",
        "funding_type": FundingType.TUITION_WAIVER,
        "funding_notes": "Aalto Excellence Scholarship: full tuition waiver + EUR 5,000",
        "annual_tuition_usd": 15000,
        "monthly_stipend_usd": 0,
        "application_deadline": "2026-01-20",
        "deadline_verified": False,
        "min_cgpa": 3.0,
        "cgpa_scale": 4.0,
        "language_requirements": {"IELTS": 6.5, "TOEFL": 92},
        "eligibility_status": EligibilityStatus.LIKELY_ELIGIBLE,
        "match_score": 66,
        "rank": 8,
        "data_verified": False,
        "confidence": 0.4,
    },
    {
        "id": "demo-delft-cs",
        "university_name": "TU Delft",
        "program_name": "M.Sc. Computer Science",
        "country": "Netherlands",
        "city": "Delft",
        "program_url": "https://www.tudelft.nl/onderwijs/opleidingen/masters/cs/msc-computer-science",
        "scholarship_url": "https://www.tudelft.nl/en/education/programmes/masters/msc-cs/the-programme/scholarships-and-grants",
        "funding_type": FundingType.PARTIAL,
        "funding_notes": "Holland Scholarship: EUR 5,000 one-time grant for non-EEA students",
        "annual_tuition_usd": 18000,
        "monthly_stipend_usd": 0,
        "application_deadline": "2026-01-15",
        "deadline_verified": False,
        "min_cgpa": 3.0,
        "cgpa_scale": 4.0,
        "language_requirements": {"IELTS": 6.5, "TOEFL": 90},
        "eligibility_status": EligibilityStatus.LIKELY_ELIGIBLE,
        "match_score": 63,
        "rank": 9,
        "data_verified": False,
        "confidence": 0.4,
    },
    {
        "id": "demo-uoft-ml",
        "university_name": "University of Toronto",
        "program_name": "M.Sc. Applied Computing (AI specialization)",
        "country": "Canada",
        "city": "Toronto, Ontario",
        "program_url": "https://web.cs.toronto.edu/graduate/master-of-science-in-applied-computing",
        "scholarship_url": "https://www.sgs.utoronto.ca/awards/",
        "funding_type": FundingType.PARTIAL,
        "funding_notes": "Vector Institute Scholarship: CAD $17,500 for AI-focused students",
        "annual_tuition_usd": 28000,
        "monthly_stipend_usd": 0,
        "application_deadline": "2026-01-30",
        "deadline_verified": False,
        "min_cgpa": 3.3,
        "cgpa_scale": 4.0,
        "language_requirements": {"IELTS": 6.5, "TOEFL": 93},
        "eligibility_status": EligibilityStatus.MISSING_INFO,
        "missing_requirements": ["Requires supervisor interest letter for MScAC"],
        "match_score": 61,
        "rank": 10,
        "data_verified": False,
        "confidence": 0.4,
    },
]

DEMO_DISCLAIMER = (
    "⚠️ DEMO MODE — These results are pre-loaded examples for UI testing only. "
    "They are NOT real-time research results. Configure real API keys (OPENAI_API_KEY + "
    "TAVILY_API_KEY) to get live, personalized scholarship research."
)


async def run_demo_workflow(state: WorkflowState) -> None:
    """
    Simulate the full 4-agent pipeline with realistic delays.
    All data is clearly marked as demo / not verified.
    """
    logger.info("Running DEMO workflow for session %s", state.session_id)
    state.is_demo = True

    # ── Agent 1: Researcher ───────────────────────────────────
    state.emit("researcher", AgentStatus.RUNNING, "🔍 Searching for matching programs and scholarships...")
    await asyncio.sleep(2)
    state.emit("researcher", AgentStatus.RUNNING, "📚 Found 10 candidate opportunities — validating sources...")
    await asyncio.sleep(1.5)

    opportunities = [ScholarshipOpportunity(**o) for o in DEMO_OPPORTUNITIES]
    # Add demo disclaimer to funding_notes
    for opp in opportunities:
        opp.funding_notes = f"[DEMO] {opp.funding_notes}"

    state.opportunities = opportunities
    state.emit(
        "researcher", AgentStatus.DONE,
        f"✅ Researcher found {len(opportunities)} programs [DEMO DATA]",
        data={"count": len(opportunities)},
    )

    # ── Agent 2: Eligibility Verifier ─────────────────────────
    state.emit("eligibility_verifier", AgentStatus.RUNNING, "🔎 Checking eligibility requirements for each program...")
    await asyncio.sleep(2)
    state.emit("eligibility_verifier", AgentStatus.RUNNING, "📋 Analyzing language requirements and GPA thresholds...")
    await asyncio.sleep(1.5)
    state.emit(
        "eligibility_verifier", AgentStatus.DONE,
        "✅ Eligibility assessment complete [DEMO DATA]",
    )

    # ── Agent 3: Opportunity Matcher ──────────────────────────
    state.emit("opportunity_matcher", AgentStatus.RUNNING, "🏆 Ranking opportunities by academic fit, funding, and deadlines...")
    await asyncio.sleep(2)

    # Top 5 are already ranked in demo data
    state.top_opportunities = sorted(opportunities, key=lambda o: o.match_score or 0, reverse=True)[:5]
    state.emit(
        "opportunity_matcher", AgentStatus.DONE,
        f"✅ Ranked all opportunities — top 5 selected [DEMO DATA]",
        data={"top_count": len(state.top_opportunities)},
    )

    # ── Agent 4: Application Coach ────────────────────────────
    state.emit("application_coach", AgentStatus.RUNNING, "✍️ Generating personalized Statement of Purpose draft...")
    await asyncio.sleep(2.5)

    profile = state.student_profile
    top = state.top_opportunities[0] if state.top_opportunities else None

    sop_draft = _generate_demo_sop(profile, top)
    state.sop = SOP(
        draft=sop_draft,
        word_count=len(sop_draft.split()),
        tailored_for=top.university_name if top else None,
        notes=[
            "Quantify your project impact with metrics where possible.",
            "Add a specific faculty member's research you want to work with.",
            "Mention how this program connects to your 5-year career goal.",
            "[DEMO] This SOP was generated without real API calls. Configure LLM keys for a personalized draft.",
        ],
    )

    checklists = _generate_demo_checklists(state.top_opportunities)
    state.checklists = checklists

    state.emit(
        "application_coach", AgentStatus.DONE,
        "✅ SOP draft and application checklists ready [DEMO DATA]",
    )

    state.completed_at = datetime.utcnow().isoformat()
    logger.info("Demo workflow complete for session %s", state.session_id)


async def run_workflow(state: WorkflowState) -> None:
    """
    Full LangGraph workflow — implemented in Phase 6.
    For now, falls back to demo mode with a note.
    """
    logger.warning("Full LangGraph workflow not yet implemented — running demo mode")
    state.emit(
        "researcher", AgentStatus.RUNNING,
        "ℹ️ Full AI workflow coming in Phase 6 — running demo mode for now",
    )
    await asyncio.sleep(0.5)
    await run_demo_workflow(state)


# ── Helper functions ──────────────────────────────────────────

def _generate_demo_sop(profile, top_opp) -> str:
    name = profile.full_name
    degree = profile.undergraduate_degree
    fields = ", ".join(profile.preferred_fields[:2]) if profile.preferred_fields else "Computer Science"
    goals = profile.career_goals or "contribute to cutting-edge research and build impactful AI systems"
    uni = top_opp.university_name if top_opp else "your institution"
    program = top_opp.program_name if top_opp else "the Master's program"

    return f"""[DEMO SOP — Generated without real AI. Configure LLM API keys for a personalized draft.]

Statement of Purpose

My journey into {fields} began during my undergraduate studies in {degree}. Through coursework, personal projects, and research exposure, I developed a deep conviction that advanced study in this field is the key to achieving my goal: to {goals}.

During my undergraduate years, I consistently pursued opportunities to push beyond the curriculum. I worked on projects including {', '.join(profile.projects[:2]) if profile.projects else 'several impactful technical projects'}, which taught me not just technical skills but the value of rigorous, systematic problem-solving. My CGPA of {profile.cgpa}/{profile.cgpa_scale} reflects my commitment to academic excellence.

I am particularly drawn to {uni}'s {program} because of its reputation for combining theoretical rigor with real-world application. The program's curriculum aligns precisely with the skills I need to advance my career in {fields}.

My technical foundation includes proficiency in {', '.join(profile.skills[:5]) if profile.skills else 'multiple programming languages and frameworks'}. This toolkit, combined with my research experience, has prepared me to contribute meaningfully from day one.

With a budget constraint of ${profile.annual_budget_usd:,.0f}/year, funding is critical to my ability to pursue graduate education. I am committed to making the most of any scholarship support to achieve academic and professional excellence.

I am confident that {uni}'s {program} will provide the ideal environment for me to grow as a researcher and engineer, and I look forward to contributing to the program's vibrant academic community.

Sincerely,
{name}
"""


def _generate_demo_checklists(opportunities: list) -> list:
    checklists = []
    for opp in opportunities:
        items = [
            f"Register on the {opp.university_name} application portal",
            "Prepare official transcripts (sealed)",
            "Request 2–3 letters of recommendation from faculty/employers",
            "Write Statement of Purpose (tailored to this program)",
            "Update CV/Resume to highlight relevant projects and skills",
        ]
        if opp.language_requirements:
            reqs = ", ".join(f"{k} ≥ {v}" for k, v in opp.language_requirements.items())
            items.append(f"Submit English test scores: {reqs}")
        if opp.scholarship_url:
            items.append(f"Submit separate scholarship application: {opp.scholarship_url}")
        if opp.missing_requirements:
            for req in opp.missing_requirements:
                items.append(f"[Missing] {req}")
        items.append(f"Submit by: {opp.application_deadline or 'Check official website'}")

        checklists.append(ApplicationChecklist(
            opportunity_id=opp.id,
            university_name=opp.university_name,
            program_name=opp.program_name,
            items=items,
            deadline=opp.application_deadline,
            application_url=opp.program_url,
        ))
    return checklists
