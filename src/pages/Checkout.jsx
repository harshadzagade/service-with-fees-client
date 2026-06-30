import React from 'react';
import { CreditCard, ShieldCheck, ArrowLeft, Landmark, ShoppingBag, Coins } from 'lucide-react';

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

  const { key, txnid, amount, productinfo, firstname, email, hash, surl, furl } = payuParams;

  return (
    <div className="checkout-simulation-page" style={{ maxWidth: '650px', margin: '0 auto' }}>
      <div className="card glass" style={{ border: '2px solid var(--secondary)', boxShadow: 'var(--shadow-lg)' }}>
        {/* Banner Alert representing simulated gateway */}
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
              PayU Secure Sandbox Gateway
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', opacity: 0.85, textTransform: 'uppercase' }}>Simulation Mode</span>
        </div>

        <div className="card-body">
          {/* Order Details box */}
          <div style={{ backgroundColor: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>
              Billing Summary
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <div><strong>Payable Amount:</strong></div>
              <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>Rs. {amount}</div>
              
              <div><strong>Transaction ID:</strong></div>
              <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>{txnid}</div>
              
              <div><strong>Applicant Name:</strong></div>
              <div style={{ textAlign: 'right' }}>{firstname}</div>
              
              <div><strong>Applicant Email:</strong></div>
              <div style={{ textAlign: 'right' }}>{email}</div>

              <div><strong>Services:</strong></div>
              <div style={{ textAlign: 'right', wordBreak: 'break-all', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{productinfo}</div>
              
              <div><strong>Merchant Key:</strong></div>
              <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }}>{key}</div>
            </div>
          </div>

          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-main)', textAlign: 'center' }}>
            Select Payment Action to Simulate
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Success Simulator form */}
            <form action={surl} method="POST">
              {/* PayU Postback inputs */}
              <input type="hidden" name="key" value={key} />
              <input type="hidden" name="txnid" value={txnid} />
              <input type="hidden" name="amount" value={amount} />
              <input type="hidden" name="productinfo" value={productinfo} />
              <input type="hidden" name="firstname" value={firstname} />
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="status" value="success" />
              <input type="hidden" name="hash" value={hash} />
              <input type="hidden" name="udf1" value="" />
              <input type="hidden" name="udf2" value="" />
              <input type="hidden" name="udf3" value="" />
              <input type="hidden" name="udf4" value="" />
              <input type="hidden" name="udf5" value="" />

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '1.25rem 1rem', height: 'auto', gap: '0.25rem', backgroundColor: 'var(--success)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '1rem' }}>
                  <ShieldCheck size={18} /> Pay Successfully
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.9 }}>Simulates completed txn webhook callback</span>
              </button>
            </form>

            {/* Failure Simulator form */}
            <form action={furl} method="POST">
              <input type="hidden" name="key" value={key} />
              <input type="hidden" name="txnid" value={txnid} />
              <input type="hidden" name="amount" value={amount} />
              <input type="hidden" name="productinfo" value={productinfo} />
              <input type="hidden" name="firstname" value={firstname} />
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="status" value="failure" />
              <input type="hidden" name="hash" value={hash} />
              
              <button 
                type="submit" 
                className="btn btn-danger" 
                style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '1.25rem 1rem', height: 'auto', gap: '0.25rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '1rem' }}>
                  <Coins size={18} /> Cancel / Fail Payment
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.9 }}>Simulates transaction failure callback</span>
              </button>
            </form>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'center' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setPage('cart')}
              style={{ fontSize: '0.85rem' }}
            >
              <ArrowLeft size={14} /> Back to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
