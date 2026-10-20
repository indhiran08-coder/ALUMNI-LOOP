// ====================================================================
// AlumniLoop — Realtime API Client
// File: src/lib/api.ts
// ====================================================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
export const API_BASE = `${BACKEND_URL}/api`

/**
 * Fetch from the API backend.
 * - Returns parsed JSON on 2xx success.
 * - Throws an Error with the server message on 4xx/5xx (so callers can show it to the user).
 * - Returns null if the backend is unreachable (offline / network error).
 */
export async function fetchFromAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!res.ok) {
      // Try to parse the error body for a useful message
      let errorMessage = `Request failed with status ${res.status}`
      try {
        const errBody = await res.json()
        if (errBody?.error) errorMessage = errBody.error
      } catch {
        // ignore JSON parse failure
      }
      throw new Error(errorMessage)
    }

    return (await res.json()) as T
  } catch (err) {
    if (err instanceof TypeError) {
      // Backend server is unreachable or offline — silently fall through to next layer
      return null
    }
    // Re-throw API errors (4xx/5xx) so the caller can display them
    throw err
  }
}
