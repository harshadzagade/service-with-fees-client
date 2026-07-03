import React from 'react';
import { CreditCard, ShieldCheck, ArrowLeft, Landmark, ShoppingBag, Coins, ExternalLink } from 'lucide-react';

export default function Checkout({ payuParams, totalAmount, setPage }) {
  if (!payuParams) {
    return (
      <div className="card glass" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>No active checkout session found. Go back to browse services.</p>
        <button className="btn btn-primary" onClick={() => setPage('portal')}>
          Browse Services
        </button>
      </div>
    );
  }

  const { key, txnid, amount, productinfo, firstname, email, phone, hash, surl, furl } = payuParams;

  // Determine whether this is a mock sandbox environment or a live merchant setup
  const isMock = key === 'DEFAULT_SANDBOX_KEY' || (typeof key === 'string' && (key.startsWith('MOCK_KEY_') || key.includes('MOCK') || key.includes('SANDBOX')));
  const payuUrl = isMock ? 'https://test.payu.in/_payment' : 'https://secure.payu.in/_payment';

  return (
    <div className="checkout-page" style={{ maxWidth: '650px', margin: '0 auto' }}>
      <div className="card glass" style={{ border: '2px solid var(--secondary)', boxShadow: 'var(--shadow-lg)' }}>
        {/* Gateway Banner */}
        <div style={{
          backgroundColor: 'var(--secondary)',
          color: 'white',
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} />
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
              {isMock ? 'PayU Sandbox Payment Gateway' : 'PayU Secure Payment Gateway'}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', opacity: 0.85, textTransform: 'uppercase' }}>
            {isMock ? 'Sandbox Mode' : 'Live Mode'}
          </span>
        </div>

        <div className="card-body">
          {/* Order Details box */}
          <div style={{ backgroundColor: 'var(--bg)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--secondary)', fontWeight: 600 }}>
              Billing Summary & Invoice
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.6rem 1rem', fontSize: '0.85rem' }}>
              <div><strong>Payable Amount:</strong></div>
              <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>₹{amount}</div>
              
              <div><strong>Transaction ID:</strong></div>
              <div style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-main)' }}>{txnid}</div>
              
              <div><strong>Applicant Name:</strong></div>
              <div style={{ textAlign: 'right', color: 'var(--text-main)' }}>{firstname}</div>
              
              <div><strong>Applicant Email:</strong></div>
              <div style={{ textAlign: 'right', color: 'var(--text-main)' }}>{email}</div>

              {phone && (
                <>
                  <div><strong>Contact Number:</strong></div>
                  <div style={{ textAlign: 'right', color: 'var(--text-main)' }}>{phone}</div>
                </>
              )}

              <div><strong>Services Applied:</strong></div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{productinfo}</div>
              
              <div><strong>Merchant Identifier:</strong></div>
              <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{key}</div>
            </div>
          </div>

          {/* 1. REAL GATEWAY REDIRECT FORM */}
          <form action={payuUrl} method="POST" style={{ marginBottom: '1.5rem' }}>
            <input type="hidden" name="key" value={key} />
            <input type="hidden" name="txnid" value={txnid} />
            <input type="hidden" name="amount" value={amount} />
            <input type="hidden" name="productinfo" value={productinfo} />
            <input type="hidden" name="firstname" value={firstname} />
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="phone" value={phone || ''} />
            <input type="hidden" name="surl" value={surl} />
            <input type="hidden" name="furl" value={furl} />
            <input type="hidden" name="hash" value={hash} />
            <input type="hidden" name="service_provider" value="payu_paisa" />

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1rem', height: '48px', fontSize: '1rem', fontWeight: 700 }}
            >
              <CreditCard size={18} /> Proceed to Secure Payment
            </button>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.4rem' }}>
              🛡 Redirecting to PCI-DSS compliant secure PayU portal.
            </span>
          </form>

          {/* 2. OPTIONAL DEVELOPER SIMULATOR BUTTONS (Only visible for Mock Keys) */}
          {isMock && (
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '1.25rem', marginTop: '1rem' }}>
              <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', fontWeight: 600 }}>
                🛠 Sandbox / Developer Simulator Actions
              </h5>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <form action={surl} method="POST">
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="txnid" value={txnid} />
                  <input type="hidden" name="amount" value={amount} />
                  <input type="hidden" name="productinfo" value={productinfo} />
                  <input type="hidden" name="firstname" value={firstname} />
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="phone" value={phone || ''} />
                  <input type="hidden" name="status" value="success" />
                  <input type="hidden" name="hash" value={hash} />
                  
                  <button 
                    type="submit" 
                    className="btn btn-secondary" 
                    style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '0.75rem', height: 'auto', gap: '0.15rem', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderColor: 'rgba(0,0,0,0.1)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>
                      <ShieldCheck size={14} /> Simulate Success
                    </div>
                    <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>Simulate completed txn success callback</span>
                  </button>
                </form>

                <form action={furl} method="POST">
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="txnid" value={txnid} />
                  <input type="hidden" name="amount" value={amount} />
                  <input type="hidden" name="productinfo" value={productinfo} />
                  <input type="hidden" name="firstname" value={firstname} />
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="phone" value={phone || ''} />
                  <input type="hidden" name="status" value="failure" />
                  <input type="hidden" name="hash" value={hash} />
                  
                  <button 
                    type="submit" 
                    className="btn btn-secondary" 
                    style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '0.75rem', height: 'auto', gap: '0.15rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderColor: 'rgba(0,0,0,0.1)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>
                      <Coins size={14} /> Simulate Failure
                    </div>
                    <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>Simulate failure / cancelled callback</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setPage('cart')}
              style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={14} /> Back to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
