import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { calculateFee } from '../utils/feeCalculator';
import { Landmark, FileText, CheckCircle2, AlertCircle, Plus, ArrowRight, Loader2, UploadCloud, X, User, CreditCard, Download } from 'lucide-react';

export default function StudentPortal({ activeInstituteId, setActiveInstituteId, onCheckoutSuccess, isVerificationAgency = false }) {
  const [institutes, setInstitutes] = useState([]);
  const [services, setServices] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [loadingInsts, setLoadingInsts] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingProgs, setLoadingProgs] = useState(false);
  
  const [selectedService, setSelectedService] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({}); // { fieldName: { fileName, s3Url, fileType } }
  const [uploadingField, setUploadingField] = useState(null);
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  
  // Applicant details state
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch active institutes on mount
  useEffect(() => {
    api.getInstitutes()
      .then((data) => {
        setInstitutes(data);
        setLoadingInsts(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingInsts(false);
      });
  }, []);

  // 2. Fetch services and programmes when activeInstituteId or isVerificationAgency changes
  useEffect(() => {
    if (!activeInstituteId) {
      setServices([]);
      setProgrammes([]);
      return;
    }
    setLoadingServices(true);
    setLoadingProgs(true);
    setSelectedService(null);
    setFeeBreakdown(null);
    setFormValues({});
    setUploadedFiles({});
    
    api.getInstituteServices(activeInstituteId)
      .then((data) => {
        if (isVerificationAgency) {
          const filtered = data.filter(s => s.name === 'Educational Verification');
          setServices(filtered);
          if (filtered.length === 1) {
            handleOpenApplyForm(filtered[0]);
          }
        } else {
          const filtered = data.filter(s => s.name !== 'Educational Verification');
          setServices(filtered);
        }
        setLoadingServices(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingServices(false);
      });

    api.getInstituteProgrammes(activeInstituteId)
      .then((data) => {
        setProgrammes(data);
        setLoadingProgs(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingProgs(false);
      });
  }, [activeInstituteId, isVerificationAgency]);

  // 3. Re-calculate fee dynamically whenever formValues changes
  useEffect(() => {
    if (!selectedService) return;
    const breakdown = calculateFee({
      calculationType: selectedService.feeCalculationType,
      basePrice: selectedService.basePrice,
      additionalPrice: selectedService.additionalPrice,
      gstRate: selectedService.gstRate,
      isGstExempt: selectedService.isGstExempt,
      submittedData: formValues,
      includedQuantity: selectedService.includedQuantity,
    });
    setFeeBreakdown(breakdown);
  }, [formValues, selectedService]);

  const activeInstitute = institutes.find((i) => i.id === activeInstituteId);
  const activeInstituteName = activeInstitute ? activeInstitute.name : '';

  const handleInstituteChange = (e) => {
    setActiveInstituteId(e.target.value);
  };

  const handleOpenApplyForm = (service) => {
    setSelectedService(service);
    setErrorMsg('');
    setSuccessMsg('');
    setUploadedFiles({});
    setStudentName('');
    setStudentEmail('');
    setStudentPhone('');
    setStudentRollNo('');
    setProgrammeId('');
    
    // Initialize form defaults based on schema
    const defaults = {};
    if (service.name === 'Educational Verification') {
      defaults['company_name'] = '';
      defaults['course_completed'] = '';
      defaults['year_of_passing'] = '';
      defaults['reason'] = '';
      defaults['marksheet_upload'] = '';
    } else {
      service.formSchema.forEach((field) => {
        if (field.type === 'number') {
          defaults[field.name] = field.min || 1;
        } else if (field.type === 'multiselect') {
          defaults[field.name] = [];
        } else if (field.type === 'select') {
          defaults[field.name] = field.options?.[0] || '';
        } else {
          defaults[field.name] = '';
        }
      });
    }
    setFormValues(defaults);
  };

  const handleInputChange = (fieldName, value) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleCheckboxChange = (fieldName, optionVal, checked) => {
    const currentList = formValues[fieldName] || [];
    let updatedList = [...currentList];
    if (checked) {
      if (!updatedList.includes(optionVal)) updatedList.push(optionVal);
    } else {
      updatedList = updatedList.filter((v) => v !== optionVal);
    }
    handleInputChange(fieldName, updatedList);
  };

  const handleFileUpload = async (fieldName, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingField(fieldName);
    setErrorMsg('');

    try {
      const presign = await api.presignUpload(file.name, file.type);
      await api.uploadFile(presign.uploadUrl, file, file.type);

      const fileMetadata = {
        fileName: file.name,
        s3Url: presign.fileUrl,
        fileType: file.type,
      };

      setUploadedFiles((prev) => ({
        ...prev,
        [fieldName]: fileMetadata,
      }));

      handleInputChange(fieldName, presign.fileUrl);
    } catch (err) {
      console.error(err);
      setErrorMsg(`Failed to upload document "${file.name}". Please try again.`);
    } finally {
      setUploadingField(null);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Personal details validation
    if (selectedService.name === 'Educational Verification') {
      if (!studentName.trim() || !studentEmail.trim() || !studentPhone.trim() || !studentRollNo.trim() || !programmeId) {
        setErrorMsg('Please complete all student and programme details.');
        return;
      }

      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(studentPhone)) {
        setErrorMsg('Please enter a valid 10-digit company contact number.');
        return;
      }

      if (!formValues['company_name']?.trim()) {
        setErrorMsg('Please enter the Company / Agency Name.');
        return;
      }
      if (!formValues['course_completed']) {
        setErrorMsg('Please select whether the course was completed or not.');
        return;
      }
      if (!formValues['year_of_passing']) {
        setErrorMsg('Please enter the Year of Passing.');
        return;
      }
      if (!formValues['reason']?.trim()) {
        setErrorMsg('Please enter the Reason / Purpose of Verification.');
        return;
      }
      if (!uploadedFiles['marksheet_upload']) {
        setErrorMsg('Please upload the candidate Marksheet/Degree Certificate.');
        return;
      }
    } else {
      if (!studentName.trim() || !studentEmail.trim() || !studentPhone.trim() || !studentRollNo.trim() || !programmeId) {
        setErrorMsg('Please complete all applicant information fields.');
        return;
      }

      // Phone format check
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(studentPhone)) {
        setErrorMsg('Please enter a valid 10-digit mobile number.');
        return;
      }

      // Validate duplicate marksheet/diploma uploads (Self-Declaration & FIR)
      const isDuplicate = selectedService.name.toLowerCase().includes('duplicate mark sheet') || 
                          selectedService.name.toLowerCase().includes('duplicate diploma');
      if (isDuplicate) {
        if (!uploadedFiles['self_declaration_upload']) {
          setErrorMsg('Please upload the signed Student Self Declaration form.');
          return;
        }
        if (!uploadedFiles['fir_upload']) {
          setErrorMsg('Please upload a copy of the police FIR report.');
          return;
        }
      }

      // Dynamic fields validation
      for (const field of selectedService.formSchema) {
        const val = formValues[field.name];
        if (field.required) {
          if (field.type === 'multiselect') {
            if (!val || val.length === 0) {
              setErrorMsg(`Please select at least one option for "${field.label}"`);
              return;
            }
          } else if (!val) {
            setErrorMsg(`Please complete all required fields. "${field.label}" is missing.`);
            return;
          }
        }

        if (field.type === 'tel' && val) {
          const fieldPhoneRegex = /^[0-9]{10}$/;
          if (!fieldPhoneRegex.test(val)) {
            setErrorMsg(`Please enter a valid 10-digit mobile number for "${field.label}"`);
            return;
          }
        }
      }
    }

    if (!feeBreakdown) {
      setErrorMsg('Pricing error. Unable to calculate totals.');
      return;
    }

    setSubmitting(true);

    try {
      const filesList = Object.values(uploadedFiles);
      const cartItem = {
        serviceId: selectedService.id,
        submittedData: formValues,
        files: filesList,
      };

      const checkoutPayload = {
        studentEmail,
        studentName,
        studentPhone,
        studentRollNo,
        instituteId: activeInstituteId,
        programmeId,
        cart: [cartItem], // Checkout single service directly
      };

      const response = await api.checkout(checkoutPayload);
      setSubmitting(false);

      setSuccessMsg('Form submitted successfully! Proceeding to payment...');
      setTimeout(() => {
        onCheckoutSuccess(response.payuParams, response.totalAmount);
        setSelectedService(null);
      }, 1000);
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err.message || 'Submission failed. Please check details and try again.');
    }
  };

  return (
    <div className="student-portal">
      {/* 1. Header Hero Panel */}
      <div className="card glass" style={{ marginBottom: '2rem', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
          {isVerificationAgency ? "Verify Student Credentials (Verification Agency)" : "Apply for Academic Registrar Services"}
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          {isVerificationAgency 
            ? "Select the candidate's college below to upload documents and submit verification requests securely."
            : "Select your institute below to view available transcripts, bonafides, and marksheet services. Fill dynamic forms, compute compliant GST fees, and pay."}
        </p>

        {/* Institute Dropdown Selector */}
        {loadingInsts ? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <Loader2 className="spinner spinner-dark" /> Loading MET Institutes...
          </div>
        ) : (
          <div style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
            <label className="form-label">
              {isVerificationAgency ? "Select Candidate's MET College/Institute:" : "Select Your MET College/Institute:"}
            </label>
            <div style={{ position: 'relative' }}>
              <select 
                className="form-input" 
                value={activeInstituteId || ''} 
                onChange={handleInstituteChange}
                style={{ height: '45px', fontSize: '1rem', paddingLeft: '2.5rem' }}
              >
                <option value="">-- Select Institute / College --</option>
                {institutes.map((inst) => {
                  const maxLen = 55;
                  const shortName = inst.name.length > maxLen 
                    ? inst.name.substring(0, maxLen) + '...' 
                    : inst.name;
                  return (
                    <option key={inst.id} value={inst.id} title={`${inst.name} (${inst.code})`}>
                      {shortName} ({inst.code})
                    </option>
                  );
                })}
              </select>
              <Landmark size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
            </div>
          </div>
        )}
      </div>

      {/* 2. Services Catalogue / Prompt */}
      {!activeInstituteId ? (
        <div className="card glass" style={{ padding: '3rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <Landmark size={40} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.7 }} />
          <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            {isVerificationAgency ? "Please Select the Candidate's Institute First" : "Please Select an Institute First"}
          </h4>
          <p style={{ color: 'var(--text-muted)' }}>
            {isVerificationAgency 
              ? "Select the institute from the dropdown above to verify credentials and submit your verification request."
              : "Select your college from the dropdown above to view available services and submit your applications."}
          </p>
        </div>
      ) : (
        <div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
            {isVerificationAgency ? "Verification Services" : "Available Registrar Services"}
          </h3>

          {loadingServices ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <Loader2 className="spinner spinner-dark" style={{ margin: '0 auto 1rem' }} />
              <p>Fetching services catalogue...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', borderStyle: 'dashed' }}>
              <AlertCircle size={40} style={{ color: 'var(--text-light)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>No registrar services are currently configured for this institute.</p>
            </div>
          ) : (
            <div className="grid-2">
              {services.map((service) => (
                <div key={service.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="card-body">
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ backgroundColor: 'var(--secondary-light)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--secondary)' }}>
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>{service.name}</h4>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', marginTop: '0.25rem' }}>
                          GST: {service.isGstExempt ? 'Exempt (0%)' : `${service.gstRate}%`}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      {service.description || 'Apply for official document processing and records verification.'}
                    </p>
                    
                    <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>Price Formula:</span>{' '}
                      {service.feeCalculationType === 'FIXED' && `Rs. ${Number(service.basePrice)} (Flat)`}
                      {service.feeCalculationType === 'FLAT_COPY_WISE' && `Rs. ${Number(service.basePrice)} per copy`}
                      {service.feeCalculationType === 'BASE_PLUS_ADDITIONAL' && `Rs. ${Number(service.basePrice)} + Rs. ${Number(service.additionalPrice)} for each extra copy (covers first ${service.includedQuantity})`}
                      {service.feeCalculationType === 'SEMESTER_WISE' && `Rs. ${Number(service.basePrice)} per selected semester`}
                    </div>
                  </div>
                  <div className="card-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%' }}
                      onClick={() => handleOpenApplyForm(service)}
                    >
                      Apply Now <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Modal Popup: Dynamic Form & Direct Checkout */}
      {selectedService && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card glass" style={{
            width: '100%', maxWidth: '600px',
            maxHeight: '92vh', overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Apply: {selectedService.name}</h3>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => setSelectedService(null)}
                style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="card-body">
              {errorMsg && (
                <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
                  <CheckCircle2 size={16} /> {successMsg}
                </div>
              )}

              {selectedService.name === 'Educational Verification' ? (
                <>
                  {/* 1. COMPANY / AGENCY INFO */}
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Landmark size={16} /> 1. Company / Verification Agency Details
                    </h4>

                    <div className="form-group">
                      <label className="form-label">Company / Agency Name <span className="required">*</span></label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        placeholder="e.g. AuthBridge Screening Solutions"
                        value={formValues['company_name'] || ''}
                        onChange={(e) => handleInputChange('company_name', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Company Email ID <span className="required">*</span></label>
                      <input 
                        type="email" 
                        className="form-input" 
                        required 
                        placeholder="e.g. verifications@company.com"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                      />
                      <span className="form-hint">Official email where the verification report and receipt will be sent.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Company Contact Number <span className="required">*</span></label>
                      <input 
                        type="tel" 
                        className="form-input" 
                        required 
                        maxLength={10}
                        placeholder="e.g. 9876543210 (10 digits)"
                        value={studentPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setStudentPhone(val);
                        }}
                      />
                    </div>
                  </div>

                  {/* 2. CANDIDATE PROFILE (BEING VERIFIED) */}
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={16} /> 2. Candidate / Student Profile (Being Verified)
                    </h4>

                    <div className="form-group">
                      <label className="form-label">Institute Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        readOnly 
                        style={{ backgroundColor: 'var(--bg)', cursor: 'not-allowed' }}
                        value={activeInstituteName}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Student Full Name <span className="required">*</span></label>
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
                      <label className="form-label">Roll Number / Enrolment ID <span className="required">*</span></label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        placeholder="e.g. MET-IOM-2024-089"
                        value={studentRollNo}
                        onChange={(e) => setStudentRollNo(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Academic Programme <span className="required">*</span></label>
                      {loadingProgs ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <Loader2 className="spinner spinner-dark" /> Loading programmes...
                        </div>
                      ) : (
                        <select 
                          className="form-input" 
                          required
                          value={programmeId}
                          onChange={(e) => setProgrammeId(e.target.value)}
                        >
                          <option value="">-- Select Programme --</option>
                          {programmes.map((prog) => {
                            const maxLen = 50;
                            const shortName = prog.name.length > maxLen 
                              ? prog.name.substring(0, maxLen) + '...' 
                              : prog.name;
                            return (
                              <option key={prog.id} value={prog.id} title={`${prog.name} (${prog.category})`}>
                                {shortName} ({prog.category})
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Course Completed? <span className="required">*</span></label>
                      <select 
                        className="form-input"
                        required
                        value={formValues['course_completed'] || ''}
                        onChange={(e) => handleInputChange('course_completed', e.target.value)}
                      >
                        <option value="">-- Select Option --</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Year of Passing <span className="required">*</span></label>
                      <input 
                        type="number" 
                        className="form-input" 
                        required 
                        min={1990}
                        max={2030}
                        placeholder="e.g. 2024"
                        value={formValues['year_of_passing'] || ''}
                        onChange={(e) => handleInputChange('year_of_passing', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 3. REQUEST DETAILS */}
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} /> 3. Verification details & Marksheet upload
                    </h4>

                    <div className="form-group">
                      <label className="form-label">Reason / Purpose of Verification <span className="required">*</span></label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        placeholder="e.g. Pre-employment Background check"
                        value={formValues['reason'] || ''}
                        onChange={(e) => handleInputChange('reason', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Upload Marksheet / Degree Certificate (PDF/JPG) <span className="required">*</span></label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {uploadedFiles['marksheet_upload'] ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                              ✔ Attached: {uploadedFiles['marksheet_upload'].fileName}
                            </span>
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', marginLeft: 'auto' }}
                              onClick={() => {
                                setUploadedFiles((prev) => {
                                  const c = { ...prev };
                                  delete c['marksheet_upload'];
                                  return c;
                                });
                                handleInputChange('marksheet_upload', '');
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div style={{ position: 'relative', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', textAlign: 'center', transition: 'border-color 0.2s' }}>
                            {uploadingField === 'marksheet_upload' ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                <Loader2 className="spinner spinner-dark" /> Uploading to secure S3 storage...
                              </div>
                            ) : (
                              <>
                                <UploadCloud size={24} style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }} />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click to select and upload document (PDF/JPG)</p>
                                <input 
                                  type="file" 
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  required
                                  onChange={(e) => handleFileUpload('marksheet_upload', e)}
                                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* 1. APPLICANT DETAILS SECTION */}
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={16} /> 1. Applicant Enrollment Details
                    </h4>

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
                    </div>

                    <div className="form-group">
                      <label className="form-label">Contact Number <span className="required">*</span></label>
                      <input 
                        type="tel" 
                        className="form-input" 
                        required 
                        maxLength={10}
                        placeholder="e.g. 9876543210 (10 digits)"
                        value={studentPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, ''); // digits only
                          setStudentPhone(val);
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Roll Number / Enrolment ID <span className="required">*</span></label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        placeholder="e.g. MET-IOM-2024-089"
                        value={studentRollNo}
                        onChange={(e) => setStudentRollNo(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Academic Programme <span className="required">*</span></label>
                      {loadingProgs ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <Loader2 className="spinner spinner-dark" /> Loading programmes...
                        </div>
                      ) : (
                        <select 
                          className="form-input" 
                          required
                          value={programmeId}
                          onChange={(e) => setProgrammeId(e.target.value)}
                        >
                          <option value="">-- Select Programme --</option>
                          {programmes.map((prog) => {
                            const maxLen = 50;
                            const shortName = prog.name.length > maxLen 
                              ? prog.name.substring(0, maxLen) + '...' 
                              : prog.name;
                            return (
                              <option key={prog.id} value={prog.id} title={`${prog.name} (${prog.category})`}>
                                {shortName} ({prog.category})
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* 2. DYNAMIC REQUIREMENTS SECTION */}
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} /> 2. Document & Application Requirements
                    </h4>

                    {selectedService.formSchema.map((field) => {
                      const isFieldRequired = field.required;
                      
                      return (
                        <div key={field.name} className="form-group">
                          <label className="form-label">
                            {field.label}
                            {isFieldRequired && <span className="required">*</span>}
                          </label>

                          {/* TEXT INPUT */}
                          {field.type === 'text' && (
                            <input 
                              type="text" 
                              className="form-input" 
                              required={isFieldRequired}
                              placeholder={field.placeholder || ''}
                              value={formValues[field.name] || ''}
                              onChange={(e) => handleInputChange(field.name, e.target.value)}
                            />
                          )}

                          {/* MOBILE NUMBER INPUT */}
                          {field.type === 'tel' && (
                            <input 
                              type="tel" 
                              className="form-input" 
                              required={isFieldRequired}
                              maxLength={10}
                              placeholder={field.placeholder || 'e.g. 9876543210 (10 digits)'}
                              value={formValues[field.name] || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, ''); // digits only
                                handleInputChange(field.name, val);
                              }}
                            />
                          )}

                          {/* NUMBER INPUT */}
                          {field.type === 'number' && (
                            <input 
                              type="number" 
                              className="form-input" 
                              required={isFieldRequired}
                              min={field.min ?? 1}
                              max={field.max ?? 99}
                              placeholder={field.placeholder || ''}
                              value={formValues[field.name] || ''}
                              onChange={(e) => handleInputChange(field.name, parseInt(e.target.value) || '')}
                            />
                          )}

                          {/* DROPDOWN SELECT */}
                          {field.type === 'select' && (
                            <select 
                              className="form-input"
                              required={isFieldRequired}
                              value={formValues[field.name] || ''}
                              onChange={(e) => handleInputChange(field.name, e.target.value)}
                            >
                              <option value="">-- Choose Option --</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}

                          {/* MULTISELECT CHECKBOX LIST (e.g., Semesters) */}
                          {field.type === 'multiselect' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                              {field.options?.map((opt) => {
                                const isChecked = (formValues[field.name] || []).includes(opt);
                                return (
                                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => handleCheckboxChange(field.name, opt, e.target.checked)}
                                    />
                                    {opt}
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* FILE UPLOAD */}
                          {field.type === 'file' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {uploadedFiles[field.name] ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                                    ✔ Attached: {uploadedFiles[field.name].fileName}
                                  </span>
                                  <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', marginLeft: 'auto' }}
                                    onClick={() => {
                                      setUploadedFiles((prev) => {
                                        const c = { ...prev };
                                        delete c[field.name];
                                        return c;
                                      });
                                      handleInputChange(field.name, '');
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <div style={{ position: 'relative', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', textAlign: 'center', transition: 'border-color 0.2s' }}>
                                  {uploadingField === field.name ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                      <Loader2 className="spinner spinner-dark" /> Uploading to secure S3 storage...
                                    </div>
                                  ) : (
                                    <>
                                      <UploadCloud size={24} style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }} />
                                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click to select and upload document (PDF/JPG)</p>
                                      <input 
                                        type="file" 
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        required={isFieldRequired}
                                        onChange={(e) => handleFileUpload(field.name, e)}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                      />
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Extra Requirements for Duplicate Documents (Lost Marksheet / Diploma) */}
                    {(selectedService.name.toLowerCase().includes('duplicate mark sheet') || 
                      selectedService.name.toLowerCase().includes('duplicate diploma')) && (
                      <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border)' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--secondary)', marginBottom: '0.75rem' }}>
                          Duplicate Document Requirements (Lost/Stolen)
                        </h4>
                        
                        {/* Download Template Alert */}
                        <div style={{ backgroundColor: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid rgba(11, 51, 132, 0.15)' }}>
                          <strong style={{ color: 'var(--secondary)' }}>💡 Self Declaration Template Required:</strong>
                          <span style={{ color: 'var(--text-muted)' }}>Please download, print, fill, sign, and upload the Student Self Declaration form:</span>
                          <a 
                            href="/templates/self_declaration_duplicate_marksheet.pdf" 
                            download 
                            className="btn btn-secondary" 
                            style={{ alignSelf: 'flex-start', padding: '0.35rem 0.6rem', fontSize: '0.75rem', marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Download size={12} /> Download Self Declaration Template
                          </a>
                        </div>

                        {/* 1. Self-Declaration Upload */}
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                          <label className="form-label">Upload Signed Self Declaration (PDF/JPG) <span className="required">*</span></label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {uploadedFiles['self_declaration_upload'] ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                                  ✔ Attached: {uploadedFiles['self_declaration_upload'].fileName}
                                </span>
                                <button 
                                  type="button" 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', marginLeft: 'auto' }}
                                  onClick={() => {
                                    setUploadedFiles((prev) => {
                                      const c = { ...prev };
                                      delete c['self_declaration_upload'];
                                      return c;
                                    });
                                    handleInputChange('self_declaration_upload', '');
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div style={{ position: 'relative', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', textAlign: 'center' }}>
                                {uploadingField === 'self_declaration_upload' ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                    <Loader2 className="spinner spinner-dark" /> Uploading to secure S3 storage...
                                  </div>
                                ) : (
                                  <>
                                    <UploadCloud size={24} style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }} />
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click to select and upload Self-Declaration</p>
                                    <input 
                                      type="file" 
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      required
                                      onChange={(e) => handleFileUpload('self_declaration_upload', e)}
                                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                    />
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. FIR Copy Upload */}
                        <div className="form-group">
                          <label className="form-label">Upload Copy of Police FIR (First Information Report) <span className="required">*</span></label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {uploadedFiles['fir_upload'] ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                                  ✔ Attached: {uploadedFiles['fir_upload'].fileName}
                                </span>
                                <button 
                                  type="button" 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', marginLeft: 'auto' }}
                                  onClick={() => {
                                    setUploadedFiles((prev) => {
                                      const c = { ...prev };
                                      delete c['fir_upload'];
                                      return c;
                                    });
                                    handleInputChange('fir_upload', '');
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div style={{ position: 'relative', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', textAlign: 'center' }}>
                                {uploadingField === 'fir_upload' ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                    <Loader2 className="spinner spinner-dark" /> Uploading to secure S3 storage...
                                  </div>
                                ) : (
                                  <>
                                    <UploadCloud size={24} style={{ color: 'var(--text-light)', marginBottom: '0.25rem' }} />
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click to select and upload police FIR copy</p>
                                    <input 
                                      type="file" 
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      required
                                      onChange={(e) => handleFileUpload('fir_upload', e)}
                                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                    />
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 3. Real-time Pricing Breakdown */}
              {feeBreakdown && (
                <div className="pricing-widget" style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--secondary)' }}>GST Pricing breakdown:</h4>
                  
                  {/* Detailed Base Calculations */}
                  {selectedService.feeCalculationType === 'FLAT_COPY_WISE' && (
                    <div className="pricing-row">
                      <span>Base Fee ({feeBreakdown.qty} cop{feeBreakdown.qty > 1 ? 'ies' : 'y'} x Rs. {feeBreakdown.basePrice.toFixed(2)}):</span>
                      <span>Rs. {feeBreakdown.baseAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {selectedService.feeCalculationType === 'BASE_PLUS_ADDITIONAL' && (
                    <>
                      <div className="pricing-row">
                        <span>Base Price (covers {selectedService.includedQuantity} cop{selectedService.includedQuantity > 1 ? 'ies' : 'y'}):</span>
                        <span>Rs. {feeBreakdown.basePrice.toFixed(2)}</span>
                      </div>
                      {feeBreakdown.additionalQty > 0 && (
                        <div className="pricing-row">
                          <span>Additional Fee ({feeBreakdown.additionalQty} extra cop{feeBreakdown.additionalQty > 1 ? 'ies' : 'y'} x Rs. {feeBreakdown.additionalPrice.toFixed(2)}):</span>
                          <span>Rs. {feeBreakdown.additionalFee.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="pricing-row" style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.25rem', marginTop: '0.25rem', fontWeight: 600 }}>
                        <span>Total Base Amount:</span>
                        <span>Rs. {feeBreakdown.baseAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {selectedService.feeCalculationType === 'SEMESTER_WISE' && (
                    <div className="pricing-row">
                      <span>Base Fee ({feeBreakdown.qty} semester{feeBreakdown.qty > 1 ? 's' : ''} x Rs. {feeBreakdown.basePrice.toFixed(2)}):</span>
                      <span>Rs. {feeBreakdown.baseAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {selectedService.feeCalculationType === 'FIXED' && (
                    <div className="pricing-row">
                      <span>Base Document Fee:</span>
                      <span>Rs. {feeBreakdown.baseAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {!selectedService.isGstExempt && (
                    <>
                      <div className="pricing-row">
                        <span>CGST (9% Split):</span>
                        <span>Rs. {feeBreakdown.cgstAmount.toFixed(2)}</span>
                      </div>
                      <div className="pricing-row">
                        <span>SGST (9% Split):</span>
                        <span>Rs. {feeBreakdown.sgstAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="pricing-row">
                    <span>Tax (GST {selectedService.isGstExempt ? '0%' : `${selectedService.gstRate}%`}):</span>
                    <span>Rs. {feeBreakdown.gstAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="pricing-row">
                    <span>Round Off Adjustment:</span>
                    <span>{feeBreakdown.roundOff >= 0 ? '+' : ''}Rs. {feeBreakdown.roundOff.toFixed(2)}</span>
                  </div>

                  <div className="pricing-row total">
                    <span>Grand Total:</span>
                    <span>Rs. {feeBreakdown.totalAmount.toFixed(0)}</span>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setSelectedService(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, gap: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  disabled={uploadingField !== null || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="spinner" /> Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} /> Pay & Apply (Rs. {feeBreakdown ? feeBreakdown.totalAmount.toFixed(0) : '0'})
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
