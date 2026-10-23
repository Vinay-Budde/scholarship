/**
 * components/AgentActivityFeed.jsx — Live agent event stream display.
 *
 * Shows a real-time feed of what each AI agent is doing,
 * with status indicators, timing, and progress.
 */

const AGENT_META = {
  researcher: { label: 'Researcher Agent', icon: '🔍', color: 'cyan' },
  eligibility_verifier: { label: 'Eligibility Verifier', icon: '🔎', color: 'violet' },
  opportunity_matcher: { label: 'Opportunity Matcher', icon: '🏆', color: 'amber' },
  application_coach: { label: 'Application Coach', icon: '✍️', color: 'emerald' },
}

const STATUS_COLORS = {
  pending: 'text-slate-500',
  running: 'text-amber-400',
  done: 'text-emerald-400',
  failed: 'text-rose-400',
  skipped: 'text-slate-500',
}

const STATUS_LABELS = {
  pending: 'Waiting',
  running: 'Working…',
  done: 'Done',
  failed: 'Failed',
  skipped: 'Skipped',
}

function AgentStatusRow({ agentKey, status }) {
  const meta = AGENT_META[agentKey] || { label: agentKey, icon: '🤖', color: 'slate' }
  const colorClass = STATUS_COLORS[status] || 'text-slate-500'

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2.5">
        <span className="text-lg">{meta.icon}</span>
        <span className="text-sm font-medium text-slate-200">{meta.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {status === 'running' && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
        {status === 'done' && (
          <span className="text-emerald-400 text-sm">✓</span>
        )}
        {status === 'failed' && (
          <span className="text-rose-400 text-sm">✗</span>
        )}
        <span className={`text-xs font-medium ${colorClass}`}>
          {STATUS_LABELS[status] || status}
        </span>
      </div>
    </div>
  )
}

export default function AgentActivityFeed({ events, agentStatuses, isConnected, phase, isDemo }) {
  const agentOrder = ['researcher', 'eligibility_verifier', 'opportunity_matcher', 'application_coach']

  // Count done agents for progress
  const doneCount = agentOrder.filter(a => agentStatuses?.[a] === 'done').length
  const progress = agentStatuses ? (doneCount / agentOrder.length) * 100 : 0

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-5xl mb-4 opacity-40 animate-float">🤖</div>
        <p className="text-slate-500 text-sm">
          Fill in your profile and click<br />
          <strong className="text-slate-400">🚀 Start AI Research</strong> to activate the agents.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Demo mode warning */}
      {isDemo && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          ⚠️ <strong>Demo Mode</strong> — No real API keys configured. Results are clearly labeled example data.
          Add <code className="bg-black/30 px-1 rounded">OPENAI_API_KEY</code> and <code className="bg-black/30 px-1 rounded">TAVILY_API_KEY</code> to <code className="bg-black/30 px-1 rounded">backend/.env</code> for live research.
        </div>
      )}

      {/* Overall progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Workflow Progress</span>
          <span>{doneCount} / {agentOrder.length} agents complete</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Agent status rows */}
      {agentStatuses && (
        <div className="glass-card p-4">
          {agentOrder.map(key => (
            <AgentStatusRow key={key} agentKey={key} status={agentStatuses[key] || 'pending'} />
          ))}
        </div>
      )}

      {/* Live event log */}
      {events.length > 0 && (
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {[...events].reverse().map((event, i) => (
            <div key={i} className="flex gap-2.5 py-1.5 animate-fade-in">
              <span className={`agent-dot mt-1.5
                ${event.status === 'running' ? 'agent-dot-running' : ''}
                ${event.status === 'done'    ? 'agent-dot-done'    : ''}
                ${event.status === 'failed'  ? 'agent-dot-failed'  : ''}
                ${event.status === 'pending' ? 'agent-dot-pending' : ''}
              `} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 leading-snug">{event.message}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {AGENT_META[event.agent]?.label || event.agent} · {new Date(event.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connection status */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
        <span className="text-slate-500">
          {isConnected ? 'Live — receiving agent updates' : phase === 'done' ? 'Workflow complete' : 'Connecting…'}
        </span>
      </div>
    </div>
  )
}
