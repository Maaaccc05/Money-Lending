import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Navbar, LoanTable } from '../components/index';
import { loanAPI, reportAPI } from '../services/api';
import { AlertCircle } from 'lucide-react';

export const CurrentLoans = () => {
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentLoans();
  }, []);

  const fetchCurrentLoans = async () => {
    setIsLoading(true);
    try {
      const { data } = await reportAPI.getCurrentLoans();
      setLoans(data);
    } catch (err) {
      setError('Failed to fetch current loans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLoan = (loanId) => {
    navigate(`/loan-details/${loanId}`);
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <div className="pt-20 p-6 bg-gray-50 min-h-screen">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Current Active Loans</h1>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">Loading loans...</div>
          ) : loans.length > 0 ? (
            <LoanTable loans={loans} onView={handleViewLoan} />
          ) : (
            <div className="text-center py-12 text-gray-600 bg-white rounded-lg">
              No active loans found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentLoans;
