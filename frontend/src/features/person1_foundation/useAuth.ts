// useAuth.ts — SHARED CONTRACT, owned + frozen by P1
//
// ⚠️  DO NOT change the shape of AuthUser or the return value of useAuth()
//     without notifying ALL 3 teammates.
//     Everyone's frontend reads from this hook.
//
// Phase 0 (Desktop migration): token storage is now handled via keytar through
// the Electron preload bridge (window.qemsDesktop) when running inside the
// desktop app. Falls back to localStorage transparently so the Vercel web
// deployment continues to work without any changes.
//
import { useState, useCallback } from 'react'

export type RoleCode = 'AUD' | 'QAL' | 'OPS_AGT' | 'OPS_MGR' | 'ADMIN' | 'QA_GOV' | 'AUDITOR_RO'

export interface AuthUser {
  user_id: string
  full_name: string
  roles: RoleCode[]    // array of role codes the user holds
}

/** Token key — used as the keytar account name and the localStorage key */
const TOKEN_KEY = 'qems_token'

/** True when running inside the Electron desktop app */
const isElectron = (): boolean => typeof window !== 'undefined' && !!(window as any).qemsDesktop

/** Read the auth token — from keytar (Electron) or localStorage (web) */
function getStoredToken(): string | null {
  // NOTE: keytar is async but this sync path is only called on initial render
  // (the async path below is used for login/logout). On first load in Electron,
  // we briefly return null until the async effect in useAuth() populates state.
  if (isElectron()) return null  // will be populated asynchronously
  return localStorage.getItem(TOKEN_KEY)
}

function parseUserFromToken(token: string): AuthUser | null {
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

  // In Electron, seed the token from keytar on first mount (async)
  useState(() => {
    if (isElectron()) {
      ;(window as any).qemsDesktop.getSecureToken(TOKEN_KEY).then((storedToken: string | null) => {
        if (storedToken) {
          setToken(storedToken)
          setUser(parseUserFromToken(storedToken))
        }
      })
    }
  })

  const login = useCallback((newToken: string) => {
    if (isElectron()) {
      // Store securely in OS keychain via Electron preload bridge
      ;(window as any).qemsDesktop.setSecureToken(TOKEN_KEY, newToken)
    } else {
      localStorage.setItem(TOKEN_KEY, newToken)
    }
    setToken(newToken)
    setUser(parseUserFromToken(newToken))
  }, [])

  const logout = useCallback(() => {
    if (isElectron()) {
      ;(window as any).qemsDesktop.clearSecureToken(TOKEN_KEY)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
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
