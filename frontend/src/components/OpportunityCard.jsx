/**
 * components/OpportunityCard.jsx — A single scholarship opportunity card.
 *
 * Shows all key info: university, program, funding, deadline, eligibility,
 * match score, and links to official sources.
 */

const ELIGIBILITY_CONFIG = {
  eligible:          { label: 'Eligible',          cls: 'badge-green'  },
  likely_eligible:   { label: 'Likely Eligible',   cls: 'badge-cyan'   },
  missing_info:      { label: 'Missing Info',       cls: 'badge-yellow' },
  likely_ineligible: { label: 'Likely Ineligible',  cls: 'badge-red'    },
  ineligible:        { label: 'Not Eligible',       cls: 'badge-red'    },
  unverified:        { label: 'Unverified',         cls: 'badge-gray'   },
}

const FUNDING_CONFIG = {
  full:           { label: 'Full Funding',      cls: 'badge-green'  },
  partial:        { label: 'Partial Funding',   cls: 'badge-cyan'   },
  tuition_waiver: { label: 'Tuition Waiver',   cls: 'badge-violet' },
  stipend_only:   { label: 'Stipend Only',      cls: 'badge-violet' },
  unknown:        { label: 'Funding Unknown',   cls: 'badge-gray'   },
}

function ScoreRing({ score }) {
  const pct = score ?? 0
  const r = 20
  const circ = 2 * Math.PI * r
  const dashOffset = circ - (pct / 100) * circ
  const color = pct >= 80 ? '#34d399' : pct >= 60 ? '#22d3ee' : '#fbbf24'

  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={dashOffset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {Math.round(pct)}
      </span>
    </div>
  )
}

export default function OpportunityCard({ opp, rank, isTop }) {
  const eligibility = ELIGIBILITY_CONFIG[opp.eligibility_status] || ELIGIBILITY_CONFIG.unverified
  const funding = FUNDING_CONFIG[opp.funding_type] || FUNDING_CONFIG.unknown

  return (
    <div className={`glass-card-hover p-5 space-y-4 relative overflow-hidden ${isTop ? 'border-violet-500/25' : ''}`}>
      {/* Top rank ribbon */}
      {isTop && rank <= 3 && (
        <div className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-xl"
          style={{ background: rank === 1 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : rank === 2 ? 'linear-gradient(135deg,#94a3b8,#64748b)' : 'linear-gradient(135deg,#b45309,#92400e)' }}>
          #{rank} {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <ScoreRing score={opp.match_score} />
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-white text-base leading-tight">
            {opp.program_name}
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {opp.university_name} · {opp.city}, {opp.country}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={eligibility.cls}>{eligibility.label}</span>
            <span className={funding.cls}>{funding.label}</span>
            {opp.is_demo && <span className="badge badge-gray">Demo</span>}
          </div>
        </div>
      </div>

      {/* Funding details */}
      {opp.funding_notes && (
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <p className="text-xs text-emerald-300 leading-relaxed">💰 {opp.funding_notes}</p>
        </div>
      )}

      {/* Key details grid */}
      <div className="grid grid-cols-2 gap-3">
        {opp.application_deadline && (
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Deadline</p>
            <p className="text-xs font-medium text-white flex items-center gap-1">
              📅 {opp.application_deadline}
              {!opp.deadline_verified && <span className="text-amber-400" title="Not verified from official source">*</span>}
            </p>
          </div>
        )}
        {opp.min_cgpa && (
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Min GPA</p>
            <p className="text-xs font-medium text-white">
              {opp.min_cgpa}/{opp.cgpa_scale}
            </p>
          </div>
        )}
        {opp.language_requirements && Object.keys(opp.language_requirements).length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-0.5">English</p>
            <p className="text-xs font-medium text-white">
              {Object.entries(opp.language_requirements).map(([k, v]) => `${k} ≥ ${v}`).join(', ')}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Confidence</p>
          <p className="text-xs font-medium text-white">{Math.round((opp.confidence || 0) * 100)}%</p>
        </div>
      </div>

      {/* Match reasons */}
      {opp.match_reasons?.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Why it matches</p>
          <ul className="space-y-1">
            {opp.match_reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                <span className="text-emerald-400 mt-0.5">✓</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing requirements */}
      {opp.missing_requirements?.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
          <p className="text-xs text-amber-400 font-medium mb-1">⚠ Missing / To confirm</p>
          <ul className="space-y-1">
            {opp.missing_requirements.map((r, i) => (
              <li key={i} className="text-xs text-amber-300">• {r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Concerns */}
      {opp.concerns?.length > 0 && (
        <div>
          {opp.concerns.map((c, i) => (
            <p key={i} className="text-xs text-slate-500">⚠ {c}</p>
          ))}
        </div>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-2 pt-1">
        {opp.program_url && (
          <a href={opp.program_url} target="_blank" rel="noopener noreferrer"
            className="btn-secondary text-xs py-1.5 px-3">
            🔗 Program Page
          </a>
        )}
        {opp.scholarship_url && (
          <a href={opp.scholarship_url} target="_blank" rel="noopener noreferrer"
            className="btn-secondary text-xs py-1.5 px-3">
            🎓 Scholarship Info
          </a>
        )}
      </div>

      {/* Data quality footnote */}
      {!opp.data_verified && (
        <p className="text-xs text-slate-600 border-t border-white/5 pt-2">
          * Data not independently verified from official sources. Always confirm details at the official website.
        </p>
      )}
    </div>
  )
}
