// LeftNav.tsx — P1 owns this file. Others only append entries to navItems.ts.

import React from 'react'
import { NavLink } from 'react-router-dom'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { navItems } from './navItems'

interface LeftNavProps {
  userRoles: string[]
}

export default function LeftNav({ userRoles }: LeftNavProps) {
  const visible = navItems.filter(
    (item) => item.requiredRoles.some((role) => userRoles.includes(role))
  )

  return (
    <nav style={{
      width: 220, background: '#0f172a', color: '#94a3b8',
      display: 'flex', flexDirection: 'column', padding: '24px 0',
      minHeight: '100%',
    }}>
      {visible.map((item) => {
       
        const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[item.icon]

        return (
          <NavLink
            key={item.route}
            to={item.route}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', fontSize: 14, textDecoration: 'none',
              color: isActive ? '#f8fafc' : '#94a3b8',
              background: isActive ? '#1e293b' : 'transparent',
              borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
              transition: 'all 0.15s',
            })}
          >
            {IconComponent
              ? <IconComponent size={18} strokeWidth={1.8} />
              : <span style={{ width: 18, height: 18, display: 'inline-block', borderRadius: 999, background: '#475569' }} />
            }
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}