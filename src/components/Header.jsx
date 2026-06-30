import React from 'react';
import { ShoppingBag, Landmark, GraduationCap, ClipboardList, ShieldAlert } from 'lucide-react';

export default function Header({ page, setPage, cartCount, user, onLogout }) {
  return (
    <header className="portal-header">
      <div className="brand-section" onClick={() => setPage('portal')} style={{ cursor: 'pointer' }}>
        <div className="brand-logo-mock">MET</div>
        <div className="brand-info">
          <h1>MET Registrar Services</h1>
          <p>Verification & Academic Portal</p>
        </div>
      </div>
      
      <nav className="nav-menu">
        <span 
          className={`nav-link ${page === 'portal' ? 'active' : ''}`}
          onClick={() => setPage('portal')}
        >
          <Landmark size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Student Portal
        </span>

        <span 
          className={`nav-link ${page === 'verification' ? 'active' : ''}`}
          onClick={() => setPage('verification')}
        >
          <GraduationCap size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Verify Credentials
        </span>
        
        {user && (
          <>
            <span 
              className={`nav-link ${page === 'admin' ? 'active' : ''}`}
              onClick={() => setPage('admin')}
            >
              <ClipboardList size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Admin: {user.name}
            </span>
            <button 
              className="btn btn-secondary" 
              onClick={onLogout}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
