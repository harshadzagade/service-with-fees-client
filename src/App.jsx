import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StudentPortal from './pages/StudentPortal';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/AdminDashboard';
import { CheckCircle2, XCircle, ArrowLeft, RefreshCw, Bookmark } from 'lucide-react';

export default function App() {
  const [page, setPage] = useState('portal'); // portal, cart, checkout, success, failure, admin
  const [cart, setCart] = useState([]);
  const [activeInstituteId, setActiveInstituteId] = useState(null);
  
  // Checkout routing state
  const [payuParams, setPayuParams] = useState(null);
  const [checkoutAmount, setCheckoutAmount] = useState(0);

  // Admin authentication state
  const [adminUser, setAdminUser] = useState(null);

  // Helper to change page and synchronize browser URL bar for deep linking
  const navigateTo = (newPage) => {
    setPage(newPage);
    if (newPage === 'portal') {
      window.history.pushState({}, '', '/');
    } else if (newPage === 'verification') {
      window.history.pushState({}, '', '/verify');
    } else if (newPage === 'admin') {
      window.history.pushState({}, '', '/admin/login');
    }
  };

  // Parse SPA URL paths on mount to handle direct links and redirect routing
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (path.startsWith('/success') || path.includes('success')) {
      setPage('success');
    } else if (path.startsWith('/failure') || path.includes('failure')) {
      setPage('failure');
    } else if (path.startsWith('/verify') || path.includes('verify') || path.includes('verification')) {
      setPage('verification');
      const instCode = params.get('institute');
      if (instCode) {
        window.temp_active_inst_code = instCode;
      }
    } else if (path.startsWith('/admin') || path.includes('admin')) {
      setPage('admin');
    }

    // Load admin token session if saved
    const savedUser = localStorage.getItem('adminUser');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      try {
        setAdminUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('adminUser');
      }
    }
  }, []);

  const handleAddToCart = (item) => {
    setCart((prev) => [...prev, item]);
  };

  const handleRemoveFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheckoutSuccess = (params, totalAmount) => {
    setPayuParams(params);
    setCheckoutAmount(totalAmount);
    setPage('checkout');
  };

  const handleAdminLogin = (user) => {
    setAdminUser(user);
    localStorage.setItem('adminUser', JSON.stringify(user));
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('adminUser');
    localStorage.removeItem('token');
    navigateTo('portal');
  };

  const handleClearTransaction = () => {
    setCart([]);
    setPayuParams(null);
    setCheckoutAmount(0);
    // Clear query params and reset path to /
    window.history.replaceState({}, document.title, '/');
    navigateTo('portal');
  };

  // --- SUB-PAGE: SUCCESS LANDING PAGE ---
  const renderSuccessPage = () => {
    const params = new URLSearchParams(window.location.search);
    const txnId = params.get('txnId') || 'N/A';
    const amount = params.get('amount') || '0';

    return (
      <div className="card glass" style={{ maxWidth: '550px', margin: '4rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ display: 'inline-flex', backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <CheckCircle2 size={48} />
        </div>
        <h2 style={{ color: 'var(--success)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Payment Successful!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Thank you. Your transaction has been completed successfully and your applications are registered.
        </p>

        <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '2rem', fontSize: '0.85rem', textAlign: 'left', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '0.5rem' }}>
            <strong>Transaction ID:</strong>
            <span style={{ fontFamily: 'monospace' }}>{txnId}</span>
          </div>
          <div style={{ display: 'flex', justifyBetween: 'space-between' }}>
            <strong>Amount Paid:</strong>
            <span>Rs. {Number(amount).toFixed(0)}</span>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', marginBottom: '2rem', textAlign: 'left' }}>
          💡 <strong>What happens next?</strong><br/>
          An official GST tax invoice / PDF receipt has been sent to your email. The college registrar admin has been notified and will process your document request offline.
        </div>

        <button className="btn btn-primary" onClick={handleClearTransaction} style={{ width: '100%' }}>
          Back to Portal Home
        </button>
      </div>
    );
  };

  // --- SUB-PAGE: FAILURE LANDING PAGE ---
  const renderFailurePage = () => {
    const params = new URLSearchParams(window.location.search);
    const txnId = params.get('txnId') || 'N/A';

    return (
      <div className="card glass" style={{ maxWidth: '550px', margin: '4rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ display: 'inline-flex', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <XCircle size={48} />
        </div>
        <h2 style={{ color: 'var(--danger)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Payment Failed / Aborted</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          We could not complete your payment transaction. The gateway reported a connection abort or card rejection.
        </p>

        <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '2rem', fontSize: '0.85rem', textAlign: 'left', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyBetween: 'space-between' }}>
            <strong>Transaction Reference:</strong>
            <span style={{ fontFamily: 'monospace' }}>{txnId}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1 }}
            onClick={handleClearTransaction}
          >
            Go to Home
          </button>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1 }}
            onClick={() => {
              window.history.replaceState({}, document.title, '/');
              setPage('cart');
            }}
          >
            <RefreshCw size={14} /> Retry Payment
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Global Header Navigation */}
      <Header 
        page={page} 
        setPage={navigateTo} 
        cartCount={cart.length} 
        user={adminUser}
        onLogout={handleAdminLogout}
      />
      
      {/* Router Switch Main Content */}
      <main className="main-content">
        {page === 'portal' && (
          <StudentPortal 
            activeInstituteId={activeInstituteId}
            setActiveInstituteId={setActiveInstituteId}
            onCheckoutSuccess={handleCheckoutSuccess}
            isVerificationAgency={false}
          />
        )}

        {page === 'verification' && (
          <StudentPortal 
            activeInstituteId={activeInstituteId}
            setActiveInstituteId={setActiveInstituteId}
            onCheckoutSuccess={handleCheckoutSuccess}
            isVerificationAgency={true}
          />
        )}
        
        {page === 'cart' && (
          <Cart 
            cart={cart}
            onRemoveFromCart={handleRemoveFromCart}
            activeInstituteId={activeInstituteId}
            setPage={setPage}
            onCheckoutSuccess={handleCheckoutSuccess}
          />
        )}
        
        {page === 'checkout' && (
          <Checkout 
            payuParams={payuParams}
            totalAmount={checkoutAmount}
            setPage={setPage}
          />
        )}

        {page === 'success' && renderSuccessPage()}
        
        {page === 'failure' && renderFailurePage()}

        {page === 'admin' && (
          <AdminDashboard 
            user={adminUser}
            onLoginSuccess={handleAdminLogin}
          />
        )}
      </main>

      {/* Global Footer */}
      <footer className="portal-footer">
        <p>© 2026 MET Institutions. All rights reserved. | Registrar Services Portal v2.0 (MVP)</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
          Strict GST and Rounding Engine Compliant. Secure PayU Server-side Hashes.
        </p>
      </footer>
    </div>
  );
}
