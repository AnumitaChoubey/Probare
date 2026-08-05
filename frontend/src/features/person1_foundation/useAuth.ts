// useAuth.ts — SHARED CONTRACT, owned + frozen by P1
//
// ⚠️  DO NOT change the shape of AuthUser or the return value of useAuth()
//     without notifying ALL 3 teammates.
//     Everyone's frontend reads from this hook.
//
import { useState, useCallback } from 'react'

export type RoleCode = 'AUD' | 'QAL' | 'OPS_AGT' | 'OPS_MGR' | 'ADMIN' | 'QA_GOV' | 'AUDITOR_RO'

export interface AuthUser {
  user_id: string
  full_name: string
  roles: RoleCode[]    // array of role codes the user holds
}

/** Token key in localStorage */
const TOKEN_KEY = 'qems_token'

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function parseUserFromToken(token: string): AuthUser | null {
  // TODO (P1 Sprint 1): decode JWT payload → extract user_id, full_name, roles
  // Example (replace with real JWT decode):
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      user_id:   payload.user_id  ?? '',
      full_name: payload.full_name ?? '',
      roles:     payload.roles    ?? [],
    }
  } catch {
    return null
  }
}

export interface UseAuthReturn {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  hasRole: (role: RoleCode) => boolean
  login: (token: string) => void
  logout: () => void
}

/**
 * useAuth — primary auth hook used across ALL 4 persons' components.
 *
 * Shape of AuthUser is frozen after Sprint 1:
 *   { user_id: string, full_name: string, roles: RoleCode[] }
 *
 * This matches the response shape of GET /me exactly:
 *   { "user_id": "uuid", "full_name": "Jane Doe", "roles": ["AUD"] }
 */
export function useAuth(): UseAuthReturn {
  const [token, setToken] = useState<string | null>(getStoredToken)
  const [user, setUser] = useState<AuthUser | null>(() => {
    const t = getStoredToken()
    return t ? parseUserFromToken(t) : null
  })

  const login = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    setUser(parseUserFromToken(newToken))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (role: RoleCode) => user?.roles.includes(role) ?? false,
    [user]
  )

  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    hasRole,
    login,
    logout,
  }
}
