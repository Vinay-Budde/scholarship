/**
 * hooks/useSSE.js — Subscribe to Server-Sent Events from the backend.
 *
 * What is an SSE? The browser keeps a long HTTP connection open to the server.
 * The server "pushes" text events over that connection whenever something happens.
 * This hook wraps the browser's built-in EventSource API.
 *
 * Usage:
 *   const { events, isConnected, isDone } = useSSE(sessionId)
 */

import { useState, useEffect, useRef } from 'react'

export function useSSE(sessionId) {
  const [events, setEvents] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState(null)
  const esRef = useRef(null)

  useEffect(() => {
    if (!sessionId) return

    // Clean up any existing connection
    if (esRef.current) {
      esRef.current.close()
    }

    const url = `/api/stream/${sessionId}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    // Handle named "agent_event" events
    es.addEventListener('agent_event', (e) => {
      try {
        const data = JSON.parse(e.data)
        setEvents(prev => [...prev, data])
      } catch {
        console.warn('Could not parse SSE event:', e.data)
      }
    })

    // Handle "workflow_complete" event
    es.addEventListener('workflow_complete', (e) => {
      setIsDone(true)
      setIsConnected(false)
      es.close()
    })

    // Handle "timeout" event
    es.addEventListener('timeout', () => {
      setError('The research timed out. Please try again.')
      setIsConnected(false)
      es.close()
    })

    es.onerror = () => {
      setError('Lost connection to the server. Results may still be loading.')
      setIsConnected(false)
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [sessionId])

  return { events, isConnected, isDone, error }
}
