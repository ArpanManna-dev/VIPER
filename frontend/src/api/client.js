/**
 * VIPER API client.
 * All calls return { data, error } — never throw raw.
 * Base URL from VITE_API_URL env var (default: http://localhost:8000)
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL })

const wrap = async (fn) => {
  try {
    const res = await fn()
    return { data: res.data, error: null }
  } catch (err) {
    return { data: null, error: err.response?.data?.detail || err.message }
  }
}

/** POST /audit/start → { session_id, status, ... } */
export const startAudit = (targetUrl) =>
  wrap(() => api.post('/audit/start', { target_url: targetUrl }))

/** GET /audit/status/{id} → AuditStatus */
export const getStatus = (sessionId) =>
  wrap(() => api.get(`/audit/status/${sessionId}`))

/** GET /report/{id} → VulnerabilityReport */
export const getReport = (sessionId) =>
  wrap(() => api.get(`/report/${sessionId}`))

/** POST /chatbot/message → { response } */
export const sendChatbotMessage = (message, useSandboxed = false, patch = null) =>
  wrap(() => api.post('/chatbot/message', { message, use_sandboxed: useSandboxed, patch }))

/** Returns the SSE stream URL for a session (used by EventSource directly) */
export const getStreamUrl = (sessionId) =>
  `${BASE_URL}/audit/stream/${sessionId}`
