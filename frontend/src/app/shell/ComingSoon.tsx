import React from 'react'

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: '400px',
      color: '#475569',
      fontFamily: 'Inter, sans-serif'
    }}>
      <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>{title}</h2>
      <p style={{ fontSize: '16px' }}>This page is currently under construction by the team.</p>
      <div style={{
        marginTop: '32px',
        padding: '16px 24px',
        background: '#f8fafc',
        border: '1px dashed #cbd5e1',
        borderRadius: '8px'
      }}>
        Check back later in the next sprint!
      </div>
    </div>
  )
}
