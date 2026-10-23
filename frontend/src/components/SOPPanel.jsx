/**
 * components/SOPPanel.jsx — Statement of Purpose display with checklist tabs.
 *
 * Shows the AI-generated SOP draft and per-university application checklists.
 */

import { useState } from 'react'

export default function SOPPanel({ sop, checklists }) {
  const [activeTab, setActiveTab] = useState('sop')
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sop?.draft || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!sop && (!checklists || checklists.length === 0)) return null

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-space-900 rounded-xl border border-white/5">
        <button
          onClick={() => setActiveTab('sop')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200
            ${activeTab === 'sop' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          ✍️ Statement of Purpose
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200
            ${activeTab === 'checklist' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          ✅ Checklists ({checklists?.length || 0})
        </button>
      </div>

      {/* SOP Tab */}
      {activeTab === 'sop' && sop && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">
                ~{sop.word_count} words
                {sop.tailored_for && <span className="ml-2 text-violet-400">· tailored for {sop.tailored_for}</span>}
              </p>
            </div>
            <button onClick={copyToClipboard} className="btn-secondary text-xs py-1.5 px-3">
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>

          <div className="glass-card p-5">
            <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
              {sop.draft}
            </pre>
          </div>

          {sop.notes?.length > 0 && (
            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
              <p className="text-sm font-medium text-violet-300 mb-2">💡 Coach Tips</p>
              <ul className="space-y-1.5">
                {sop.notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-violet-400 mt-0.5">→</span> {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Checklists Tab */}
      {activeTab === 'checklist' && (
        <div className="space-y-4 animate-fade-in">
          {checklists?.map((cl, i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div>
                <h3 className="font-display font-semibold text-white text-sm">{cl.program_name}</h3>
                <p className="text-xs text-slate-400">{cl.university_name}</p>
                {cl.deadline && (
                  <p className="text-xs text-amber-400 mt-1">📅 Deadline: {cl.deadline}</p>
                )}
              </div>
              <ul className="space-y-2">
                {cl.items.map((item, j) => (
                  <ChecklistItem key={j} text={item} />
                ))}
              </ul>
              {cl.application_url && (
                <a href={cl.application_url} target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-xs py-1.5 px-3 inline-flex">
                  🔗 Apply Now
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChecklistItem({ text }) {
  const [checked, setChecked] = useState(false)
  const isMissing = text.startsWith('[Missing]')

  return (
    <li className={`flex items-start gap-2.5 transition-opacity duration-200 ${checked ? 'opacity-50' : ''}`}>
      <button
        onClick={() => setChecked(c => !c)}
        className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all duration-150
          ${checked ? 'bg-emerald-500 border-emerald-500' : isMissing ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/20 bg-space-800 hover:border-violet-400'}`}
      >
        {checked && <span className="text-white text-xs">✓</span>}
      </button>
      <span className={`text-xs leading-relaxed
        ${isMissing ? 'text-amber-300' : 'text-slate-300'}
        ${checked ? 'line-through' : ''}`}>
        {text.replace('[Missing] ', '')}
        {isMissing && <span className="ml-1 text-amber-500 text-xs">(action required)</span>}
      </span>
    </li>
  )
}
