import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  ClipboardList, Search, FileText, CheckCircle2, User, Landmark, 
  IndianRupee, Download, Loader2, MessageSquare, AlertCircle, 
  Settings, BookOpen, Plus, Trash2, Edit3, Shield, Key, XCircle, Eye, X, RefreshCw, Printer
} from 'lucide-react';

const renderLogDetails = (details) => {
  if (!details) return '';
  const elements = [];

  // 1. Primary entity name/code/email
  if (details.name) elements.push(<div key="name"><strong>Name:</strong> {details.name}</div>);
  if (details.code) elements.push(<div key="code"><strong>Code:</strong> {details.code}</div>);
  if (details.email) elements.push(<div key="email"><strong>Email:</strong> {details.email}</div>);
  if (details.targetEmail) elements.push(<div key="targetEmail"><strong>Target Email:</strong> {details.targetEmail}</div>);
  if (details.targetName) elements.push(<div key="targetName"><strong>Target Name:</strong> {details.targetName}</div>);
  if (details.studentName) elements.push(<div key="studentName"><strong>Student:</strong> {details.studentName}</div>);
  if (details.studentRollNo) elements.push(<div key="studentRollNo"><strong>Roll No:</strong> {details.studentRollNo}</div>);
  if (details.serviceName) elements.push(<div key="serviceName"><strong>Service:</strong> {details.serviceName}</div>);
  
  // 2. Billing/Payments
  if (details.payuTxnId) elements.push(<div key="txnId"><strong>Txn ID:</strong> <span style={{ fontFamily: 'monospace' }}>{details.payuTxnId}</span></div>);
  if (details.amount !== undefined) elements.push(<div key="amount"><strong>Amount:</strong> Rs. {details.amount}</div>);
  if (details.reason) elements.push(<div key="reason"><strong>Reason:</strong> {details.reason}</div>);

  // 3. Changes/Diffs
  if (details.changes && Object.keys(details.changes).length > 0) {
    const changeLines = Object.entries(details.changes).map(([field, diff]) => {
      if (diff && typeof diff === 'object' && 'from' in diff && 'to' in diff) {
        const fromVal = typeof diff.from === 'object' ? JSON.stringify(diff.from) : String(diff.from);
        const toVal = typeof diff.to === 'object' ? JSON.stringify(diff.to) : String(diff.to);
        return (
          <div key={field} style={{ paddingLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--primary)' }}>
            • <code>{field}</code>: "{fromVal}" ➔ "{toVal}"
          </div>
        );
      }
      return null;
    }).filter(Boolean);

    if (changeLines.length > 0) {
      elements.push(
        <div key="changes" style={{ marginTop: '0.25rem' }}>
          <strong>Field Diffs:</strong>
          {changeLines}
        </div>
      );
    }
  }

  // 4. Metadata (IP, Browser)
  if (details.metadata) {
    const { ip, userAgent } = details.metadata;
    let browser = 'Unknown Browser';
    if (userAgent) {
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Edge')) browser = 'Edge';
    }
    elements.push(
      <div key="metadata" style={{ fontSize: '0.65rem', color: 'var(--text-light)', borderTop: '1px dashed var(--border)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
        IP: {ip || 'N/A'} | Browser: {browser}
      </div>
    );
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>{elements}</div>;
};

export default function AdminDashboard({ user, onLoginSuccess }) {
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Tab routing: 'applications', 'institutes', 'programmes', 'services', 'users', 'logs'
  const [activeTab, setActiveTab] = useState('applications');

  // Master Data Lists (Superadmin only)
  const [institutes, setInstitutes] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Loading indicator states
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Error/Action statuses
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // 1. Applications Tab states
  const [applications, setApplications] = useState([]);
  const [reports, setReports] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [statusFilter, setStatusFilter] = useState('SUCCESS'); // SUCCESS or FULFILLED
  const [searchText, setSearchText] = useState('');
  const [remarks, setRemarks] = useState('');
  const [fulfilling, setFulfilling] = useState(false);

  // Secondary local application filters
  const [instFilter, setInstFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Registrar service catalog filters
  const [srvSearchText, setSrvSearchText] = useState('');
  const [srvInstFilter, setSrvInstFilter] = useState('all');
  const [srvGstFilter, setSrvGstFilter] = useState('all');

  // Reset secondary filters on status change
  useEffect(() => {
    setInstFilter('all');
    setServiceFilter('all');
    setCatFilter('all');
    setDateFilter('all');
  }, [statusFilter]);

  // Compute filtered applications list client-side
  const filteredApplications = applications.filter((app) => {
    // 1. Institute Filter (Superadmin only)
    if (user && user.role === 'SUPERADMIN' && instFilter !== 'all') {
      if (app.service.instituteId !== instFilter) return false;
    }
    // 2. Service Name Filter
    if (serviceFilter !== 'all') {
      if (app.service.name !== serviceFilter) return false;
    }
    // 3. Programme Category Filter
    if (catFilter !== 'all') {
      if (app.programme.category !== catFilter) return false;
    }
    // 4. Date Range Filter
    if (dateFilter !== 'all') {
      const appDate = new Date(app.createdAt);
      const today = new Date();
      if (dateFilter === 'today') {
        const isToday = appDate.getDate() === today.getDate() &&
                        appDate.getMonth() === today.getMonth() &&
                        appDate.getFullYear() === today.getFullYear();
        if (!isToday) return false;
      } else if (dateFilter === 'week') {
        const diffTime = Math.abs(today.getTime() - appDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      } else if (dateFilter === 'month') {
        const diffTime = Math.abs(today.getTime() - appDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return false;
      }
    }
    return true;
  });

  // Compute filtered services list client-side
  const filteredServices = services.filter((srv) => {
    // 1. Institute Filter (Superadmin only)
    if (user && user.role === 'SUPERADMIN' && srvInstFilter !== 'all') {
      if (srv.instituteId !== srvInstFilter) return false;
    }
    // 2. GST Filter
    if (srvGstFilter !== 'all') {
      if (srvGstFilter === 'exempt' && !srv.isGstExempt) return false;
      if (srvGstFilter === 'taxable' && srv.isGstExempt) return false;
    }
    // 3. Search Filter
    if (srvSearchText.trim() !== '') {
      const query = srvSearchText.toLowerCase();
      const matchName = srv.name.toLowerCase().includes(query);
      const matchInstName = srv.institute.name.toLowerCase().includes(query) || srv.institute.code.toLowerCase().includes(query);
      if (!matchName && !matchInstName) return false;
    }
    return true;
  });

  // 2. Form states for creating/editing master records
  // Institute Form
  const [showInstForm, setShowInstForm] = useState(false);
  const [editingInstId, setEditingInstId] = useState(null);
  const [instName, setInstName] = useState('');
  const [instCode, setInstCode] = useState('');
  const [instPayuKey, setInstPayuKey] = useState('');
  const [instPayuSalt, setInstPayuSalt] = useState('');
  const [instStatus, setInstStatus] = useState('ACTIVE');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpCc, setSmtpCc] = useState('');

  // Programme Form
  const [showProgForm, setShowProgForm] = useState(false);
  const [editingProgId, setEditingProgId] = useState(null);
  const [progInstId, setProgInstId] = useState('');
  const [progName, setProgName] = useState('');
  const [progCategory, setProgCategory] = useState('University'); // University, AICTE, Autonomous, Pharma
  const [progDuration, setProgDuration] = useState('2 Years');

  // Service Form
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [srvInstId, setSrvInstId] = useState('');
  const [srvName, setSrvName] = useState('');
  const [srvCalcType, setSrvCalcType] = useState('FIXED'); // FIXED, FLAT_COPY_WISE, BASE_PLUS_ADDITIONAL, SEMESTER_WISE
  const [srvBasePrice, setSrvBasePrice] = useState(100);
  const [srvAddPrice, setSrvAddPrice] = useState(0);
  const [srvGstRate, setSrvGstRate] = useState(18);
  const [srvIsExempt, setSrvIsExempt] = useState(false);
  
  // Form Builder fields state
  const [srvFields, setSrvFields] = useState([
    { label: 'Purpose of Document', type: 'text', required: true, options: '' }
  ]);

  // User Form
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [usrName, setUsrName] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrPassword, setUsrPassword] = useState('');
  const [usrRole, setUsrRole] = useState('INSTITUTE_ADMIN'); // SUPERADMIN, INSTITUTE_ADMIN, ACCOUNTANT
  const [usrInstId, setUsrInstId] = useState('');

  // Password reset modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [resetUserName, setResetUserName] = useState('');
  const [resetUserPass, setResetUserPass] = useState('');

  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Audit Logs Search state
  const [searchLogsText, setSearchLogsText] = useState('');

  // Load applications or master configurations depending on active tab
  useEffect(() => {
    if (!user) return;

    if (activeTab === 'applications') {
      fetchApplicationsAndReports();
    } else {
      fetchMasterData();
    }
  }, [user, activeTab, statusFilter, searchText, searchLogsText]);

  // Polling interval for live-updating audit logs
  useEffect(() => {
    if (!user || activeTab !== 'logs') return;

    const intervalId = setInterval(() => {
      api.getAdminAuditLogs(searchLogsText)
        .then((logsData) => {
          setAuditLogs(logsData);
        })
        .catch((err) => {
          console.error('Silent logs polling error:', err);
        });
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [user, activeTab, searchLogsText]);

  // Fetch applications list and reports
  const fetchApplicationsAndReports = async () => {
    setLoadingApps(true);
    setActionError('');
    try {
      const apps = await api.getApplications(statusFilter, searchText);
      setApplications(apps);

      const rpts = await api.getReports();
      setReports(rpts);

      if (selectedApp) {
        const refreshed = apps.find((a) => a.id === selectedApp.id);
        if (refreshed) {
          setSelectedApp(refreshed);
          setRemarks(refreshed.remarks || '');
        } else {
          setSelectedApp(null);
          setRemarks('');
        }
      }
    } catch (err) {
      console.error(err);
      setActionError('Failed to load applications list or metrics.');
    } finally {
      setLoadingApps(false);
    }
  };

  // Fetch master data configs (Superadmin & Scoped Admin view)
  const fetchMasterData = async () => {
    setLoadingMaster(true);
    setActionError('');
    try {
      if (activeTab === 'institutes') {
        const data = await api.getAdminInstitutes();
        setInstitutes(data);
      } else if (activeTab === 'programmes') {
        const progsData = await api.getAdminProgrammes();
        setProgrammes(progsData);
        if (isSuperadmin) {
          const instsData = await api.getAdminInstitutes();
          setInstitutes(instsData);
          if (instsData.length > 0 && !progInstId) {
            setProgInstId(instsData[0].id);
          }
        } else {
          setProgInstId(user.instituteId || '');
        }
      } else if (activeTab === 'services') {
        const srvsData = await api.getAdminServices();
        setServices(srvsData);
        if (isSuperadmin) {
          const instsData = await api.getAdminInstitutes();
          setInstitutes(instsData);
          if (instsData.length > 0 && !srvInstId) {
            setSrvInstId(instsData[0].id);
          }
        } else {
          setSrvInstId(user.instituteId || '');
        }
      } else if (activeTab === 'users') {
        if (isSuperadmin) {
          const usrsData = await api.getAdminUsers();
          setUsers(usrsData);
          const instsData = await api.getAdminInstitutes();
          setInstitutes(instsData);
          if (instsData.length > 0 && !usrInstId) {
            setUsrInstId(instsData[0].id);
          }
        }
      } else if (activeTab === 'logs') {
        if (isSuperadmin) {
          const logsData = await api.getAdminAuditLogs(searchLogsText);
          setAuditLogs(logsData);
        }
      }
    } catch (err) {
      console.error(err);
      setActionError('Failed to fetch master configuration lists.');
    } finally {
      setLoadingMaster(false);
    }
  };

  // Authenticate Admin Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const data = await api.login(email, password);
      localStorage.setItem('token', data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      setLoginError(err.message || 'Login failed. Invalid credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Fulfill Application (Mark as Completed)
  const handleFulfillSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    setFulfilling(true);
    setActionError('');

    try {
      await api.fulfillApplication(selectedApp.id, remarks);
      await fetchApplicationsAndReports();
    } catch (err) {
      console.error(err);
      setActionError(err.message || 'Failed to update application status.');
    } finally {
      setFulfilling(false);
    }
  };

  // Export visible applications list to CSV for Accountant Reconciliation
  const handleExportCSV = () => {
    if (filteredApplications.length === 0) return;

    const headers = [
      'Transaction ID', 'Student Name', 'Student Email', 'Student Phone',
      'Roll Number', 'Programme', 'Service Requested', 'Base Price (Rs)',
      'CGST (Rs)', 'SGST (Rs)', 'Total GST (Rs)', 'Round Off (Rs)',
      'Total Amount Paid (Rs)', 'Status', 'Created Date', 'Admin Remarks'
    ];

    const rows = filteredApplications.map((app) => [
      `"${app.payuTxnId}"`,
      `"${app.studentName}"`,
      `"${app.studentEmail}"`,
      `"${app.studentPhone}"`,
      `"${app.studentRollNo}"`,
      `"${app.programme.name}"`,
      `"${app.service.name}"`,
      Number(app.baseAmount).toFixed(2),
      Number(app.cgstAmount).toFixed(2),
      Number(app.sgstAmount).toFixed(2),
      Number(app.gstAmount).toFixed(2),
      Number(app.roundOff).toFixed(2),
      Number(app.totalAmount).toFixed(2),
      `"${app.status}"`,
      `"${new Date(app.createdAt).toLocaleDateString('en-IN')}"`,
      `"${app.remarks || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MET_Registrar_Report_${statusFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open formatted browser print window for single application receipt details
  const handlePrintApp = (app) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is preventing opening the print window. Please allow popups.');
      return;
    }

    const itemsHtml = Object.entries(app.submittedData || {})
      .map(([key, val]) => {
        const isFile = typeof val === 'string' && val.includes('/uploads/');
        return `
          <tr style="border-bottom: 1px dashed #e5e7eb;">
            <td style="padding: 8px; font-weight: bold; text-transform: capitalize; color: #4b5563; width: 40%;">${key.replace(/_/g, ' ')}</td>
            <td style="padding: 8px; color: #111827;">${isFile ? '[Document Uploaded]' : (Array.isArray(val) ? val.join(', ') : val)}</td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <html>
        <head>
          <title>MET Registrar Services - Application Receipt Details</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #111827; padding: 20px; line-height: 1.5; margin: 0; }
            .header { border-bottom: 2px solid #0B3384; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { color: #0B3384; margin: 0 0 5px 0; font-size: 24px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .section { border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; background-color: #f9fafb; }
            .section h2 { font-size: 14px; margin-top: 0; color: #0B3384; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { text-align: left; padding: 8px; }
            .total-table td { border-bottom: 1px solid #e5e7eb; }
            .total-row { font-weight: bold; font-size: 14px; color: #0B3384; background-color: #f3f4f6; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .badge-success { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
            .badge-pending { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0B3384; padding-bottom: 15px; margin-bottom: 20px;">
            <div>
              <h1 style="color: #0B3384; margin: 0 0 5px 0; font-size: 24px;">MET Registrar Services</h1>
              <span style="font-size: 12px; color: #6b7280;">Application Details Report</span>
            </div>
            <div>
              <span class="badge ${app.status === 'FULFILLED' ? 'badge-success' : 'badge-pending'}">${app.status === 'SUCCESS' ? 'PAID' : app.status}</span>
            </div>
          </div>

          <div class="grid">
            <div class="section">
              <h2>Student Profile</h2>
              <table>
                <tr><td style="font-weight: bold; width: 35%;">Name:</td><td>${app.studentName}</td></tr>
                <tr><td style="font-weight: bold;">Email:</td><td>${app.studentEmail}</td></tr>
                <tr><td style="font-weight: bold;">Phone:</td><td>${app.studentPhone}</td></tr>
                <tr><td style="font-weight: bold;">Roll No:</td><td>${app.studentRollNo}</td></tr>
                <tr><td style="font-weight: bold;">Programme:</td><td>${app.programme.name}</td></tr>
              </table>
            </div>
            
            <div class="section">
              <h2>Transaction Details</h2>
              <table>
                <tr><td style="font-weight: bold; width: 35%;">Transaction ID:</td><td style="font-family: monospace;">${app.payuTxnId}</td></tr>
                <tr><td style="font-weight: bold;">Date:</td><td>${new Date(app.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td></tr>
                <tr><td style="font-weight: bold;">Service Requested:</td><td>${app.service.name}</td></tr>
                <tr><td style="font-weight: bold;">Status:</td><td>${app.status === 'SUCCESS' ? 'PAID / SUCCESS' : app.status}</td></tr>
              </table>
            </div>
          </div>

          <div class="section" style="margin-bottom: 20px;">
            <h2>Submitted Form Responses</h2>
            <table>
              ${itemsHtml || '<tr><td colspan="2" style="color: #9ca3af; text-align: center;">No dynamic fields submitted.</td></tr>'}
            </table>
          </div>

          <div class="section" style="max-width: 400px; margin-left: auto;">
            <h2>Tax & Pricing Splits</h2>
            <table class="total-table">
              <tr><td>Base Fee Amount:</td><td style="text-align: right;">₹${Number(app.baseAmount).toFixed(2)}</td></tr>
              <tr><td>CGST Split (50%):</td><td style="text-align: right;">₹${Number(app.cgstAmount).toFixed(2)}</td></tr>
              <tr><td>SGST Split (50%):</td><td style="text-align: right;">₹${Number(app.sgstAmount).toFixed(2)}</td></tr>
              <tr><td>Round Off Difference:</td><td style="text-align: right;">${Number(app.roundOff) >= 0 ? '+' : ''}₹${Number(app.roundOff).toFixed(2)}</td></tr>
              <tr class="total-row"><td>Grand Total Paid:</td><td style="text-align: right;">₹${Number(app.totalAmount).toFixed(0)}</td></tr>
            </table>
          </div>

          <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px;">
            This is an official document generated by the MET Registrar Administrative Portal.
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --- CRUD ACTIONS: INSTITUTES ---
  const handleCreateOrUpdateInst = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    const payload = {
      name: instName,
      code: instCode,
      payuMerchantKey: instPayuKey,
      payuSalt: instPayuSalt,
      status: instStatus,
      smtpConfig: {
        host: smtpHost,
        port: parseInt(smtpPort) || 587,
        user: smtpUser,
        pass: smtpPass,
        ccEmail: smtpCc,
      },
    };

    try {
      if (editingInstId) {
        await api.updateAdminInstitute(editingInstId, payload);
        setActionSuccess(`Institute "${instName}" updated successfully!`);
      } else {
        await api.createAdminInstitute(payload);
        setActionSuccess(`Institute "${instName}" created successfully!`);
      }
      
      resetInstForm();
      fetchMasterData();
    } catch (err) {
      setActionError(err.message || 'Failed to save institute.');
    }
  };

  const handleEditInstClick = (inst) => {
    setEditingInstId(inst.id);
    setInstName(inst.name);
    setInstCode(inst.code);
    setInstPayuKey(inst.payuMerchantKey || '');
    setInstPayuSalt(inst.payuSalt || '');
    setInstStatus(inst.status);
    
    const smtp = inst.smtpConfig || {};
    setSmtpHost(smtp.host || 'smtp.gmail.com');
    setSmtpPort(String(smtp.port || '587'));
    setSmtpUser(smtp.user || '');
    setSmtpPass(smtp.pass || '');
    setSmtpCc(smtp.ccEmail || '');
    
    setShowInstForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetInstForm = () => {
    setShowInstForm(false);
    setEditingInstId(null);
    setInstName('');
    setInstCode('');
    setInstPayuKey('');
    setInstPayuSalt('');
    setInstStatus('ACTIVE');
    setSmtpHost('smtp.gmail.com');
    setSmtpPort('587');
    setSmtpUser('');
    setSmtpPass('');
    setSmtpCc('');
  };

  // --- CRUD ACTIONS: PROGRAMMES ---
  const handleCreateOrUpdateProgramme = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    const payload = {
      instituteId: progInstId,
      name: progName,
      category: progCategory,
      duration: progDuration,
    };

    try {
      if (editingProgId) {
        await api.updateAdminProgramme(editingProgId, payload);
        setActionSuccess(`Programme "${progName}" updated successfully.`);
      } else {
        await api.createAdminProgramme(payload);
        setActionSuccess(`Programme "${progName}" added successfully.`);
      }
      resetProgForm();
      fetchMasterData();
    } catch (err) {
      setActionError(err.message || 'Failed to save programme.');
    }
  };

  const handleEditProgClick = (prog) => {
    setEditingProgId(prog.id);
    setProgInstId(prog.instituteId);
    setProgName(prog.name);
    setProgCategory(prog.category);
    setProgDuration(prog.duration);
    setShowProgForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProgramme = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete programme "${name}"?`)) return;
    setActionError('');
    setActionSuccess('');
    try {
      await api.deleteAdminProgramme(id);
      setActionSuccess(`Programme "${name}" deleted.`);
      fetchMasterData();
    } catch (err) {
      setActionError(err.message || 'Failed to delete programme.');
    }
  };

  const resetProgForm = () => {
    setShowProgForm(false);
    setEditingProgId(null);
    setProgName('');
    setProgCategory('University');
    setProgDuration('2 Years');
    if (institutes.length > 0) setProgInstId(institutes[0].id);
  };

  // --- DYNAMIC FORM BUILDER ACTIONS ---
  const handleAddField = () => {
    setSrvFields([...srvFields, { label: '', type: 'text', required: true, options: '' }]);
  };

  const handleRemoveField = (index) => {
    if (srvFields.length === 1) {
      setActionError('At least one form field is required.');
      return;
    }
    setSrvFields(srvFields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index, key, val) => {
    const updated = [...srvFields];
    updated[index][key] = val;
    setSrvFields(updated);
  };

  // --- CRUD ACTIONS: SERVICES ---
  const handleCreateOrUpdateService = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (srvFields.some(f => !f.label.trim())) {
      setActionError('All form fields must have a label entered.');
      return;
    }

    try {
      const formSchema = srvFields.map((field) => {
        const name = field.label
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/(^_|_$)/g, ''); // trim underscores

        const res = {
          name,
          label: field.label.trim(),
          type: field.type,
          required: !!field.required,
        };

        if (field.type === 'select' || field.type === 'multiselect') {
          res.options = field.options
            .split(',')
            .map((o) => o.trim())
            .filter((o) => o !== '');
          
          if (!res.options || res.options.length === 0) {
            throw new Error(`Please specify comma-separated options for choice field "${field.label}".`);
          }
        }
        return res;
      });

      const payload = {
        instituteId: srvInstId,
        name: srvName,
        formSchema: formSchema,
        feeCalculationType: srvCalcType,
        basePrice: parseFloat(String(srvBasePrice)) || 0,
        additionalPrice: parseFloat(String(srvAddPrice)) || 0,
        gstRate: parseFloat(String(srvGstRate)) || 0,
        isGstExempt: srvIsExempt,
      };

      if (editingServiceId) {
        await api.updateAdminService(editingServiceId, payload);
        setActionSuccess(`Service "${srvName}" updated successfully!`);
      } else {
        await api.createAdminService(payload);
        setActionSuccess(`Service "${srvName}" created successfully!`);
      }
      resetServiceForm();
      fetchMasterData();
    } catch (err) {
      setActionError(err.message || 'Failed to save service.');
    }
  };

  const handleEditServiceClick = (srv) => {
    setEditingServiceId(srv.id);
    setSrvInstId(srv.instituteId);
    setSrvName(srv.name);
    setSrvCalcType(srv.feeCalculationType);
    setSrvBasePrice(Number(srv.basePrice));
    setSrvAddPrice(Number(srv.additionalPrice));
    setSrvGstRate(Number(srv.gstRate));
    setSrvIsExempt(srv.isGstExempt);
    
    const builderFields = srv.formSchema.map((field) => ({
      label: field.label,
      type: field.type,
      required: !!field.required,
      options: Array.isArray(field.options) ? field.options.join(', ') : '',
    }));
    
    setSrvFields(builderFields);
    setShowServiceForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteService = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete service "${name}"?`)) return;
    setActionError('');
    setActionSuccess('');
    try {
      await api.deleteAdminService(id);
      setActionSuccess(`Service "${name}" deleted.`);
      fetchMasterData();
    } catch (err) {
      setActionError(err.message || 'Failed to delete service.');
    }
  };

  const resetServiceForm = () => {
    setShowServiceForm(false);
    setEditingServiceId(null);
    setSrvName('');
    setSrvCalcType('FIXED');
    setSrvBasePrice(100);
    setSrvAddPrice(0);
    setSrvGstRate(18);
    setSrvIsExempt(false);
    setSrvFields([
      { label: 'Purpose of Document', type: 'text', required: true, options: '' }
    ]);
  };

  // --- CRUD ACTIONS: USERS ---
  const handleCreateOrUpdateUser = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    const payload = {
      name: usrName,
      email: usrEmail,
      role: usrRole,
      instituteId: usrRole === 'SUPERADMIN' ? null : usrInstId,
    };

    try {
      if (editingUserId) {
        await api.updateAdminUser(editingUserId, payload);
        setActionSuccess(`Admin account for "${usrName}" updated successfully.`);
      } else {
        if (!usrPassword) {
          setActionError('Password is required for new accounts.');
          return;
        }
        await api.createAdminUser({
          ...payload,
          password: usrPassword,
        });
        setActionSuccess(`Admin account for "${usrName}" created.`);
      }
      resetUserForm();
      fetchMasterData();
    } catch (err) {
      setActionError(err.message || 'Failed to save user account.');
    }
  };

  const handleEditUserClick = (u) => {
    setEditingUserId(u.id);
    setUsrName(u.name);
    setUsrEmail(u.email);
    setUsrPassword('');
    setUsrRole(u.role);
    setUsrInstId(u.instituteId || '');
    setShowUserForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetUserForm = () => {
    setShowUserForm(false);
    setEditingUserId(null);
    setUsrName('');
    setUsrEmail('');
    setUsrPassword('');
    setUsrRole('INSTITUTE_ADMIN');
    if (institutes.length > 0) setUsrInstId(institutes[0].id);
  };

  const handleTriggerResetPass = (id, name) => {
    setResetUserId(id);
    setResetUserName(name);
    setResetUserPass('');
    setShowResetModal(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetUserPass.trim()) {
      alert('Password cannot be empty.');
      return;
    }

    setActionError('');
    setActionSuccess('');
    try {
      await api.resetAdminPassword(resetUserId, resetUserPass.trim());
      setActionSuccess(`Password reset successfully for user account "${resetUserName}".`);
      setShowResetModal(false);
    } catch (err) {
      setActionError(err.message || 'Failed to reset password.');
    }
  };

  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setUpdatingProfile(true);

    try {
      const updatedUser = await api.updateAdminProfile({
        name: profileName,
        email: profileEmail,
        password: profilePassword ? profilePassword.trim() : undefined,
      });
      
      if (onLoginSuccess) {
        onLoginSuccess({
          ...user,
          name: updatedUser.name,
          email: updatedUser.email,
        });
      }
      setActionSuccess('Your account profile has been updated.');
      setShowProfileModal(false);
      setProfilePassword('');
    } catch (err) {
      setActionError(err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete admin account "${name}"?`)) return;
    setActionError('');
    setActionSuccess('');
    try {
      await api.deleteAdminUser(id);
      setActionSuccess(`User account "${name}" deleted.`);
      fetchMasterData();
    } catch (err) {
      setActionError(err.message || 'Failed to delete user.');
    }
  };


  // --- RENDER LOGIN GATE IF NOT AUTHENTICATED ---
  if (!user) {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
        <form onSubmit={handleLoginSubmit} className="card glass" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="card-header" style={{ textAlign: 'center' }}>
            <ClipboardList size={32} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
            <h3>College Registrar Login</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admin/Accountant Access Only</p>
          </div>

          <div className="card-body">
            {loginError && (
              <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
                <AlertCircle size={16} /> {loginError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                required 
                placeholder="e.g. mimadmin@met.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                required 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', height: '42px', marginTop: '0.5rem' }}
              disabled={loginLoading}
            >
              {loginLoading ? <Loader2 className="spinner" /> : 'Secure Login'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- RENDER ADMIN CONTROL PANEL ---
  const isSuperadmin = user.role === 'SUPERADMIN';
  const metrics = reports?.metrics;

  return (
    <div className="admin-dashboard-container">
      {/* 1. Header Admin Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem' }}>MET Registrar Administration</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Landmark size={14} /> Active Session: <strong>{user.instituteName || 'Super Admin'} Panel</strong>
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowProfileModal(true)} className="btn btn-secondary">
            <User size={16} /> My Account
          </button>
          
          {activeTab === 'applications' && applications.length > 0 && (
            <button onClick={handleExportCSV} className="btn btn-secondary">
              <Download size={16} /> Export Reconciliation CSV
            </button>
          )}
        </div>
      </div>

      {/* Superadmin & Institute Admin Tab Bar Selector */}
      {(isSuperadmin || user.role === 'INSTITUTE_ADMIN') && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className="btn"
            onClick={() => setActiveTab('applications')}
            style={{ 
              padding: '0.5rem 1rem', 
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'applications' ? 'var(--secondary)' : 'transparent',
              color: activeTab === 'applications' ? 'white' : 'var(--text-main)',
              border: '1px solid',
              borderColor: activeTab === 'applications' ? 'var(--secondary)' : 'var(--border)'
            }}
          >
            <ClipboardList size={14} /> Applications & Revenue
          </button>
          {(isSuperadmin || user.role === 'INSTITUTE_ADMIN') && (
            <button 
              className="btn"
              onClick={() => { setActiveTab('institutes'); resetInstForm(); }}
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.85rem',
                backgroundColor: activeTab === 'institutes' ? 'var(--secondary)' : 'transparent',
                color: activeTab === 'institutes' ? 'white' : 'var(--text-main)',
                border: '1px solid',
                borderColor: activeTab === 'institutes' ? 'var(--secondary)' : 'var(--border)'
              }}
            >
              <Landmark size={14} /> {isSuperadmin ? 'MET Institutes' : 'My Institute'}
            </button>
          )}
          <button 
            className="btn"
            onClick={() => { setActiveTab('programmes'); resetProgForm(); }}
            style={{ 
              padding: '0.5rem 1rem', 
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'programmes' ? 'var(--secondary)' : 'transparent',
              color: activeTab === 'programmes' ? 'white' : 'var(--text-main)',
              border: '1px solid',
              borderColor: activeTab === 'programmes' ? 'var(--secondary)' : 'var(--border)'
            }}
          >
            <BookOpen size={14} /> Programmes
          </button>
          <button 
            className="btn"
            onClick={() => { setActiveTab('services'); resetServiceForm(); }}
            style={{ 
              padding: '0.5rem 1rem', 
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'services' ? 'var(--secondary)' : 'transparent',
              color: activeTab === 'services' ? 'white' : 'var(--text-main)',
              border: '1px solid',
              borderColor: activeTab === 'services' ? 'var(--secondary)' : 'var(--border)'
            }}
          >
            <Settings size={14} /> Registrar Services
          </button>
          {isSuperadmin && (
            <button 
              className="btn"
              onClick={() => { setActiveTab('users'); setShowUserForm(false); }}
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.85rem',
                backgroundColor: activeTab === 'users' ? 'var(--secondary)' : 'transparent',
                color: activeTab === 'users' ? 'white' : 'var(--text-main)',
                border: '1px solid',
                borderColor: activeTab === 'users' ? 'var(--secondary)' : 'var(--border)'
              }}
            >
              <Shield size={14} /> Admin Accounts
            </button>
          )}
          {isSuperadmin && (
            <button 
              className="btn"
              onClick={() => { setActiveTab('logs'); setSearchLogsText(''); }}
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.85rem',
                backgroundColor: activeTab === 'logs' ? 'var(--secondary)' : 'transparent',
                color: activeTab === 'logs' ? 'white' : 'var(--text-main)',
                border: '1px solid',
                borderColor: activeTab === 'logs' ? 'var(--secondary)' : 'var(--border)'
              }}
            >
              <Eye size={14} /> Audit Logs
            </button>
          )}
        </div>
      )}

      {/* Global Status messages */}
      {actionError && (
        <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
          <AlertCircle size={16} /> {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
          <CheckCircle2 size={16} /> {actionSuccess}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB VIEW 1: APPLICATIONS & METRICS (Standard Dashboard) */}
      {/* ==================================================== */}
      {activeTab === 'applications' && (
        <>
          {/* Metrics bar */}
          {metrics && (
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>PAID REVENUE</span>
                  <IndianRupee size={16} style={{ color: 'var(--text-light)' }} />
                </div>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>
                  ₹{metrics.totalRevenue.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--text-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>BASE FEES</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)' }}>PORTAL</span>
                </div>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                  ₹{metrics.totalBase.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--success)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TAX SPLIT (CGST/SGST)</span>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>18%</span>
                </div>
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.4rem' }}>
                  CGST: ₹{metrics.totalCgst.toLocaleString('en-IN')}<br/>
                  SGST: ₹{metrics.totalSgst.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>PAID / FULFILLED</span>
                  <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>Count</span>
                </div>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--pending)', marginTop: '0.25rem' }}>
                  {metrics.totalPaidApplications} / {reports.statusDistribution.find(s => s.status === 'FULFILLED')?.count || 0}
                </p>
              </div>
            </div>
          )}

          {/* Split Pane Applications list */}
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 55%', minWidth: 0 }}>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-body" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <button 
                      className={`btn`} 
                      onClick={() => { setStatusFilter('SUCCESS'); setSelectedApp(null); }}
                      style={{
                        borderRadius: 0, padding: '0.5rem 1rem', fontSize: '0.85rem',
                        backgroundColor: statusFilter === 'SUCCESS' ? 'var(--secondary)' : 'transparent',
                        color: statusFilter === 'SUCCESS' ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      New Paid Applications
                    </button>
                    <button 
                      className={`btn`} 
                      onClick={() => { setStatusFilter('FULFILLED'); setSelectedApp(null); }}
                      style={{
                        borderRadius: 0, padding: '0.5rem 1rem', fontSize: '0.85rem',
                        backgroundColor: statusFilter === 'FULFILLED' ? 'var(--secondary)' : 'transparent',
                        color: statusFilter === 'FULFILLED' ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      Completed / Fulfilled
                    </button>
                  </div>

                  <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Search name, roll, txn..." 
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.85rem' }}
                    />
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-light)' }} />
                  </div>

                  {/* Secondary Advanced Filters Row */}
                  <div style={{ width: '100%', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                    {/* 1. Institute Filter (Superadmin only) */}
                    {user && user.role === 'SUPERADMIN' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 120px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>MET College:</span>
                        <select 
                          className="form-input" 
                          value={instFilter} 
                          onChange={(e) => { setInstFilter(e.target.value); setSelectedApp(null); }}
                          style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          <option value="all">All Colleges</option>
                          {institutes.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.code}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 2. Service Requested Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 140px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Service:</span>
                      <select 
                        className="form-input" 
                        value={serviceFilter} 
                        onChange={(e) => { setServiceFilter(e.target.value); setSelectedApp(null); }}
                        style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        <option value="all">All Services</option>
                        {Array.from(new Set(applications.map(app => app.service.name))).map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Program Type Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 120px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category:</span>
                      <select 
                        className="form-input" 
                        value={catFilter} 
                        onChange={(e) => { setCatFilter(e.target.value); setSelectedApp(null); }}
                        style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        <option value="all">All Categories</option>
                        <option value="University">University</option>
                        <option value="AICTE">AICTE</option>
                        <option value="Autonomous">Autonomous</option>
                        <option value="Pharma">Pharma</option>
                      </select>
                    </div>

                    {/* 4. Submission Date Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 120px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Submission Date:</span>
                      <select 
                        className="form-input" 
                        value={dateFilter} 
                        onChange={(e) => { setDateFilter(e.target.value); setSelectedApp(null); }}
                        style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {loadingApps ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                  <Loader2 className="spinner spinner-dark" style={{ margin: '0 auto 1rem' }} />
                  <p>Fetching registrar applications...</p>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="card" style={{ padding: '4rem', textAlign: 'center', borderStyle: 'dashed' }}>
                  <FileText size={32} style={{ color: 'var(--text-light)', marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-muted)' }}>No applications match active secondary filters.</p>
                </div>
              ) : (
                <div className="table-container card">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student Details</th>
                        <th>Service</th>
                        <th>Amount Paid</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.map((app) => {
                        const isSelected = selectedApp && selectedApp.id === app.id;
                        return (
                          <tr 
                            key={app.id} 
                            onClick={() => { setSelectedApp(app); setRemarks(app.remarks || ''); }}
                            style={{ cursor: 'pointer', backgroundColor: isSelected ? 'var(--secondary-light)' : 'transparent' }}
                          >
                            <td>
                              <div style={{ fontWeight: 600 }}>{app.studentName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Roll: {app.studentRollNo} | {app.programme.name}
                              </div>
                              {user && user.role === 'SUPERADMIN' && app.service.institute && (
                                <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', marginTop: '0.25rem', display: 'inline-block' }}>
                                  {app.service.institute.code}
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{app.service.name}</div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontFamily: 'monospace' }}>
                                Txn: {app.payuTxnId}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                              ₹{Number(app.totalAmount).toFixed(0)}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(app.createdAt).toLocaleDateString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Selection detail side-pane */}
            <div style={{ flex: '1 1 45%', position: 'sticky', top: '90px' }}>
              {selectedApp ? (
                <div className="card glass">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Application Details</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handlePrintApp(selectedApp)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', height: '28px' }}
                      >
                        <Printer size={12} /> Print
                      </button>
                      <span className={`badge ${selectedApp.status === 'FULFILLED' ? 'badge-success' : 'badge-pending'}`}>
                        {selectedApp.status === 'SUCCESS' ? 'PAID' : selectedApp.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="card-body" style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--secondary)' }}>Student Profile</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.4rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                        <div><strong>Name:</strong></div><div>{selectedApp.studentName}</div>
                        <div><strong>Email:</strong></div><div>{selectedApp.studentEmail}</div>
                        <div><strong>Phone:</strong></div><div>{selectedApp.studentPhone}</div>
                        <div><strong>Roll No:</strong></div><div>{selectedApp.studentRollNo}</div>
                        <div><strong>Programme:</strong></div><div>{selectedApp.programme.name} ({selectedApp.programme.category})</div>
                        <div><strong>Transaction ID:</strong></div><div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--secondary)' }}>{selectedApp.payuTxnId}</div>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--secondary)' }}>Submitted Form Responses</h4>
                      <div style={{ backgroundColor: 'var(--bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        {Object.entries(selectedApp.submittedData || {}).map(([key, val]) => {
                          const isFile = typeof val === 'string' && val.includes('/uploads/');
                          return (
                            <div key={key} style={{ display: 'flex', flexDirection: 'column', marginBottom: '0.5rem', borderBottom: '1px dashed var(--border)', paddingBottom: '0.4rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                {key.replace(/_/g, ' ')}:
                              </span>
                              {isFile ? (
                                <span style={{ color: 'var(--secondary)' }}>[Document Attached - See attachments below]</span>
                              ) : (
                                <span style={{ color: 'var(--text-main)', marginTop: '0.15rem' }}>
                                  {Array.isArray(val) ? val.join(', ') : String(val)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {selectedApp.documents && selectedApp.documents.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--secondary)' }}>Applicant Attachments</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {selectedApp.documents.map((doc) => (
                            <a 
                              key={doc.id} 
                              href={doc.s3Url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.5rem 0.75rem', width: '100%' }}
                            >
                              <Download size={14} style={{ marginRight: '6px' }} />
                              {doc.fileName}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--secondary)' }}>Tax & Pricing splits</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.25rem', backgroundColor: 'var(--surface-header)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                        <div>Base Fee Amount:</div><div style={{ textAlign: 'right' }}>₹{Number(selectedApp.baseAmount).toFixed(2)}</div>
                        <div>CGST Split (50%):</div><div style={{ textAlign: 'right' }}>₹{Number(selectedApp.cgstAmount).toFixed(2)}</div>
                        <div>SGST Split (50%):</div><div style={{ textAlign: 'right' }}>₹{Number(selectedApp.sgstAmount).toFixed(2)}</div>
                        <div>Round Off Difference:</div><div style={{ textAlign: 'right' }}>{Number(selectedApp.roundOff) >= 0 ? '+' : ''}₹{Number(selectedApp.roundOff).toFixed(2)}</div>
                        <div style={{ fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: '0.25rem', color: 'var(--secondary)' }}>Grand Total Paid:</div>
                        <div style={{ fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: '0.25rem', textAlign: 'right', color: 'var(--secondary)' }}>
                          ₹{Number(selectedApp.totalAmount).toFixed(0)}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MessageSquare size={14} /> Admin Remarks & Processing
                      </h4>
                      
                      {selectedApp.status === 'SUCCESS' ? (
                        <form onSubmit={handleFulfillSubmit}>
                          <textarea 
                            className="form-input" 
                            placeholder="Type processing notes or transaction logs here... (e.g. Certificate sent manually via email)"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            style={{ height: '70px', fontSize: '0.85rem', resize: 'none', marginBottom: '0.75rem' }}
                          />
                          
                          <button 
                            type="submit" 
                            className="btn btn-accent" 
                            style={{ width: '100%', height: '38px' }}
                            disabled={fulfilling}
                          >
                            {fulfilling ? <Loader2 className="spinner" /> : <><CheckCircle2 size={16} /> Mark as Fulfilled</>}
                          </button>
                        </form>
                      ) : (
                        <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                          <p style={{ fontWeight: 600 }}>✓ Workflow Fulfilled Offline</p>
                          {selectedApp.remarks && (
                            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-main)', borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '0.25rem' }}>
                              <strong>Remarks:</strong> {selectedApp.remarks}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', borderStyle: 'dashed' }}>
                  <ClipboardList size={36} style={{ color: 'var(--text-light)', marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-muted)' }}>Select an application from the table to view details.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================================================== */}
      {/* TAB VIEW 2: INSTITUTES CONFIGURATION */}
      {/* ==================================================== */}
      {activeTab === 'institutes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3>MET College/Institute Profiles</h3>
            {isSuperadmin && (
              <button 
                className="btn btn-primary" 
                onClick={() => { resetInstForm(); setShowInstForm(!showInstForm); }}
              >
                {showInstForm ? <XCircle size={16} /> : <Plus size={16} />} {showInstForm ? 'Close Form' : 'Add New College'}
              </button>
            )}
          </div>

          {showInstForm && (
            <form onSubmit={handleCreateOrUpdateInst} className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>{editingInstId ? 'Edit Institute' : 'Add New MET Institute'}</h4>
              
              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Institute Name *</label>
                  <input type="text" className="form-input" required placeholder="MET Institute of Management" disabled={!isSuperadmin} value={instName} onChange={e => setInstName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Institute Code (Unique abbreviation) *</label>
                  <input type="text" className="form-input" required placeholder="MIM" disabled={editingInstId !== null} value={instCode} onChange={e => setInstCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" disabled={!isSuperadmin} value={instStatus} onChange={e => setInstStatus(e.target.value)}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <h5 style={{ margin: '1rem 0 0.5rem', color: 'var(--secondary)' }}>PayU Payment Gateway Config</h5>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">PayU Merchant Key</label>
                  <input type="text" className="form-input" placeholder="Merchant Key" value={instPayuKey} onChange={e => setInstPayuKey(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">PayU Merchant Salt</label>
                  <input type="text" className="form-input" placeholder="Merchant Salt" value={instPayuSalt} onChange={e => setInstPayuSalt(e.target.value)} />
                </div>
              </div>

              <h5 style={{ margin: '1rem 0 0.5rem', color: 'var(--secondary)' }}>SMTP Email Configuration</h5>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">SMTP Host</label>
                  <input type="text" className="form-input" placeholder="smtp.gmail.com" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">SMTP Port</label>
                  <input type="text" className="form-input" placeholder="587" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Admin CC Email</label>
                  <input type="text" className="form-input" placeholder="mimadmin@met.edu" value={smtpCc} onChange={e => setSmtpCc(e.target.value)} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">SMTP Username (Auth)</label>
                  <input type="text" className="form-input" placeholder="user@gmail.com" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">SMTP Password</label>
                  <input type="password" className="form-input" placeholder="••••••••" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">Save Institute</button>
                <button type="button" className="btn btn-secondary" onClick={resetInstForm}><XCircle size={14} style={{ marginRight: '6px' }} /> Cancel</button>
              </div>
            </form>
          )}

          {/* List Table */}
          {loadingMaster ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spinner spinner-dark" /></div>
          ) : (
            <div className="table-container card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>College/Institute Name</th>
                    <th>PayU Setup</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {institutes.map((inst) => (
                    <tr key={inst.id}>
                      <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{inst.code}</td>
                      <td>{inst.name}</td>
                      <td>
                        {inst.payuMerchantKey ? (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Configured</span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Missing Credentials</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${inst.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {inst.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem' }} onClick={() => handleEditInstClick(inst)}>
                          <Edit3 size={14} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB VIEW 3: PROGRAMMES CONFIGURATION */}
      {/* ==================================================== */}
      {activeTab === 'programmes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3>Academic Programme Master</h3>
            <button 
              className="btn btn-primary" 
              onClick={() => { if (showProgForm) resetProgForm(); else setShowProgForm(true); }}
            >
              {showProgForm ? <XCircle size={16} /> : <Plus size={16} />} {showProgForm ? 'Close Form' : 'Add Programme'}
            </button>
          </div>

          {showProgForm && (
            <form onSubmit={handleCreateOrUpdateProgramme} className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem', maxWidth: '500px' }}>
              <h4 style={{ marginBottom: '1rem' }}>{editingProgId ? 'Edit Programme Mapping' : 'Map New Programme'}</h4>
              
              <div className="form-group">
                <label className="form-label">Linked Institute *</label>
                {isSuperadmin ? (
                  <select className="form-input" required value={progInstId} onChange={e => setProgInstId(e.target.value)}>
                    {institutes.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" className="form-input" disabled value={user.instituteName || 'Your College'} />
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Programme Name *</label>
                <input type="text" className="form-input" required placeholder="e.g. B.Tech (Information Technology)" value={progName} onChange={e => setProgName(e.target.value)} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-input" value={progCategory} onChange={e => setProgCategory(e.target.value)}>
                    <option value="University">University</option>
                    <option value="AICTE">AICTE</option>
                    <option value="Autonomous">Autonomous</option>
                    <option value="Pharma">Pharma</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration *</label>
                  <input type="text" className="form-input" required placeholder="e.g. 4 Years" value={progDuration} onChange={e => setProgDuration(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">Save Programme</button>
                <button type="button" className="btn btn-secondary" onClick={resetProgForm}><XCircle size={14} style={{ marginRight: '6px' }} /> Cancel</button>
              </div>
            </form>
          )}

          {loadingMaster ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spinner spinner-dark" /></div>
          ) : (
            <div className="table-container card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>College/Institute</th>
                    <th>Programme Name</th>
                    <th>Category</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programmes.map((prog) => (
                    <tr key={prog.id}>
                      <td><strong>{prog.institute.name}</strong></td>
                      <td>{prog.name}</td>
                      <td><span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{prog.category}</span></td>
                      <td>{prog.duration}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem' }} onClick={() => handleEditProgClick(prog)}>
                            <Edit3 size={14} /> Edit
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem', color: 'var(--danger)' }} onClick={() => handleDeleteProgramme(prog.id, prog.name)}>
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB VIEW 4: SERVICES CONFIGURATION */}
      {/* ==================================================== */}
      {activeTab === 'services' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3>Registrar Service Catalog & Fee Formulas</h3>
            <button 
              className="btn btn-primary" 
              onClick={() => { resetServiceForm(); setShowServiceForm(!showServiceForm); }}
            >
              {showServiceForm ? <XCircle size={16} /> : <Plus size={16} />} {showServiceForm ? 'Close Form' : 'Create New Service'}
            </button>
          </div>

          {showServiceForm && (
            <form onSubmit={handleCreateOrUpdateService} className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>{editingServiceId ? 'Edit Service' : 'Create New Document Service'}</h4>
              
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Linked Institute *</label>
                  {isSuperadmin ? (
                    <select className="form-input" required disabled={editingServiceId !== null} value={srvInstId} onChange={e => setSrvInstId(e.target.value)}>
                      {institutes.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" className="form-input" disabled value={user.instituteName || 'Your College'} />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Service Name (e.g. Official Transcripts) *</label>
                  <input type="text" className="form-input" required placeholder="Official Transcripts" value={srvName} onChange={e => setSrvName(e.target.value)} />
                </div>
              </div>

              <h5 style={{ margin: '1rem 0 0.5rem', color: 'var(--secondary)' }}>GST & Fee Formula Config</h5>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Calculation Type *</label>
                  <select className="form-input" value={srvCalcType} onChange={e => setSrvCalcType(e.target.value)}>
                    <option value="FIXED">FIXED (Flat rate)</option>
                    <option value="FLAT_COPY_WISE">FLAT_COPY_WISE (Price * copies)</option>
                    <option value="BASE_PLUS_ADDITIONAL">BASE_PLUS_ADDITIONAL (Base + Add * [qty-1])</option>
                    <option value="SEMESTER_WISE">SEMESTER_WISE (Price * semesters)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Base Price (Rs) *</label>
                  <input type="number" className="form-input" required min="0" value={srvBasePrice} onChange={e => setSrvBasePrice(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Additional Price (Rs) (For extra copies)</label>
                  <input type="number" className="form-input" min="0" disabled={srvCalcType !== 'BASE_PLUS_ADDITIONAL'} value={srvAddPrice} onChange={e => setSrvAddPrice(parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">GST Rate (%)</label>
                  <input type="number" className="form-input" min="0" max="100" value={srvGstRate} onChange={e => setSrvGstRate(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '1.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={srvIsExempt} onChange={e => setSrvIsExempt(e.target.checked)} />
                    <strong>Mark Service as GST Exempt (0%)</strong>
                  </label>
                </div>
              </div>

              {/* Dynamic form builder list */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h5 style={{ color: 'var(--primary)', margin: 0 }}>Design Student Application Form Fields</h5>
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleAddField}>
                    <Plus size={14} /> Add Form Field
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {srvFields.map((field, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        gap: '0.75rem', 
                        alignItems: 'flex-start', 
                        backgroundColor: 'var(--bg)', 
                        padding: '1rem', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Field Title/Label *</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          required 
                          placeholder="e.g. Passing Year or Mobile Number" 
                          value={field.label}
                          onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                          style={{ height: '36px', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Input Format *</label>
                        <select 
                          className="form-input" 
                          value={field.type}
                          onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                          style={{ height: '36px', fontSize: '0.85rem' }}
                        >
                          <option value="text">Text Input</option>
                          <option value="number">Number Input</option>
                          <option value="tel">Mobile Number (10 digits)</option>
                          <option value="select">Dropdown Choice</option>
                          <option value="multiselect">Checkbox List</option>
                          <option value="file">File Upload Attachment</option>
                        </select>
                      </div>

                      {(field.type === 'select' || field.type === 'multiselect') && (
                        <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Comma Separated Options *</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            required 
                            placeholder="e.g. 2024, 2025, 2026" 
                            value={field.options}
                            onChange={(e) => handleFieldChange(idx, 'options', e.target.value)}
                            style={{ height: '36px', fontSize: '0.85rem' }}
                          />
                        </div>
                      )}

                      <div className="form-group" style={{ flex: 0.8, display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'center', marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>Required?</label>
                        <input 
                          type="checkbox" 
                          checked={field.required}
                          onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </div>

                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleRemoveField(idx)}
                        style={{ padding: '0.5rem', color: 'var(--danger)', borderColor: 'transparent', alignSelf: 'center', marginTop: '1.2rem' }}
                        title="Delete Field"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary">Save Service</button>
                <button type="button" className="btn btn-secondary" onClick={resetServiceForm}><XCircle size={14} style={{ marginRight: '6px' }} /> Cancel</button>
              </div>
            </form>
          )}

          {/* SERVICES FILTER BAR */}
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            flexWrap: 'wrap', 
            backgroundColor: 'var(--bg-card)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius)', 
            padding: '0.75rem 1rem', 
            marginBottom: '1.25rem',
            alignItems: 'center'
          }}>
            {/* 1. Search Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 200px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Search Services:</span>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search by name or college..." 
                value={srvSearchText} 
                onChange={(e) => setSrvSearchText(e.target.value)} 
                style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              />
            </div>

            {/* 2. Institute Filter (Superadmin only) */}
            {isSuperadmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 150px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>MET College:</span>
                <select 
                  className="form-input" 
                  value={srvInstFilter} 
                  onChange={(e) => setSrvInstFilter(e.target.value)}
                  style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                >
                  <option value="all">All Colleges</option>
                  {institutes.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. GST status Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 150px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>GST Status:</span>
              <select 
                className="form-input" 
                value={srvGstFilter} 
                onChange={(e) => setSrvGstFilter(e.target.value)}
                style={{ height: '32px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              >
                <option value="all">All (Exempt &amp; Taxable)</option>
                <option value="exempt">GST Exempt (Not Applicable)</option>
                <option value="taxable">Taxable (18% GST)</option>
              </select>
            </div>
          </div>

          {loadingMaster ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spinner spinner-dark" /></div>
          ) : (
            <div className="table-container card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>College/Institute</th>
                    <th>Service Name</th>
                    <th>Calculation Formula</th>
                    <th>Base Price</th>
                    <th>GST Setup</th>
                    <th>Fields</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((srv) => (
                    <tr key={srv.id}>
                      <td><strong>{srv.institute.name}</strong></td>
                      <td>{srv.name}</td>
                      <td><code style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{srv.feeCalculationType}</code></td>
                      <td>₹{Number(srv.basePrice).toFixed(0)}</td>
                      <td>
                        {srv.isGstExempt ? (
                          <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>Not Applicable - NA</span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{Number(srv.gstRate)}% GST</span>
                        )}
                      </td>
                      <td>{srv.formSchema.length} fields</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem' }} onClick={() => handleEditServiceClick(srv)}>
                            <Edit3 size={14} /> Edit
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.5rem', color: 'var(--danger)' }} onClick={() => handleDeleteService(srv.id, srv.name)}>
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB VIEW 5: ADMIN ACCOUNTS CONFIGURATION */}
      {/* ==================================================== */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3>System Users & Permissions</h3>
            <button 
              className="btn btn-primary" 
              onClick={() => { if (showUserForm) resetUserForm(); else setShowUserForm(true); }}
            >
              {showUserForm ? <XCircle size={16} /> : <Plus size={16} />} {showUserForm ? 'Close Form' : 'Create Admin Account'}
            </button>
          </div>

          {showUserForm && (
            <form onSubmit={handleCreateOrUpdateUser} className="card glass" style={{ marginBottom: '2rem', padding: '1.5rem', maxWidth: '500px' }}>
              <h4 style={{ marginBottom: '1rem' }}>{editingUserId ? 'Edit Admin / Accountant User' : 'Create Admin / Accountant User'}</h4>
              
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" required placeholder="e.g. Ramesh Patel" value={usrName} onChange={e => setUsrName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input type="email" className="form-input" required placeholder="ramesh@met.edu" value={usrEmail} onChange={e => setUsrEmail(e.target.value)} />
              </div>
              {!editingUserId && (
                <div className="form-group">
                  <label className="form-label">Login Password *</label>
                  <input type="password" className="form-input" required={!editingUserId} placeholder="password123" value={usrPassword} onChange={e => setUsrPassword(e.target.value)} />
                </div>
              )}

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Permission Role *</label>
                  <select className="form-input" value={usrRole} onChange={e => setUsrRole(e.target.value)}>
                    <option value="SUPERADMIN">SUPERADMIN (Global control)</option>
                    <option value="INSTITUTE_ADMIN">INSTITUTE_ADMIN (Scoped college)</option>
                    <option value="ACCOUNTANT">ACCOUNTANT (Read-only scoping)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Associated Institute</label>
                  <select 
                    className="form-input" 
                    disabled={usrRole === 'SUPERADMIN'} 
                    required={usrRole !== 'SUPERADMIN'}
                    value={usrInstId} 
                    onChange={e => setUsrInstId(e.target.value)}
                  >
                    <option value="">-- Associate College --</option>
                    {institutes.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                    ))}
                  </select>
                  <span className="form-hint">Superadmins cannot be associated with a single college.</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary">{editingUserId ? 'Save Changes' : 'Create Account'}</button>
                <button type="button" className="btn btn-secondary" onClick={resetUserForm}><XCircle size={14} style={{ marginRight: '6px' }} /> Cancel</button>
              </div>
            </form>
          )}

          {loadingMaster ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spinner spinner-dark" /></div>
          ) : (
            <div className="table-container card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Email Address</th>
                    <th>System Role</th>
                    <th>College Association</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}><User size={14} /> {u.name}</div></td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'SUPERADMIN' ? 'badge-danger' : u.role === 'INSTITUTE_ADMIN' ? 'badge-success' : 'badge-pending'}`} style={{ fontSize: '0.65rem' }}>
                          {u.role}
                        </span>
                      </td>
                      <td>{u.role === 'SUPERADMIN' ? 'All Institutes (Global)' : (u.institute?.name || 'N/A')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.5rem' }} 
                            onClick={() => handleEditUserClick(u)}
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.5rem' }} 
                            onClick={() => handleTriggerResetPass(u.id, u.name)}
                          >
                            <Key size={14} /> Reset Pass
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.5rem', color: 'var(--danger)' }} 
                            disabled={u.id === user.id}
                            onClick={() => handleDeleteUser(u.id, u.name)}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB VIEW 6: AUDIT LOGS */}
      {/* ==================================================== */}
      {activeTab === 'logs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3>System Activity & Audit Logs</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ width: '250px', position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Filter logs by admin, email, action..." 
                  value={searchLogsText}
                  onChange={(e) => setSearchLogsText(e.target.value)}
                  style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.85rem' }}
                />
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
              </div>
              
              <button 
                type="button" 
                onClick={fetchMasterData} 
                className="btn btn-secondary"
                style={{ height: '36px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                title="Refresh Logs"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {loadingMaster ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spinner spinner-dark" /></div>
          ) : auditLogs.length === 0 ? (
            <div className="card" style={{ padding: '4rem', textAlign: 'center', borderStyle: 'dashed' }}>
              <Eye size={32} style={{ color: 'var(--text-light)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>No audit logs recorded matching search criteria.</p>
            </div>
          ) : (
            <div className="table-container card">
              <table className="data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Administrator</th>
                    <th>Logged Action</th>
                    <th>Metadata Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.userName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{log.userEmail}</div>
                      </td>
                      <td>
                        <code style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.2rem 0.4rem', 
                          borderRadius: '4px',
                          backgroundColor: log.action.includes('DELETE') ? 'var(--danger-bg)' : log.action.includes('CREATE') ? 'var(--success-bg)' : 'var(--bg)',
                          color: log.action.includes('DELETE') ? 'var(--danger)' : log.action.includes('CREATE') ? 'var(--success)' : 'var(--text-main)',
                          fontWeight: 700
                        }}>
                          {log.action}
                        </code>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
                        {renderLogDetails(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. Modal Popup: Reset Password */}
      {showResetModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '1rem'
        }}>
          <form onSubmit={handleResetPasswordSubmit} className="card glass" style={{ width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-lg)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Key size={18} style={{ color: 'var(--primary)' }} /> Reset Password
              </h3>
              <button type="button" className="btn btn-secondary" onClick={() => setShowResetModal(false)} style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            
            <div className="card-body">
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                Set a new login password for user account <strong>{resetUserName}</strong>.
              </p>
              
              <div className="form-group">
                <label className="form-label">New Password *</label>
                <input 
                  type="password" 
                  className="form-input" 
                  required 
                  minLength={6}
                  placeholder="Minimum 6 characters" 
                  value={resetUserPass} 
                  onChange={e => setResetUserPass(e.target.value)} 
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowResetModal(false)}>
                  <XCircle size={14} style={{ marginRight: '6px' }} /> Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Reset Password
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 8. Modal Popup: Profile Settings / Change Password */}
      {showProfileModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '1rem'
        }}>
          <form onSubmit={handleUpdateProfileSubmit} className="card glass" style={{ width: '100%', maxWidth: '450px', boxShadow: 'var(--shadow-lg)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={18} style={{ color: 'var(--primary)' }} /> My Account Settings
              </h3>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowProfileModal(false); setProfilePassword(''); }} style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={profileName} 
                  onChange={e => setProfileName(e.target.value)} 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input 
                  type="email" 
                  className="form-input" 
                  required 
                  value={profileEmail} 
                  onChange={e => setProfileEmail(e.target.value)} 
                />
              </div>
              
              <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                <label className="form-label">Change Password (Optional)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Enter new password to change it" 
                  value={profilePassword} 
                  onChange={e => setProfilePassword(e.target.value)} 
                />
                <span className="form-hint">Leave blank if you do not want to change your current password.</span>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowProfileModal(false); setProfilePassword(''); }}>
                  <XCircle size={14} style={{ marginRight: '6px' }} /> Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={updatingProfile}>
                  {updatingProfile ? <Loader2 className="spinner" /> : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
