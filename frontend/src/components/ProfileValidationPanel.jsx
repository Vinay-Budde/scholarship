/**
 * components/ProfileValidationPanel.jsx
 *
 * Shows validation errors, warnings, and a completeness score
 * for the student profile before starting the research workflow.
 */

export default function ProfileValidationPanel({ validation, onDismiss }) {
  if (!validation) return null

  const { errors, warnings, info, completeness_score, completeness_notes } = validation

  const scoreColor =
    completeness_score >= 80 ? 'text-emerald-400' :
    completeness_score >= 50 ? 'text-amber-400' :
    'text-rose-400'

  const scoreBarColor =
    completeness_score >= 80 ? 'from-emerald-500 to-emerald-400' :
    completeness_score >= 50 ? 'from-amber-500 to-amber-400' :
    'from-rose-500 to-rose-400'

  return (
    <div className="glass-card p-5 space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-white text-sm">📊 Profile Completeness</h3>
        {onDismiss && (
          <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 text-lg">×</button>
        )}
      </div>

      {/* Score bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-400">Completeness Score</span>
          <span className={`text-lg font-bold font-display ${scoreColor}`}>{completeness_score}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${completeness_score}%`,
              background: `linear-gradient(90deg, ${completeness_score >= 80 ? '#10b981,#34d399' : completeness_score >= 50 ? '#f59e0b,#fbbf24' : '#f43f5e,#fb7185'})`,
            }}
          />
        </div>
      </div>

      {/* Errors (blockers) */}
      {errors?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-rose-400">⛔ Issues to fix</p>
          {errors.map((e, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <p className="text-xs text-rose-300">{e.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-amber-400">⚠ Recommendations</p>
          {warnings.map((w, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/15">
              <p className="text-xs text-amber-300">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Info / suggestions */}
      {info?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400">💡 Improve your profile</p>
          {info.map((item, i) => (
            <p key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
              <span className="text-violet-400 mt-0.5">→</span> {item.message}
            </p>
          ))}
        </div>
      )}

      {/* Completeness tips */}
      {completeness_notes?.length > 0 && (
        <div className="pt-1 border-t border-white/5">
          <p className="text-xs text-slate-500 mb-1">To boost your score:</p>
          <div className="flex flex-wrap gap-1.5">
            {completeness_notes.map((note, i) => (
              <span key={i} className="badge badge-violet text-xs">{note}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
