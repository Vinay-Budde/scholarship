# 5-Minute Screen Recording Script & Walkthrough

Use this step-by-step guide to record your 5-minute video demonstrating **ScholarSwarm AI** in action for the hackathon judges.

---

## Video Specifications
- **Recommended Tools:** OBS Studio, Loom, Clipchamp, or Windows Game Bar (`Win + G`).
- **Target Duration:** 4 minutes 30 seconds to 5 minutes.
- **Audio:** Clear voiceover walking through each screen.

---

## Scene-by-Scene Recording Plan

### [0:00 - 0:45] Intro & The Problem
- **On Screen:** Title slide or the ScholarSwarm AI home dashboard (`http://localhost:5173`).
- **Script:**
  > *"Hello hackathon judges! We are presenting **ScholarSwarm AI**, an autonomous multi-agent platform designed for students who want to pursue a master's degree abroad but face high costs and confusing scholarship processes. Finding real programs, verifying complex international eligibility criteria, and preparing winning statements of purpose normally takes weeks. We built a swarm of 4 specialized AI agents that automates this entire pipeline in minutes."*

---

### [0:45 - 1:30] Student Profile & Document Upload
- **On Screen:** The Student Profile Form.
- **Action:**
  1. Show the form fields: Student Name (e.g., Alex Chen), Degree (B.Tech Computer Science), CGPA (3.8 / 4.0), Preferred Countries (Germany, Canada, Switzerland), Annual Budget ($5,000), English Proficiency (IELTS 7.5), Skills & Projects.
  2. Upload a sample Resume (PDF/DOCX) or show the parsed document fields.
  3. Highlight the validation checks (Completeness score, requirement warnings).
- **Script:**
  > *"Here is our responsive React dashboard. Students input their academic background, target countries, and budget constraints. They can also upload their resume or transcript. Our backend parses the documents securely without executing untrusted scripts, validating their profile with strict Pydantic models."*

---

### [1:30 - 3:00] Launching the Swarm & Real-Time Agent Stream
- **On Screen:** Click the **"Start AI Research"** button. The view transitions to the **Agent Activity Feed**.
- **Action:**
  1. Point out the live progress bar and status badges updating in real time via Server-Sent Events (SSE).
  2. Explain each agent as it activates:
     - **Researcher Agent:** Web-scrapes DAAD, university portals, and search engines to retrieve 10 distinct programs with real URLs.
     - **Eligibility Verifier Agent:** Inspects GPA cutoffs, language test minimums, and flags missing items (e.g., letters of recommendation).
     - **Opportunity Matcher Agent:** Scores each opportunity across academic fit, affordability, and career goals, picking the top 5.
     - **Application Coach Agent:** Drafts a personalized Statement of Purpose and builds a milestone application checklist.
- **Script:**
  > *"When we click 'Start AI Research', our LangGraph orchestrator launches the agent swarm. The frontend connects to our FastAPI backend using Server-Sent Events for real-time progress. First, the Researcher Agent discovers 10 viable programs across the student's selected countries. Second, the Eligibility Verifier checks actual university criteria. Third, the Opportunity Matcher ranks the programs using multi-factor scoring. Finally, the Application Coach crafts a tailored SOP draft and deadline checklist."*

---

### [3:00 - 4:15] Reviewing the Results
- **On Screen:** The Results View.
- **Action:**
  1. Scroll through the **Top 5 Ranked Scholarships & Programs** (e.g., TU Berlin, ETH Zurich, University of Waterloo).
  2. Click on an opportunity card to show:
     - Funding details (Tuition waiver + monthly stipend)
     - Eligibility status badge (`Likely Eligible`, `Verified`, `Missing Info`)
     - Official direct program and scholarship links
  3. Switch to the **Statement of Purpose (SOP)** tab: Highlight how the SOP cites the student's actual projects, GPA, and targeted faculty.
  4. Switch to the **Application Checklist** tab: Show actionable steps with application deadlines.
- **Script:**
  > *"Here are our final results. Each opportunity card includes transparent funding details, verified deadlines, and direct links to official university websites so students can audit the information. In the SOP tab, you can see a tailored statement that references Alex's real background and target university. The checklist tab gives a concrete timeline for submission."*

---

### [4:15 - 5:00] Technical Challenge, Architecture & Conclusion
- **On Screen:** Show the architecture diagram or the GitHub repository (`https://github.com/Vinay-Budde/scholarship`).
- **Script:**
  > *"Our biggest technical challenge was handling real-time web scraping and preventing hallucinations. We implemented a dual-layer search tool with DuckDuckGo and Tavily, coupled with strict eligibility cross-referencing. The entire project is packaged with clean modular code, comprehensive tests, and zero-key demo resilience. Thank you for watching!"*
