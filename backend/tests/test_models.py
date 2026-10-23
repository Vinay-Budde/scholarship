"""
tests/test_models.py — Pydantic model smoke tests.

Run with:  cd backend && pytest tests/ -v
"""

import pytest
from models.student import StudentProfile
from models.opportunity import ScholarshipOpportunity, FundingType, EligibilityStatus
from models.workflow import WorkflowState, AgentStatus


SAMPLE_PROFILE = {
    "full_name": "Aisha Patel",
    "email": "aisha@example.com",
    "nationality": "Indian",
    "undergraduate_degree": "B.Tech in Computer Science",
    "undergraduate_university": "NIT Trichy",
    "cgpa": 8.7,
    "cgpa_scale": 10.0,
    "graduation_year": 2024,
    "preferred_fields": ["Machine Learning", "AI"],
    "preferred_countries": ["Germany", "Canada"],
    "annual_budget_usd": 5000,
    "needs_full_funding": True,
    "skills": ["Python", "PyTorch"],
    "career_goals": "Become an AI researcher",
}


def test_student_profile_creation():
    profile = StudentProfile(**SAMPLE_PROFILE)
    assert profile.full_name == "Aisha Patel"
    assert profile.cgpa_percentage() == pytest.approx(87.0)
    assert profile.cgpa_on_4_scale() == pytest.approx(3.48)


def test_student_profile_cgpa_validation():
    with pytest.raises(Exception):
        StudentProfile(**{**SAMPLE_PROFILE, "cgpa": 15.0})  # > scale


def test_scholarship_opportunity_defaults():
    opp = ScholarshipOpportunity(
        id="test-opp",
        university_name="Test University",
        program_name="M.Sc. Test",
        country="Germany",
        city="Berlin",
    )
    assert opp.funding_type == FundingType.UNKNOWN
    assert opp.eligibility_status == EligibilityStatus.UNVERIFIED
    assert opp.data_verified is False


def test_workflow_state_emit():
    profile = StudentProfile(**SAMPLE_PROFILE)
    state = WorkflowState(session_id="test-123", student_profile=profile)

    event = state.emit("researcher", AgentStatus.RUNNING, "Testing")
    assert event.agent == "researcher"
    assert state.agent_statuses["researcher"] == AgentStatus.RUNNING
    assert len(state.events) == 1


def test_workflow_state_initial_statuses():
    profile = StudentProfile(**SAMPLE_PROFILE)
    state = WorkflowState(session_id="test-456", student_profile=profile)
    for agent in ["researcher", "eligibility_verifier", "opportunity_matcher", "application_coach"]:
        assert state.agent_statuses[agent] == AgentStatus.PENDING
