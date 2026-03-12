import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from './components/SidebarContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Borrowers from './pages/Borrowers';
import Lenders from './pages/Lenders';
import CreateLoan from './pages/CreateLoan';
import CurrentLoans from './pages/CurrentLoans';
import LoanDetails from './pages/LoanDetails';
import InterestRecords from './pages/InterestRecords';
import Reports from './pages/Reports';


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/borrowers"
          element={
            <ProtectedRoute>
              <Borrowers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/lenders"
          element={
            <ProtectedRoute>
              <Lenders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-loan"
          element={
            <ProtectedRoute>
              <CreateLoan />
            </ProtectedRoute>
          }
        />

        <Route
          path="/current-loans"
          element={
            <ProtectedRoute>
              <CurrentLoans />
            </ProtectedRoute>
          }
        />

        <Route
          path="/loan/:loanId"
          element={
            <ProtectedRoute>
              <LoanDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/interest-records"
          element={
            <ProtectedRoute>
              <InterestRecords />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
    </SidebarProvider>
  );
}

export default App;
