import React from 'react';

/**
 * Layout general de la aplicación.
 * Muestra el nombre y rol del usuario autenticado si existen.
 */
const Layout = ({ children, user, onLogout, onRestartTour }) => {
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="logo-container">
          <img
            src="/logo.png"
            alt="CompliSec"
            width={36}
            height={36}
            style={{ borderRadius: 8, objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <h1>CompliSec</h1>
        </div>

        <nav className="header-nav" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="avatar" title={user.name}>{initials}</div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {user.role}
                </span>
              </div>
              {onRestartTour && (
                <button
                  onClick={onRestartTour}
                  title="Ver tour guiado"
                  style={{
                    background: 'none',
                    border: '1px solid var(--accent)',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '0.5rem',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(59,130,246,0.1)'}
                  onMouseLeave={e => e.target.style.background = 'none'}
                >
                  ❓ Tour
                </button>
              )}
              <button
                onClick={onLogout}
                style={{
                  background: 'none',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '0.5rem',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.target.style.background = 'none'}
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <span className="badge">Plataforma ISO/IEC 27001</span>
          )}
        </nav>
      </header>

      <main className="app-content">
        {children}
      </main>

      <footer className="app-footer">
        <p>© 2026 CompliSec SaaS — Cumplimiento Simplificado para Pymes</p>
      </footer>
    </div>
  );
};

export default Layout;
