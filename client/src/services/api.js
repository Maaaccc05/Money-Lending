import axios from 'axios';

const API_BASE_URL = '/api';

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL,
// });
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
};

// Borrower endpoints
export const borrowerAPI = {
  create: (data) => api.post('/borrowers', data),
  getAll: (page = 1, limit = 10) => api.get('/borrowers', { params: { page, limit } }),
  getAllGrouped: () => api.get('/borrowers/grouped'),
  getById: (id) => api.get(`/borrowers/${id}`),
  update: (id, data) => api.put(`/borrowers/${id}`, data),
  search: (query) => api.get('/borrowers/search', { params: { query } }),
};

// Lender endpoints
export const lenderAPI = {
  create: (data) => api.post('/lenders', data),
  getAll: (page = 1, limit = 10) => api.get('/lenders', { params: { page, limit } }),
  getAllGrouped: () => api.get('/lenders', { params: { page: 1, limit: 500 } }),
  getById: (id) => api.get(`/lenders/${id}`),
  update: (id, data) => api.put(`/lenders/${id}`, data),
  search: (query) => api.get('/lenders/search', { params: { query } }),
  getByFamilyGroup: (familyGroup) => api.get('/lenders/family-group', { params: { familyGroup } }),
};

// Loan endpoints
export const loanAPI = {
  create: (data) => api.post('/loans', data),
  getAll: (page = 1, limit = 10, status = null) =>
    api.get('/loans', { params: { page, limit, status } }),
  getById: (id) => api.get(`/loans/${id}`),
  getByLoanId: (loanId) => api.get(`/loans/details/${loanId}`),
  getByBorrower: (borrowerId) => api.get(`/loans/borrower/${borrowerId}`),
  getByLender: (lenderId) => api.get(`/loans/lender/${lenderId}`),
  addLender: (loanId, data) => api.put(`/loans/${loanId}/add-lender`, data),
  updateStatus: (id, status) => api.put(`/loans/${id}/status`, { status }),
};

// Interest endpoints
export const interestAPI = {
  generate: (loanId, endDate) => api.post(`/interest/generate/${loanId}`, { endDate }),
  getPending: (page = 1, limit = 10) => api.get('/interest/pending', { params: { page, limit } }),
  recordPayment: (data) => api.post('/interest/record-payment', data),
  getPayments: (page = 1, limit = 10) => api.get('/interest/payments', { params: { page, limit } }),
  getByLoan: (loanId) => api.get(`/interest/${loanId}`),
};

// Report endpoints
export const reportAPI = {
  getDashboardStats: () => api.get('/reports/dashboard-stats'),
  getCurrentLoans: () => api.get('/reports/current-loans'),
  getLoansByBorrower: (borrowerId = null) =>
    api.get('/reports/loans-by-borrower', { params: { borrowerId } }),
  getLoansByLender: (lenderId = null) =>
    api.get('/reports/loans-by-lender', { params: { lenderId } }),
  getLoansByFamilyGroup: (familyGroup) =>
    api.get('/reports/loans-by-family-group', { params: { familyGroup } }),
  getPendingInterest: () => api.get('/reports/pending-interest'),
};

export default api;
