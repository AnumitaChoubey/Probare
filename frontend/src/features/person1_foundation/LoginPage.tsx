import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { fetchLogin } from '../../lib/api/authApi'
import { Button } from '../../design-system/Button'
import { colors, radius, shadow } from '../../design-system/tokens'
import { useToast } from '../../design-system/Toast'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const data = await fetchLogin(username, password)
      login(data.access_token)
      addToast('success', 'Logged in successfully!')
      navigate('/dashboard')
    } catch (err: any) {
      addToast('error', err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: colors.shellBg, padding: 20
    }}>
      <div style={{
        background: colors.surface, padding: 40, borderRadius: radius.lg,
        boxShadow: shadow.lg, width: '100%', maxWidth: 400
      }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ margin: 0, color: colors.textPrimary, fontSize: 24 }}>Probare QEMS</h1>
          <p style={{ margin: '8px 0 0 0', color: colors.textSecondary, fontSize: 14 }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                padding: '10px 14px', borderRadius: radius.sm, border: `1px solid ${colors.border}`,
                fontSize: 14, outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = colors.primary}
              onBlur={(e) => e.target.style.borderColor = colors.border}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: '10px 14px', borderRadius: radius.sm, border: `1px solid ${colors.border}`,
                fontSize: 14, outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = colors.primary}
              onBlur={(e) => e.target.style.borderColor = colors.border}
            />
          </div>

          <Button type="submit" fullWidth loading={loading} style={{ marginTop: 10 }}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  )
}
