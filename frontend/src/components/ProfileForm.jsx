/**
 * components/ProfileForm.jsx — Student profile input form (Phase 2).
 *
 * New in Phase 2:
 * - GitHub URL field (optional)
 * - Undergraduate specialization field
 * - Certifications and achievements fields
 * - Document upload auto-fills form via ExtractionReviewPanel
 * - Validate Profile button calls /api/profile/validate
 * - ProfileValidationPanel shows completeness score
 */

import { useState, useCallback } from 'react'
import FileUpload from './FileUpload'
import ExtractionReviewPanel from './ExtractionReviewPanel'
import ProfileValidationPanel from './ProfileValidationPanel'
import { validateProfile } from '../api/client'

const COUNTRIES = [
  'Germany', 'Canada', 'USA', 'UK', 'Australia', 'Netherlands',
  'Sweden', 'Finland', 'Switzerland', 'Singapore', 'Japan', 'France',
  'Norway', 'Denmark', 'New Zealand', 'Ireland', 'Austria', 'Italy',
  'Spain', 'Belgium', 'South Korea',
]

const FIELDS = [
  'Computer Science', 'Machine Learning', 'Artificial Intelligence',
  'Data Science', 'Software Engineering', 'Robotics', 'Cybersecurity',
  'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering',
  'Biotechnology', 'Bioinformatics', 'Business Analytics', 'Finance',
  'Economics', 'Mathematics', 'Physics', 'Chemistry', 'Environmental Science',
  'Public Policy', 'Information Systems',
]

const ENGLISH_TESTS = ['IELTS', 'TOEFL', 'Duolingo', 'PTE', 'Cambridge', 'None / Not taken yet']

const initialForm = {
  full_name: '',
  email: '',
  nationality: '',
  undergraduate_degree: '',
  undergraduate_specialization: '',
  undergraduate_university: '',
  cgpa: '',
  cgpa_scale: '10',
  graduation_year: new Date().getFullYear().toString(),
  target_degree: "Master's",
  preferred_fields: [],
  preferred_countries: [],
  annual_budget_usd: '',
  needs_full_funding: false,
  skills: '',
  work_experience_years: '0',
  research_experience: false,
  publications: '0',
  projects: '',
  certifications: '',
  achievements: '',
  github_url: '',
  english_test: 'IELTS',
  english_score: '',
  career_goals: '',
  resume_text: '',
  transcript_text: '',
}

const sections = [
  { label: 'Personal',       icon: '👤' },
  { label: 'Academic',       icon: '🎓' },
  { label: 'Preferences',    icon: '🌍' },
  { label: 'Qualifications', icon: '⭐' },
  { label: 'Documents',      icon: '📄' },
]

export default function ProfileForm({ onSubmit, isLoading }) {
  const [form, setForm]                   = useState(initialForm)
  const [errors, setErrors]               = useState({})
  const [activeSection, setActiveSection] = useState(0)
  const [extraction, setExtraction]       = useState(null)  // pending extraction panel data
  const [validation, setValidation]       = useState(null)  // from /api/profile/validate
  const [validating, setValidating]       = useState(false)

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const toggleMulti = (field, value) => {
    setForm(f => {
      const arr = f[field]
      return {
        ...f,
        [field]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value],
      }
    })
  }

  // Called when FileUpload finishes uploading — receives the full upload response
  const handleUploadComplete = useCallback((uploadResponse, docType) => {
    // Always store the raw text
    if (docType === 'resume') set('resume_text', uploadResponse.extracted_text)
    else set('transcript_text', uploadResponse.extracted_text)

    // Show extraction review panel if fields were found
    if (uploadResponse.extracted_fields?.length > 0) {
      setExtraction({
        fields: uploadResponse.extracted_fields,
        warnings: uploadResponse.extraction_warnings || [],
        docType,
      })
    }
  }, [])

  // Apply accepted extracted fields into the form
  const applyExtraction = useCallback((patch) => {
    setForm(prev => {
      const next = { ...prev }
      for (const [key, value] of Object.entries(patch)) {
        if (Array.isArray(value)) {
          // skills, projects, certifications — convert to string
          if (key === 'skills') next.skills = value.join(', ')
          else if (key === 'projects') next.projects = value.join('\n')
          else if (key === 'certifications') next.certifications = value.join('\n')
          else next[key] = value
        } else if (typeof value === 'boolean') {
          next[key] = value
        } else {
          next[key] = String(value)
        }
      }
      return next
    })
    setExtraction(null)
  }, [])

  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Name is required'
    if (!form.nationality.trim()) e.nationality = 'Nationality is required'
    if (!form.undergraduate_degree.trim()) e.undergraduate_degree = 'Degree type is required'
    if (!form.undergraduate_university.trim()) e.undergraduate_university = 'University is required'
    const cgpa = parseFloat(form.cgpa)
    if (isNaN(cgpa) || cgpa < 0) e.cgpa = 'Valid CGPA/percentage required'
    if (form.preferred_fields.length === 0) e.preferred_fields = 'Select at least one field'
    if (form.preferred_countries.length === 0) e.preferred_countries = 'Select at least one country'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildProfilePayload = () => ({
    ...form,
    cgpa: parseFloat(form.cgpa) || 0,
    cgpa_scale: parseFloat(form.cgpa_scale),
    graduation_year: parseInt(form.graduation_year),
    annual_budget_usd: parseFloat(form.annual_budget_usd) || 0,
    work_experience_years: parseFloat(form.work_experience_years) || 0,
    publications: parseInt(form.publications) || 0,
    english_score: form.english_score ? parseFloat(form.english_score) : null,
    english_test: form.english_test?.includes('None') ? null : form.english_test,
    email: form.email.trim() || null,
    github_url: form.github_url.trim() || null,
    skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
    projects: form.projects.split('\n').map(s => s.trim()).filter(Boolean),
    certifications: form.certifications.split('\n').map(s => s.trim()).filter(Boolean),
    achievements: form.achievements.split('\n').map(s => s.trim()).filter(Boolean),
  })

  const handleValidate = async () => {
    if (!validate()) { setActiveSection(0); return }
    setValidating(true)
    try {
      const result = await validateProfile(buildProfilePayload())
      setValidation(result)
    } catch (err) {
      console.error('Validation failed:', err)
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) { setActiveSection(0); return }
    onSubmit(buildProfilePayload())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Extraction review panel — shown after document upload */}
      {extraction && (
        <ExtractionReviewPanel
          extractedFields={extraction.fields}
          warnings={extraction.warnings}
          onApply={applyExtraction}
          onDismiss={() => setExtraction(null)}
        />
      )}

      {/* Validation panel */}
      {validation && (
        <ProfileValidationPanel
          validation={validation}
          onDismiss={() => setValidation(null)}
        />
      )}

      {/* Section tabs */}
      <div className="flex gap-1 p-1 bg-space-900 rounded-xl border border-white/5 overflow-x-auto">
        {sections.map((s, i) => (
          <button
            key={i} type="button" onClick={() => setActiveSection(i)}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap
              ${activeSection === i
                ? 'bg-violet-600 text-white shadow-glow-violet'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* ── Section 0: Personal ─────────────────────────────── */}
      {activeSection === 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name *</label>
              <input id="full_name"
                className={`form-input ${errors.full_name ? 'border-rose-500/60' : ''}`}
                placeholder="e.g. Aisha Patel" value={form.full_name}
                onChange={e => set('full_name', e.target.value)} />
              {errors.full_name && <p className="text-rose-400 text-xs mt-1">{errors.full_name}</p>}
            </div>
            <div>
              <label className="form-label">Email <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
              <input id="email" type="email" className="form-input"
                placeholder="you@example.com" value={form.email}
                onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nationality / Citizenship *</label>
              <input id="nationality"
                className={`form-input ${errors.nationality ? 'border-rose-500/60' : ''}`}
                placeholder="e.g. Indian" value={form.nationality}
                onChange={e => set('nationality', e.target.value)} />
              {errors.nationality && <p className="text-rose-400 text-xs mt-1">{errors.nationality}</p>}
            </div>
            <div>
              <label className="form-label">GitHub Profile <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
              <input id="github_url" className="form-input"
                placeholder="https://github.com/username" value={form.github_url}
                onChange={e => set('github_url', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label">Career Goals</label>
            <textarea id="career_goals" className="form-input resize-none" rows={3}
              placeholder="Describe what you want to achieve with your Master's degree and career beyond it..."
              value={form.career_goals} onChange={e => set('career_goals', e.target.value)} />
            <p className="text-xs text-slate-600 mt-1">
              {form.career_goals.length} chars · Aim for 100+ words to help the Application Coach write a better SOP.
            </p>
          </div>
        </div>
      )}

      {/* ── Section 1: Academic ─────────────────────────────── */}
      {activeSection === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Degree Type *</label>
              <input id="undergrad_degree"
                className={`form-input ${errors.undergraduate_degree ? 'border-rose-500/60' : ''}`}
                placeholder="e.g. B.Tech, B.Sc, B.E, B.A"
                value={form.undergraduate_degree}
                onChange={e => set('undergraduate_degree', e.target.value)} />
              {errors.undergraduate_degree && <p className="text-rose-400 text-xs mt-1">{errors.undergraduate_degree}</p>}
            </div>
            <div>
              <label className="form-label">Specialization / Major</label>
              <input id="undergrad_spec" className="form-input"
                placeholder="e.g. Computer Science, Electronics"
                value={form.undergraduate_specialization}
                onChange={e => set('undergraduate_specialization', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label">University Name *</label>
            <input id="undergrad_university"
              className={`form-input ${errors.undergraduate_university ? 'border-rose-500/60' : ''}`}
              placeholder="e.g. IIT Bombay, NIT Trichy, VIT Vellore"
              value={form.undergraduate_university}
              onChange={e => set('undergraduate_university', e.target.value)} />
            {errors.undergraduate_university && <p className="text-rose-400 text-xs mt-1">{errors.undergraduate_university}</p>}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">CGPA / Percentage *</label>
              <input id="cgpa" type="number" step="0.01"
                className={`form-input ${errors.cgpa ? 'border-rose-500/60' : ''}`}
                placeholder="8.7" value={form.cgpa}
                onChange={e => set('cgpa', e.target.value)} />
              {errors.cgpa && <p className="text-rose-400 text-xs mt-1">{errors.cgpa}</p>}
            </div>
            <div>
              <label className="form-label">Scale</label>
              <select id="cgpa_scale" className="form-input"
                value={form.cgpa_scale} onChange={e => set('cgpa_scale', e.target.value)}>
                <option value="10">/ 10.0</option>
                <option value="4">/ 4.0</option>
                <option value="5">/ 5.0</option>
                <option value="7">/ 7.0</option>
                <option value="100">/ 100 (percentage)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Graduation Year</label>
              <input id="graduation_year" type="number" className="form-input"
                placeholder="2024" value={form.graduation_year}
                onChange={e => set('graduation_year', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">English Proficiency Test</label>
              <select id="english_test" className="form-input"
                value={form.english_test} onChange={e => set('english_test', e.target.value)}>
                {ENGLISH_TESTS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {!form.english_test?.includes('None') && (
              <div>
                <label className="form-label">Score</label>
                <input id="english_score" type="number" step="0.5" className="form-input"
                  placeholder={form.english_test === 'IELTS' ? '7.0 (out of 9.0)' : form.english_test === 'TOEFL' ? '100 (out of 120)' : 'Score'}
                  value={form.english_score}
                  onChange={e => set('english_score', e.target.value)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section 2: Preferences ──────────────────────────── */}
      {activeSection === 2 && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <label className="form-label">Intended Master's Degree Subject *</label>
            {errors.preferred_fields && <p className="text-rose-400 text-xs mb-2">{errors.preferred_fields}</p>}
            <div className="flex flex-wrap gap-2">
              {FIELDS.map(f => (
                <button key={f} type="button" id={`field-${f.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => toggleMulti('preferred_fields', f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150
                    ${form.preferred_fields.includes(f)
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-space-800 border-white/10 text-slate-400 hover:border-violet-500/40 hover:text-white'
                    }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Preferred Countries *</label>
            {errors.preferred_countries && <p className="text-rose-400 text-xs mb-2">{errors.preferred_countries}</p>}
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map(c => (
                <button key={c} type="button" id={`country-${c.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => toggleMulti('preferred_countries', c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150
                    ${form.preferred_countries.includes(c)
                      ? 'bg-cyan-600 border-cyan-500 text-white'
                      : 'bg-space-800 border-white/10 text-slate-400 hover:border-cyan-500/40 hover:text-white'
                    }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Max Annual Budget (USD)</label>
              <input id="annual_budget_usd" type="number" className="form-input"
                placeholder="e.g. 10000 — enter 0 for fully-funded only"
                value={form.annual_budget_usd}
                onChange={e => set('annual_budget_usd', e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input id="needs_full_funding" type="checkbox"
                className="w-4 h-4 rounded border-white/20 bg-space-800 text-violet-500"
                checked={form.needs_full_funding}
                onChange={e => set('needs_full_funding', e.target.checked)} />
              <label htmlFor="needs_full_funding" className="text-sm text-slate-300 cursor-pointer">
                I <strong>must</strong> have full funding
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 3: Qualifications ───────────────────────── */}
      {activeSection === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="form-label">Technical Skills <span className="text-slate-600 normal-case font-normal">(comma-separated)</span></label>
            <input id="skills" className="form-input"
              placeholder="Python, PyTorch, SQL, React, Docker, Machine Learning..."
              value={form.skills} onChange={e => set('skills', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Work Experience (years)</label>
              <input id="work_exp" type="number" step="0.5" className="form-input"
                placeholder="1.5" value={form.work_experience_years}
                onChange={e => set('work_experience_years', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Publications</label>
              <input id="publications" type="number" className="form-input"
                placeholder="0" value={form.publications}
                onChange={e => set('publications', e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input id="research_exp" type="checkbox"
                className="w-4 h-4 rounded border-white/20 bg-space-800 text-violet-500"
                checked={form.research_experience}
                onChange={e => set('research_experience', e.target.checked)} />
              <label htmlFor="research_exp" className="text-sm text-slate-300 cursor-pointer">
                Research experience
              </label>
            </div>
          </div>
          <div>
            <label className="form-label">Notable Projects <span className="text-slate-600 normal-case font-normal">(one per line)</span></label>
            <textarea id="projects" className="form-input resize-none" rows={3}
              placeholder={"Sentiment Analysis Tool using BERT\nTraffic Prediction with LSTM\nChatbot using LangChain"}
              value={form.projects} onChange={e => set('projects', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Certifications <span className="text-slate-600 normal-case font-normal">(one per line)</span></label>
            <textarea id="certifications" className="form-input resize-none" rows={2}
              placeholder={"AWS Certified Cloud Practitioner\nGoogle Data Analytics Certificate"}
              value={form.certifications} onChange={e => set('certifications', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Awards & Achievements <span className="text-slate-600 normal-case font-normal">(one per line)</span></label>
            <textarea id="achievements" className="form-input resize-none" rows={2}
              placeholder={"Dean's List — 3 semesters\nBest Paper Award at XYZ Conference"}
              value={form.achievements} onChange={e => set('achievements', e.target.value)} />
          </div>
        </div>
      )}

      {/* ── Section 4: Documents ────────────────────────────── */}
      {activeSection === 4 && (
        <div className="space-y-5 animate-fade-in">
          <FileUpload
            label="Resume / CV"
            docType="resume"
            onUploadComplete={(res) => handleUploadComplete(res, 'resume')}
            currentText={form.resume_text}
          />
          <FileUpload
            label="Academic Transcript or Marksheet"
            docType="transcript"
            onUploadComplete={(res) => handleUploadComplete(res, 'transcript')}
            currentText={form.transcript_text}
          />
          <div className="p-3 rounded-xl bg-space-900 border border-white/5 text-xs text-slate-500 space-y-1">
            <p>📄 <strong className="text-slate-400">Optional but recommended</strong> — uploading documents helps the agents find more relevant programs.</p>
            <p>🔒 Supported: PDF, DOCX · Max 10 MB · Files are processed on the server and not stored permanently.</p>
            <p>⚙️ Extraction uses rule-based pattern matching, not AI — always review detected fields before submitting.</p>
          </div>
        </div>
      )}

      {/* ── Navigation + Actions ─────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 gap-3">
        <button type="button" onClick={() => setActiveSection(s => Math.max(0, s - 1))}
          className={`btn-secondary ${activeSection === 0 ? 'invisible' : ''}`}>
          ← Back
        </button>

        <div className="flex gap-2">
          {/* Validate button — always visible after section 0 */}
          {activeSection >= 1 && (
            <button type="button" onClick={handleValidate} disabled={validating}
              className="btn-secondary text-xs py-2 px-4">
              {validating
                ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border border-violet-400/40 border-t-violet-400 rounded-full animate-spin"/> Checking…</span>
                : '📊 Check Profile'
              }
            </button>
          )}

          {activeSection < sections.length - 1 ? (
            <button type="button" onClick={() => setActiveSection(s => s + 1)}
              className="btn-primary">
              Next →
            </button>
          ) : (
            <button type="submit" id="start-research-btn" disabled={isLoading}
              className="btn-primary text-base px-8 py-3.5">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting…
                </span>
              ) : (
                <span className="flex items-center gap-2">🚀 Start AI Research</span>
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
