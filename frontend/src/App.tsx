import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './app/shell/AppShell'

// ── P1: Foundation routes — added by Person 1 ────────────────────────────────
import LoginPage from './features/person1_foundation/LoginPage'
import AuditorDashboard from './features/person1_foundation/AuditorDashboard'
import LogNewErrorForm from './features/person1_foundation/LogNewErrorForm'
import ErrorDetail from './features/person1_foundation/ErrorDetail'
import AdminLayout from './features/person4_dashboards_admin/admin/AdminLayout'

// ── P2: Rebuttal & Decision routes — Person 2 adds one route line here ────────
// (no top-level routes needed — P2's components slot into ErrorDetail tabs)

// ── P3: Evidence & Notifications routes — Person 3 adds one route line here ───
// (no top-level routes needed — P3's components slot into ErrorDetail tabs + TopBar)

// ── P4: Dashboards & Admin routes — Person 4 adds one route line per screen ──
import TeamDashboard from './features/person4_dashboards_admin/dashboards/TeamDashboard'
import OpsDashboard from './features/person4_dashboards_admin/dashboards/OpsDashboard'
import LeadershipDashboard from './features/person4_dashboards_admin/dashboards/LeadershipDashboard'
import EscalationsView from './features/person4_dashboards_admin/escalations/EscalationsView'
// import { ReportsExport } from './features/person4_dashboards_admin/reports/ReportsExport'
// import { LobsCategories } from './features/person4_dashboards_admin/admin/LobsCategories'
// import { OwnershipMapping } from './features/person4_dashboards_admin/admin/OwnershipMapping'
// import { SlaRules } from './features/person4_dashboards_admin/admin/SlaRules'
// import { EscalationMatrix } from './features/person4_dashboards_admin/admin/EscalationMatrix'
// import { WorkingHoursHolidays } from './features/person4_dashboards_admin/admin/WorkingHoursHolidays'
// import { UsersRoles } from './features/person4_dashboards_admin/admin/UsersRoles'
// import { ConfigHistory } from './features/person4_dashboards_admin/admin/ConfigHistory'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route — no shell wrapper */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── P1: Foundation routes ─────────────────────────────────────────── */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"    element={<AuditorDashboard />} />
          <Route path="/errors/new"   element={<LogNewErrorForm />} />
          <Route path="/errors/:id"   element={<ErrorDetail />} />

          {/* ── P4: Dashboards & Admin routes — Person 4 appends here ──────── */}
          <Route path="/team-dashboard" element={<TeamDashboard />} />
          <Route path="/ops-dashboard" element={<OpsDashboard />} />
          <Route path="/leadership-dashboard" element={<LeadershipDashboard />} />
          <Route path="/admin" element={<AdminLayout />} />
          <Route path="/escalations" element={<EscalationsView />} />
          {/* <Route path="/reports"              element={<ReportsExport />} /> */}
          {/* <Route path="/admin/lobs"           element={<LobsCategories />} /> */}
          {/* <Route path="/admin/ownership"      element={<OwnershipMapping />} /> */}
          {/* <Route path="/admin/sla-rules"      element={<SlaRules />} /> */}
          {/* <Route path="/admin/escalation"     element={<EscalationMatrix />} /> */}
          {/* <Route path="/admin/working-hours"  element={<WorkingHoursHolidays />} /> */}
          {/* <Route path="/admin/users"          element={<UsersRoles />} /> */}
          {/* <Route path="/admin/config-history" element={<ConfigHistory />} /> */}
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}