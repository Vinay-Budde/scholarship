/**
 * components/ExtractionReviewPanel.jsx
 *
 * Shows the fields that were extracted from the uploaded document
 * using rule-based keyword matching. The user can:
 * - Accept individual fields (they get merged into the form)
 * - Reject fields they know are wrong
 * - See extraction confidence levels
 *
 * IMPORTANT: Always shows the disclaimer that this is NOT AI extraction.
 */

import { useState } from 'react'

const CONFIDENCE_CONFIG = {
  high:   { label: 'High',   cls: 'badge-green',  icon: '●' },
  medium: { label: 'Medium', cls: 'badge-yellow', icon: '●' },
  low:    { label: 'Low',    cls: 'badge-gray',   icon: '●' },
}

const FIELD_LABELS = {
  cgpa: 'CGPA',
  cgpa_scale: 'CGPA Scale',
  graduation_year: 'Graduation Year',
  undergraduate_university: 'University',
  undergraduate_degree: 'Degree',
  skills: 'Skills',
  projects: 'Projects',
  english_test: 'English Test',
  english_score: 'English Score',
  work_experience_years: 'Work Experience (yrs)',
  research_experience: 'Research Experience',
  publications: 'Publications',
  certifications: 'Certifications',
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export default function ExtractionReviewPanel({ extractedFields, warnings, onApply, onDismiss }) {
  const [accepted, setAccepted] = useState(() =>
    // Default: accept all high-confidence fields
    Object.fromEntries(
      extractedFields.map(f => [f.field_name, f.confidence === 'high'])
    )
  )

  if (!extractedFields || extractedFields.length === 0) return null

  const toggle = (fieldName) => {
    setAccepted(prev => ({ ...prev, [fieldName]: !prev[fieldName] }))
  }

  const handleApply = () => {
    const patch = {}
    extractedFields.forEach(f => {
      if (accepted[f.field_name]) {
        patch[f.field_name] = f.value
      }
    })
    onApply(patch)
  }

  const acceptedCount = Object.values(accepted).filter(Boolean).length

  return (
    <div className="glass-card border-amber-500/20 p-5 space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-400">⚙️</span>
            <h3 className="font-display font-semibold text-white text-sm">
              Auto-Detected Fields
            </h3>
            <span className="badge badge-yellow text-xs">Rule-based · Not AI</span>
          </div>
          <p className="text-xs text-slate-400">
            These were detected using keyword and pattern matching.{' '}
            <strong className="text-amber-300">Review each value carefully</strong> — errors are common.
          </p>
        </div>
        <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 text-lg leading-none">
          ×
        </button>
      </div>

      {/* Warnings */}
      {warnings?.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-300 flex items-start gap-1.5">
              <span className="mt-0.5">⚠</span> {w}
            </p>
          ))}
        </div>
      )}

      {/* Field list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {extractedFields.map((field) => {
          const conf = CONFIDENCE_CONFIG[field.confidence] || CONFIDENCE_CONFIG.low
          const isAccepted = accepted[field.field_name] ?? false

          return (
            <div
              key={field.field_name}
              onClick={() => toggle(field.field_name)}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150
                ${isAccepted
                  ? 'bg-violet-500/10 border-violet-500/30'
                  : 'bg-space-900 border-white/5 opacity-60'
                }`}
            >
              {/* Checkbox */}
              <div className={`w-4 h-4 rounded flex-shrink-0 border mt-0.5 flex items-center justify-center transition-all
                ${isAccepted ? 'bg-violet-500 border-violet-500' : 'border-white/20 bg-space-800'}`}>
                {isAccepted && <span className="text-white text-xs">✓</span>}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-slate-300">
                    {FIELD_LABELS[field.field_name] || field.field_name}
                  </span>
                  <span className={`badge text-xs ${conf.cls}`} style={{fontSize:'10px', padding:'1px 6px'}}>
                    {conf.label}
                  </span>
                </div>
                <p className="text-xs text-white font-mono truncate">
                  {formatValue(field.value)}
                </p>
                {field.note && (
                  <p className="text-xs text-slate-500 mt-0.5">{field.note}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-slate-500">{acceptedCount} field(s) selected</p>
        <div className="flex gap-2">
          <button onClick={onDismiss} className="btn-secondary text-xs py-1.5 px-3">
            Skip
          </button>
          <button
            onClick={handleApply}
            disabled={acceptedCount === 0}
            className="btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
          >
            Apply {acceptedCount} Field{acceptedCount !== 1 ? 's' : ''} →
          </button>
        </div>
      </div>
    </div>
  )
}
