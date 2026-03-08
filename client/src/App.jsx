import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Borrowers from './pages/Borrowers';
import Lenders from './pages/Lenders';
import CreateLoan from './pages/CreateLoan';
import LoanDetails from './pages/LoanDetails';
import CurrentLoans from './pages/CurrentLoans';
import InterestRecords from './pages/InterestRecords';
import Reports from './pages/Reports';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppLayout = ({ children }) => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <Navbar />
    <main style={{ flex: 1, marginLeft: '260px', padding: '2rem', minHeight: '100vh' }}>
      {children}
    </main>
  </div>
);

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/borrowers" element={
        <ProtectedRoute>
          <AppLayout><Borrowers /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/lenders" element={
        <ProtectedRoute>
          <AppLayout><Lenders /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/loans/create" element={
        <ProtectedRoute>
          <AppLayout><CreateLoan /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/loans/:id" element={
        <ProtectedRoute>
          <AppLayout><LoanDetails /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/loans" element={
        <ProtectedRoute>
          <AppLayout><CurrentLoans /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/interest" element={
        <ProtectedRoute>
          <AppLayout><InterestRecords /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <AppLayout><Reports /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
