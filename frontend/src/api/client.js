/**
 * api/client.js — All HTTP calls to the FastAPI backend.
 *
 * Using the Vite proxy, all /api/* requests automatically go to localhost:8000.
 * No need to hardcode the backend URL anywhere.
 */

const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

/** Check backend health & configuration status */
export async function checkHealth() {
  return request('/health')
}

/**
 * Start a research workflow for a student profile.
 * Returns { session_id, stream_url, results_url, is_demo }
 */
export async function startResearch(studentProfile) {
  return request('/research', {
    method: 'POST',
    body: JSON.stringify({ student_profile: studentProfile }),
  })
}

/** Get final results for a completed session */
export async function getResults(sessionId) {
  return request(`/results/${sessionId}`)
}

/**
 * Upload a resume or transcript file.
 * Returns { filename, doc_type, extracted_text, char_count, page_count,
 *           extracted_fields, suggested_profile_patch, extraction_warnings }
 */
export async function uploadDocument(file, docType = 'resume') {
  const form = new FormData()
  form.append('file', file)
  form.append('doc_type', docType)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Upload failed: HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Parse raw document text with rule-based extraction.
 * Returns structured fields for pre-filling the profile form.
 */
export async function parseDocumentText(text, docType = 'resume') {
  return request('/profile/parse', {
    method: 'POST',
    body: JSON.stringify({ text, doc_type: docType }),
  })
}

/**
 * Validate a complete student profile.
 * Returns { is_valid, errors, warnings, info, completeness_score }
 */
export async function validateProfile(profile) {
  return request('/profile/validate', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}
