import React, { useState, useRef, useEffect } from 'react'
import { colors, radius, shadow, fontSize } from './tokens'

interface TooltipProps {
  content: string
  children: React.ReactElement
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  const placementStyle: Record<string, React.CSSProperties> = {
    top:    { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 },
    bottom: { top: '100%',   left: '50%', transform: 'translateX(-50%)', marginTop: 6 },
    left:   { right: '100%', top: '50%',  transform: 'translateY(-50%)', marginRight: 6 },
    right:  { left: '100%',  top: '50%',  transform: 'translateY(-50%)', marginLeft: 6 },
  }

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span style={{
          position: 'absolute', zIndex: 2000, whiteSpace: 'nowrap',
          background: colors.navBg, color: '#f8fafc',
          padding: '4px 10px', borderRadius: radius.sm,
          fontSize: fontSize.xs, boxShadow: shadow.md,
          ...placementStyle[placement],
        }}>
          {content}
        </span>
      )}
    </span>
  )
}
