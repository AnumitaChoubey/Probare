import React from 'react'

export default function Footer() {
  return (
    <footer style={{
      height: 40, background: '#1e293b', color: '#475569',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12,
    }}>
      QEMS — Quality Error Management System &copy; {new Date().getFullYear()}
    </footer>
  )
}
