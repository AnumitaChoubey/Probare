import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import TopBar from './TopBar'
import LeftNav from './LeftNav'
import Footer from './Footer'
import { useAuth } from '../../features/person1_foundation/useAuth'

/**
 * AppShell — wraps every authenticated page.
 * Renders TopBar + LeftNav + main content area + Footer.
 * The <Outlet /> is where page-level route components render.
 *
 * P1 owns this file. Do not edit unless you are Person 1.
 */
export default function AppShell() {
<<<<<<< HEAD
  // TODO (P1 — Sprint 1): replace with real useAuth() data
  const userFullName = ''
  const userRoles: string[] = ['OPS_MGR', 'QAL', 'QA_GOV', 'ADMIN', 'AUDITOR_RO', 'AUD']
  const handleLogout = () => { /* clear token, navigate to /login */ }
=======
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userFullName = user?.full_name || ''
  const userRoles = user?.roles || []
>>>>>>> main

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar userFullName={userFullName} onLogout={handleLogout} />
      <div style={{ display: 'flex', flex: 1 }}>
        <LeftNav userRoles={userRoles} />
        <main style={{ flex: 1, padding: 24, background: '#f1f5f9', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}
