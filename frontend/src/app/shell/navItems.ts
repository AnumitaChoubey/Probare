// navItems.ts — SHARED, additive only
// Rule: each person appends their own entry. Never reorder or delete another person's entry.
// Shape: { label: string; route: string; icon: string; requiredRoles: string[] }

export interface NavItem {
  label: string
  route: string
  icon: string          // icon name from your icon library (e.g. lucide-react)
  requiredRoles: string[] // any matching role code grants access
}

// ── P1: Foundation nav entries ────────────────────────────────────────────────
export const navItems: NavItem[] = [
  { label: 'Dashboard',      route: '/dashboard',   icon: 'LayoutDashboard', requiredRoles: ['AUD', 'QAL', 'OPS_AGT', 'OPS_MGR', 'ADMIN'] },
  { label: 'Log New Error',  route: '/errors/new',  icon: 'FilePlus',        requiredRoles: ['AUD'] },
]

// ── P4: Dashboards & Admin nav entries — Person 4 appends below ───────────────
// { label: 'Team Dashboard',       route: '/team-dashboard',       icon: 'BarChart2',   requiredRoles: ['QAL'] },
// { label: 'Ops Dashboard',        route: '/ops-dashboard',        icon: 'Activity',    requiredRoles: ['OPS_MGR'] },
// { label: 'Leadership Dashboard', route: '/leadership-dashboard', icon: 'TrendingUp',  requiredRoles: ['QA_GOV', 'ADMIN', 'AUDITOR_RO'] },
// { label: 'Escalations',          route: '/escalations',          icon: 'AlertTriangle', requiredRoles: ['QAL', 'QA_GOV'] },
// { label: 'Reports',              route: '/reports',              icon: 'FileText',    requiredRoles: ['QAL', 'QA_GOV', 'ADMIN', 'AUDITOR_RO'] },
// { label: 'Admin',                route: '/admin/lobs',           icon: 'Settings',    requiredRoles: ['ADMIN'] },
