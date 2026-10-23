/**
 * hooks/useResearchSession.js — Orchestrates the full research workflow.
 *
 * This hook manages:
 *   1. Submitting the student profile to the backend
 *   2. Subscribing to the SSE event stream
 *   3. Fetching final results when the workflow completes
 *   4. All loading / error / retry states
 */

import { useState, useCallback, useEffect } from 'react'
import { startResearch, getResults } from '../api/client'
import { useSSE } from './useSSE'

export function useResearchSession() {
  const [sessionId, setSessionId] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | submitting | streaming | done | error
  const [results, setResults] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [isDemo, setIsDemo] = useState(false)

  const { events, isConnected, isDone, error: sseError } = useSSE(sessionId)

  // When SSE signals completion, fetch the full results
  useEffect(() => {
    if (isDone && sessionId) {
      setPhase('done')
      getResults(sessionId)
        .then(setResults)
        .catch(err => {
          console.error('Failed to fetch results:', err)
          setSubmitError('Results are ready but could not be loaded. Please refresh.')
        })
    }
  }, [isDone, sessionId])

  // Update phase while streaming
  useEffect(() => {
    if (sessionId && isConnected) {
      setPhase('streaming')
    }
  }, [sessionId, isConnected])

  const startSession = useCallback(async (profile) => {
    setSubmitError(null)
    setResults(null)
    setPhase('submitting')

    try {
      const response = await startResearch(profile)
      setSessionId(response.session_id)
      setIsDemo(response.is_demo)
      setPhase('streaming')
    } catch (err) {
      setSubmitError(err.message || 'Failed to start research. Is the backend running?')
      setPhase('error')
    }
  }, [])

  const reset = useCallback(() => {
    setSessionId(null)
    setPhase('idle')
    setResults(null)
    setSubmitError(null)
    setIsDemo(false)
  }, [])

  return {
    phase,
    sessionId,
    events,
    isConnected,
    results,
    isDemo,
    error: submitError || sseError,
    startSession,
    reset,
  }
}
