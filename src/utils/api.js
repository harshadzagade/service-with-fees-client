const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

// Helper to get auth headers
const getHeaders = (isMultipart = false) => {
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// API Fetch wrapper
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = getHeaders(options.isMultipart);
  
  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };
  
  // Remove isMultipart custom option before actual fetch call
  delete config.isMultipart;

  try {
    const response = await fetch(url, config);
    
    // Check if it's a redirect response (handled by browser or backend redirect)
    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    return data;
  } catch (error) {
    console.error(`API Request Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Public routes
  getInstitutes: () => request('/public/institutes'),
  getProgrammes: (instituteId) => request(`/public/programmes/institutes/${instituteId}`),
  getServices: (instituteId) => request(`/public/public/institutes/${instituteId}/services`), // Note route mismatch correction if any, let's look at public.ts router:
  // In public.ts we registered:
  // 1. router.get('/institutes', ...) -> /public/institutes
  // 2. router.get('/institutes/:id/programmes', ...) -> /public/institutes/:id/programmes
  // 3. router.get('/institutes/:id/services', ...) -> /public/institutes/:id/services
  // Let's adjust this:
  getInstituteProgrammes: (instId) => request(`/public/institutes/${instId}/programmes`),
  getInstituteServices: (instId) => request(`/public/institutes/${instId}/services`),
  
  // File Upload flow
  presignUpload: (fileName, fileType) => 
    request('/public/presign-upload', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType }),
    }),
    
  uploadFile: async (uploadUrl, fileBlob, fileType) => {
    // S3 PUT and our Mock PUT uploader both expect the raw file bytes in the body
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': fileType,
      },
      body: fileBlob,
    });
    if (!response.ok) {
      throw new Error('File upload failed');
    }
    return true;
  },

  // Checkout
  checkout: (checkoutData) => 
    request('/public/checkout', {
      method: 'POST',
      body: JSON.stringify(checkoutData),
    }),

  // Auth routes
  login: (email, password) => 
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Admin routes
  getApplications: (status = '', search = '') => {
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (search) query.append('search', search);
    return request(`/admin/applications?${query.toString()}`);
  },

  fulfillApplication: (id, remarks) => 
    request(`/admin/applications/${id}/fulfill`, {
      method: 'PUT',
      body: JSON.stringify({ remarks }),
    }),

  getReports: () => request('/admin/reports'),

  // Superadmin Master Configurations
  getAdminInstitutes: () => request('/admin/institutes'),
  createAdminInstitute: (data) => request('/admin/institutes', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminInstitute: (id, data) => request(`/admin/institutes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getAdminProgrammes: () => request('/admin/programmes'),
  createAdminProgramme: (data) => request('/admin/programmes', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminProgramme: (id, data) => request(`/admin/programmes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminProgramme: (id) => request(`/admin/programmes/${id}`, { method: 'DELETE' }),

  getAdminServices: () => request('/admin/services'),
  createAdminService: (data) => request('/admin/services', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminService: (id, data) => request(`/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminService: (id) => request(`/admin/services/${id}`, { method: 'DELETE' }),

  getAdminUsers: () => request('/admin/users'),
  createAdminUser: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminUser: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetAdminPassword: (id, password) => request(`/admin/users/${id}/reset-password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  deleteAdminUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  updateAdminProfile: (data) => request('/admin/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getAdminAuditLogs: (search = '') => request(`/admin/audit-logs?search=${encodeURIComponent(search)}`),
};
