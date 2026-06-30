import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Trash2, AlertCircle, ShoppingBag, CreditCard, ArrowLeft, Loader2, User } from 'lucide-react';

export default function Cart({ cart, onRemoveFromCart, activeInstituteId, setPage, onCheckoutSuccess }) {
  const [programmes, setProgrammes] = useState([]);
  const [loadingProgs, setLoadingProgs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Applicant details form state
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch programmes for the active institute when cart page loads
  useEffect(() => {
    if (!activeInstituteId || cart.length === 0) return;
    setLoadingProgs(true);
    api.getInstituteProgrammes(activeInstituteId)
      .then((data) => {
        setProgrammes(data);
        setLoadingProgs(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingProgs(false);
      });
  }, [activeInstituteId, cart]);

  // Aggregate cart calculations (sums of individual items as processed by backend checkout)
  const cartSummary = cart.reduce(
    (acc, item) => {
      acc.base += item.breakdown.baseAmount;
      acc.gst += item.breakdown.gstAmount;
      acc.cgst += item.breakdown.cgstAmount;
      acc.sgst += item.breakdown.sgstAmount;
      acc.roundOff += item.breakdown.roundOff;
      acc.total += item.breakdown.totalAmount;
      return acc;
    },
    { base: 0, gst: 0, cgst: 0, sgst: 0, roundOff: 0, total: 0 }
  );

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (cart.length === 0) {
      setErrorMsg('Your shopping cart is empty.');
      return;
    }

    if (!studentName || !studentEmail || !studentPhone || !studentRollNo || !programmeId) {
      setErrorMsg('Please complete all applicant information fields.');
      return;
    }

    setSubmitting(true);

    try {
      // Map cart items to payload format expected by backend checkout
      const cartItemsPayload = cart.map((item) => ({
        serviceId: item.serviceId,
        submittedData: item.submittedData,
        files: item.files, // Linked documents metadata
      }));

      const checkoutData = {
        studentEmail,
        studentName,
        studentPhone,
        studentRollNo,
        instituteId: activeInstituteId,
        programmeId,
        cart: cartItemsPayload,
      };

      // Call API to create pending applications and generate PayU request hash
      const response = await api.checkout(checkoutData);
      
      setSubmitting(false);
      
      // Notify parent app of checkout parameters, which switches route page to 'checkout'
      onCheckoutSuccess(response.payuParams, response.totalAmount);
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err.message || 'Checkout request failed. Please check details and try again.');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="card glass" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <ShoppingBag size={48} style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }} />
        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Your Cart is Empty</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          You have not added any registrar services yet. Go to the dashboard to select services.
        </p>
        <button className="btn btn-primary" onClick={() => setPage('portal')}>
          <ArrowLeft size={16} /> Browse Services
        </button>
      </div>
    );
  }

  return (
    <div className="cart-page grid-2">
      {/* Left Column: Cart items review */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>Cart Review ({cart.length} service{cart.length > 1 ? 's' : ''})</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cart.map((item, index) => (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  paddingBottom: '1rem', 
                  borderBottom: '1px solid var(--border)' 
                }}
              >
                <div>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{item.serviceName}</h4>
                  
                  {(() => {
                    const submitted = item.submittedData || {};
                    const qtyKey = Object.keys(submitted).find(k => 
                      k.toLowerCase().includes('copies') || 
                      k.toLowerCase().includes('quantity') || 
                      k.toLowerCase().includes('qty')
                    );
                    const copiesVal = qtyKey ? submitted[qtyKey] : null;

                    const semKey = Object.keys(submitted).find(k => 
                      k.toLowerCase().includes('semester') || 
                      k.toLowerCase().includes('sem')
                    );
                    const semestersVal = semKey ? submitted[semKey] : null;

                    const calc = item.breakdown || {};

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          {copiesVal && <span>Copies: {copiesVal}</span>}
                          {semestersVal && <span>Semesters: {Array.isArray(semestersVal) ? semestersVal.length : 1}</span>}
                          {item.files.length > 0 && <span>Files: {item.files.length} attached</span>}
                        </div>
                        <div style={{ fontStyle: 'italic', color: 'var(--primary)' }}>
                          {calc.additionalQty > 0 ? (
                            <span>Breakdown: Rs. {calc.basePrice} (base) + {calc.additionalQty} extra copies x Rs. {calc.additionalPrice} = Rs. {calc.baseAmount} (Base Total)</span>
                          ) : (
                            calc.qty > 1 && (
                              <span>Breakdown: {calc.qty} x Rs. {calc.basePrice} = Rs. {calc.baseAmount} (Base Total)</span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Rs. {item.breakdown.totalAmount}</span>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Inc. GST</p>
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem', color: 'var(--danger)', borderColor: 'transparent' }}
                    onClick={() => onRemoveFromCart(index)}
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {/* Cart Calculations Summary */}
            <div className="pricing-widget" style={{ margin: '1rem 0 0' }}>
              <div className="pricing-row">
                <span>Total Base Amount:</span>
                <span>Rs. {cartSummary.base.toFixed(2)}</span>
              </div>
              <div className="pricing-row">
                <span>CGST (9% Split):</span>
                <span>Rs. {cartSummary.cgst.toFixed(2)}</span>
              </div>
              <div className="pricing-row">
                <span>SGST (9% Split):</span>
                <span>Rs. {cartSummary.sgst.toFixed(2)}</span>
              </div>
              <div className="pricing-row">
                <span>Total Tax (GST):</span>
                <span>Rs. {cartSummary.gst.toFixed(2)}</span>
              </div>
              <div className="pricing-row">
                <span>Round Off:</span>
                <span>{cartSummary.roundOff >= 0 ? '+' : ''}Rs. {cartSummary.roundOff.toFixed(2)}</span>
              </div>
              <div className="pricing-row total" style={{ fontSize: '1.2rem' }}>
                <span>Final Total Amount:</span>
                <span>Rs. {cartSummary.total.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Applicant details form & checkout trigger */}
      <div>
        <form onSubmit={handleCheckoutSubmit} className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--primary)' }} />
            <h3>Applicant Enrollment Details</h3>
          </div>
          
          <div className="card-body">
            {errorMsg && (
              <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="e.g. Rahul Sharma"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <input 
                type="email" 
                className="form-input" 
                required 
                placeholder="e.g. rahul@example.com"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
              />
              <span className="form-hint">Receipt and status notification will be sent to this email.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Contact Number <span className="required">*</span></label>
              <input 
                type="tel" 
                className="form-input" 
                required 
                placeholder="e.g. +91 9876543210"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Roll Number / Enrolment ID <span className="required">*</span></label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="e.g. MET-MIM-2024-089"
                value={studentRollNo}
                onChange={(e) => setStudentRollNo(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Academic Programme <span className="required">*</span></label>
              {loadingProgs ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Loader2 className="spinner spinner-dark" /> Loading college programmes...
                </div>
              ) : (
                <select 
                  className="form-input" 
                  required
                  value={programmeId}
                  onChange={(e) => setProgrammeId(e.target.value)}
                >
                  <option value="">-- Select Programme --</option>
                  {programmes.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {prog.name} ({prog.category})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="card-footer">
            <button 
              type="submit" 
              className="btn btn-accent" 
              style={{ width: '100%', height: '48px', fontSize: '1.05rem' }}
              disabled={submitting || loadingProgs}
            >
              {submitting ? (
                <>
                  <Loader2 className="spinner" /> Generating Payment Hash...
                </>
              ) : (
                <>
                  <CreditCard size={18} /> Proceed to Pay (Rs. {cartSummary.total.toFixed(0)})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
