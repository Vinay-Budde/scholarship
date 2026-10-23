/**
 * components/ResultsDashboard.jsx — Full results view after agents complete.
 *
 * Sections:
 *   1. Summary stats
 *   2. Top 5 recommended opportunities
 *   3. All opportunities (expandable)
 *   4. SOP + Application checklists
 */

import { useState } from 'react'
import OpportunityCard from './OpportunityCard'
import SOPPanel from './SOPPanel'

export default function ResultsDashboard({ results, onReset }) {
  const [showAll, setShowAll] = useState(false)
  const [activeSection, setActiveSection] = useState('top')

  if (!results) return null

  const { top_opportunities, opportunities, sop, checklists, is_demo } = results
  const allOpps = opportunities || []
  const topOpps = top_opportunities || []
  const displayedAll = showAll ? allOpps : allOpps.slice(0, 5)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Demo banner */}
      {is_demo && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-sm text-amber-200">
          <strong>⚠️ Demo Mode Results</strong> — These are pre-loaded example opportunities for UI demonstration.
          They are <em>not</em> the result of real-time AI research. To get live personalized results,
          add your API keys to <code className="bg-black/30 px-1 rounded text-xs">backend/.env</code> and restart the backend.
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '🔍', label: 'Found', value: allOpps.length, sub: 'programs' },
          { icon: '🏆', label: 'Top Match', value: topOpps[0]?.match_score ? `${Math.round(topOpps[0].match_score)}%` : '—', sub: 'score' },
          { icon: '💰', label: 'With Funding', value: allOpps.filter(o => o.funding_type !== 'unknown').length, sub: 'opportunities' },
          { icon: '✅', label: 'Eligible', value: allOpps.filter(o => ['eligible', 'likely_eligible'].includes(o.eligibility_status)).length, sub: 'programs' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-4 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="font-display text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.label} {stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 p-1 bg-space-900 rounded-xl border border-white/5 overflow-x-auto">
        {[
          { id: 'top', label: '🏆 Top 5 Picks' },
          { id: 'all', label: `🔍 All (${allOpps.length})` },
          { id: 'coach', label: '✍️ SOP & Checklists' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)}
            className={`flex-1 min-w-fit py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${activeSection === tab.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top 5 */}
      {activeSection === 'top' && (
        <div className="space-y-4">
          <div>
            <h2 className="section-title">🏆 Top 5 Recommended Programs</h2>
            <p className="section-subtitle">Ranked by match score — eligibility, funding, fit, and deadlines.</p>
          </div>
          {topOpps.length === 0 ? (
            <EmptyState message="No top recommendations yet. The agents may still be working." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {topOpps.slice(0, 5).map((opp, i) => (
                <OpportunityCard key={opp.id} opp={opp} rank={i + 1} isTop />
              ))}
            </div>
          )}
        </div>
      )}

      {/* All opportunities */}
      {activeSection === 'all' && (
        <div className="space-y-4">
          <div>
            <h2 className="section-title">🔍 All Researched Opportunities</h2>
            <p className="section-subtitle">
              {allOpps.length} programs found · sorted by match score
            </p>
          </div>
          {allOpps.length === 0 ? (
            <EmptyState message="No opportunities found yet." />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {displayedAll.map((opp, i) => (
                  <OpportunityCard key={opp.id} opp={opp} rank={i + 1} isTop={false} />
                ))}
              </div>
              {allOpps.length > 5 && (
                <button onClick={() => setShowAll(s => !s)} className="btn-secondary w-full justify-center">
                  {showAll ? 'Show less ↑' : `Show all ${allOpps.length} opportunities ↓`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* SOP & Checklists */}
      {activeSection === 'coach' && (
        <div className="space-y-4">
          <div>
            <h2 className="section-title">✍️ Application Coach</h2>
            <p className="section-subtitle">Personalized Statement of Purpose + application checklists for each program.</p>
          </div>
          <SOPPanel sop={sop} checklists={checklists} />
        </div>
      )}

      {/* Start over */}
      <div className="text-center pt-4">
        <button onClick={onReset} className="btn-secondary">
          🔄 Research a New Profile
        </button>
      </div>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center glass-card">
      <div className="text-4xl mb-3 opacity-40">🔍</div>
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  )
}
