import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 globally - redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ─── Auth ────────────────────────────────────────────────────────
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// ─── Borrowers ───────────────────────────────────────────────────
export const getBorrowers = () => api.get('/borrowers');
export const getBorrower = (id) => api.get(`/borrowers/${id}`);
export const searchBorrowers = (q) => api.get(`/borrowers/search?q=${encodeURIComponent(q)}`);
export const createBorrower = (data) => api.post('/borrowers', data);
export const updateBorrower = (id, data) => api.put(`/borrowers/${id}`, data);

// ─── Lenders ─────────────────────────────────────────────────────
export const getLenders = () => api.get('/lenders');
export const getLender = (id) => api.get(`/lenders/${id}`);
export const searchLenders = (q) => api.get(`/lenders/search?q=${encodeURIComponent(q)}`);
export const createLender = (data) => api.post('/lenders', data);
export const updateLender = (id, data) => api.put(`/lenders/${id}`, data);

// ─── Loans ───────────────────────────────────────────────────────
export const getLoans = (status) => api.get(`/loans${status ? `?status=${status}` : ''}`);
export const getLoan = (id) => api.get(`/loans/${id}`);
export const getLoansByBorrower = (borrowerId) => api.get(`/loans/borrower/${borrowerId}`);
export const getLoansByLender = (lenderId) => api.get(`/loans/lender/${lenderId}`);
export const createLoan = (data) => api.post('/loans', data);
export const updateLoan = (id, data) => api.put(`/loans/${id}`, data);
export const addLenderToLoan = (id, data) => api.post(`/loans/${id}/add-lender`, data);

// ─── Interest ────────────────────────────────────────────────────
export const generateInterest = (loanId, data) => api.post(`/interest/generate/${loanId}`, data);
export const getPendingInterest = () => api.get('/interest/pending');
export const receiveInterestPayment = (data) => api.post('/interest/receive', data);
export const getInterestByLoan = (loanId) => api.get(`/interest/loan/${loanId}`);
export const getPaymentsByLoan = (loanId) => api.get(`/interest/payments/${loanId}`);

// ─── Reports ─────────────────────────────────────────────────────
export const reportCurrentLoans = () => api.get('/reports/current-loans');
export const reportByBorrower = () => api.get('/reports/loans-by-borrower');
export const reportByLender = () => api.get('/reports/loans-by-lender');
export const reportFamilyGroup = (type) => api.get(`/reports/family-group?type=${type || 'borrower'}`);
export const reportPendingInterest = () => api.get('/reports/pending-interest');

export default api;
