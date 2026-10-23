/**
 * App.jsx — Root application component.
 *
 * Layout:
 *   - Fixed header with logo + status badge
 *   - Two-column layout:
 *     Left:  Student profile form (input)
 *     Right: Agent activity feed (live progress)
 *   - Full-width results dashboard (shown after completion)
 */

import { useState, useEffect } from 'react'
import ProfileForm from './components/ProfileForm'
import AgentActivityFeed from './components/AgentActivityFeed'
import ResultsDashboard from './components/ResultsDashboard'
import { useResearchSession } from './hooks/useResearchSession'
import { checkHealth } from './api/client'

export default function App() {
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState(false)

  const {
    phase,
    events,
    isConnected,
    results,
    isDemo,
    error,
    startSession,
    reset,
  } = useResearchSession()

  // Check backend health on load
  useEffect(() => {
    checkHealth()
      .then(h => setHealth(h))
      .catch(() => setHealthError(true))
  }, [])

  const agentStatuses = events.reduce((acc, e) => {
    acc[e.agent] = e.status
    return acc
  }, {})

  const isLoading = phase === 'submitting' || phase === 'streaming'
  const showResults = phase === 'done' && results

  return (
    <div className="min-h-screen bg-space-950 relative">
      {/* Background orbs */}
      <div className="orb orb-violet" aria-hidden="true" />
      <div className="orb orb-cyan" aria-hidden="true" />

      <div className="relative z-10">
        {/* ── Header ───────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-white/5 bg-space-950/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
                🐝
              </div>
              <div>
                <h1 className="font-display font-bold text-white text-base leading-tight">ScholarSwarm AI</h1>
                <p className="text-slate-500 text-xs">AI Scholarship Finder · TetraNoodle Hackathon 2026</p>
              </div>
            </div>

            {/* Backend status badge */}
            <div className="flex items-center gap-2">
              {healthError ? (
                <span className="badge badge-red">⚠ Backend offline</span>
              ) : health ? (
                <span className={`badge ${health.fully_configured ? 'badge-green' : 'badge-yellow'}`}>
                  {health.fully_configured ? '✓ AI Ready' : '⚠ Demo Mode'}
                </span>
              ) : (
                <span className="badge badge-gray">Connecting…</span>
              )}
            </div>
          </div>
        </header>

        {/* ── Hero ─────────────────────────────────────────── */}
        {phase === 'idle' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-6 animate-fade-in">
              🚀 AI Agent Swarm · 4 Specialized Agents · Real-time Research
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Find Your{' '}
              <span className="gradient-text">Perfect Scholarship</span>
              <br />Abroad with AI
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Four AI agents work together to research 10+ real programs,
              verify your eligibility, rank the best matches, and draft your statement of purpose.
            </p>
          </section>
        )}

        {/* ── Main content ──────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          {!showResults ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: Profile Form */}
              <div className="lg:col-span-3">
                <div className="glass-card p-6">
                  <div className="mb-6">
                    <h2 className="section-title">📋 Your Profile</h2>
                    <p className="section-subtitle">
                      Tell us about yourself so the agents can find the best matches.
                    </p>
                  </div>
                  <ProfileForm
                    onSubmit={startSession}
                    isLoading={isLoading}
                  />
                </div>
              </div>

              {/* Right: Agent Activity + error */}
              <div className="lg:col-span-2 space-y-4">
                <div className="glass-card p-6">
                  <div className="mb-5">
                    <h2 className="section-title">🤖 Agent Activity</h2>
                    <p className="section-subtitle">Live progress from the AI swarm</p>
                  </div>
                  <AgentActivityFeed
                    events={events}
                    agentStatuses={agentStatuses}
                    isConnected={isConnected}
                    phase={phase}
                    isDemo={isDemo}
                  />
                </div>

                {/* Error state */}
                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-fade-in">
                    <p className="text-sm font-medium text-rose-400 mb-1">⚠ Something went wrong</p>
                    <p className="text-xs text-rose-300">{error}</p>
                    <button onClick={reset} className="btn-secondary text-xs mt-3">
                      🔄 Try again
                    </button>
                  </div>
                )}

                {/* How it works */}
                {phase === 'idle' && (
                  <div className="glass-card p-5 space-y-3">
                    <p className="text-sm font-semibold text-white">How it works</p>
                    {[
                      { n: '1', icon: '🔍', title: 'Researcher Agent', desc: 'Searches for 10+ matching programs and scholarships from real sources' },
                      { n: '2', icon: '🔎', title: 'Eligibility Verifier', desc: 'Checks requirements, deadlines, and funding for your specific profile' },
                      { n: '3', icon: '🏆', title: 'Opportunity Matcher', desc: 'Ranks all opportunities by academic fit, affordability, and career goals' },
                      { n: '4', icon: '✍️', title: 'Application Coach', desc: 'Generates a personalized SOP draft and application checklist' },
                    ].map(step => (
                      <div key={step.n} className="flex gap-3">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400 flex-shrink-0">
                          {step.n}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">{step.icon} {step.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Backend config warning */}
                {health && !health.fully_configured && (
                  <div className="p-4 rounded-xl bg-space-800 border border-amber-500/20 text-xs text-slate-400 space-y-2">
                    <p className="font-medium text-amber-300">⚠ Running in Demo Mode</p>
                    <p>Missing API keys: {health.missing_keys?.join(', ')}</p>
                    <p>See <code className="bg-black/30 px-1 rounded">.env.example</code> for setup instructions.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-6">
              <ResultsDashboard results={results} onReset={reset} />
            </div>
          )}
        </main>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-600">
          ScholarSwarm AI · TetraNoodle AI Hackathon 2026 ·{' '}
          <span className="text-slate-500">Never submits applications automatically · Always cite official sources</span>
        </footer>
      </div>
    </div>
  )
}
