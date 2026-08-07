// navItems.ts — SHARED, additive only
// Rule: each person appends their own entry. Never reorder or delete another person's entry.
// Shape: { label: string; route: string; icon: string; requiredRoles: string[] }

export interface NavItem {
  label: string
  route: string
  icon: string
  requiredRoles: string[]
}

// ── P1: Foundation nav entries ────────────────────────────────────────────────
export const navItems: NavItem[] = [
  { label: 'Dashboard',      route: '/dashboard',   icon: 'LayoutDashboard', requiredRoles: ['AUD', 'QAL', 'OPS_AGT', 'OPS_MGR', 'ADMIN'] },
  { label: 'Log New Error',  route: '/errors/new',  icon: 'FilePlus',        requiredRoles: ['AUD'] },

  // ── P4: Dashboards & Admin nav entries ──────────────────────────────────────
  // All three "Dashboard" labels are intentionally the same string — role
  // filtering below means a given logged-in user only ever sees ONE of
  // these three at a time, so there's no ambiguity, and it matches the
  // reference's single generic "Dashboard" item instead of spelling out
  // which variant (cleaner, more consistent with the rest of the sidebar).
  { label: 'Dashboard', route: '/team-dashboard',       icon: 'BarChart2',  requiredRoles: ['QAL'] },
  { label: 'Dashboard', route: '/ops-dashboard',        icon: 'Activity',   requiredRoles: ['OPS_MGR'] },
  { label: 'Dashboard', route: '/leadership-dashboard', icon: 'TrendingUp', requiredRoles: ['QA_GOV', 'ADMIN', 'AUDITOR_RO'] },

  { label: 'Escalations', route: '/escalations', icon: 'AlertTriangle', requiredRoles: ['QAL', 'QA_GOV'] },
  { label: 'Reports',     route: '/reports',     icon: 'FileText',      requiredRoles: ['QAL', 'QA_GOV', 'ADMIN', 'AUDITOR_RO'] },

  // Single entry — leads to an admin landing page with its own internal
  // tabs for LOBs/Categories, Ownership Mapping, SLA Rules, Escalation
  // Matrix, Working Hours & Holidays, Users & Roles, and Config History.
  // Do NOT add 7 separate top-level nav items for these — see AdminLayout
  // pattern note below.
  { label: 'Admin', route: '/admin', icon: 'Settings', requiredRoles: ['ADMIN'] },
]