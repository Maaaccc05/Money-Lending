import React, { useState, useEffect } from 'react';
import { Sidebar, Navbar, BorrowerForm } from '../components/index';
import { borrowerAPI } from '../services/api';
import { Plus, AlertCircle } from 'lucide-react';

export const Borrowers = () => {
  const [borrowers, setBorrowers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchBorrowers();
  }, [page]);

  const fetchBorrowers = async () => {
    setIsLoading(true);
    try {
      const { data } = await borrowerAPI.getAll(page, 10);
      setBorrowers(data.borrowers);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to fetch borrowers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBorrower = async (data) => {
    setFieldErrors({});
    try {
      await borrowerAPI.create(data);
      setShowForm(false);
      setPage(1);
      fetchBorrowers();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && serverErrors.length > 0) {
        // Map field-level errors into { fieldName: message } object
        const mapped = {};
        serverErrors.forEach(({ field, message }) => {
          mapped[field] = message;
        });
        setFieldErrors(mapped);
        setError('Please fix the highlighted fields below.');
      } else {
        setError(err.response?.data?.message || 'Failed to create borrower');
      }
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <div className="pt-20 p-6 bg-gray-50 min-h-screen">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Borrowers</h1>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} /> Add Borrower
            </button>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Add New Borrower</h2>
              <BorrowerForm onSubmit={handleCreateBorrower} isLoading={isLoading} serverErrors={fieldErrors} />
              <button
                onClick={() => setShowForm(false)}
                className="mt-4 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">Loading borrowers...</div>
          ) : borrowers.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">DOB</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Bank</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {borrowers.map((borrower) => (
                    <tr key={borrower._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {borrower.name} {borrower.surname}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(borrower.dob).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{borrower.bankName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{borrower.branch}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{borrower.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pagination && (
                <div className="px-6 py-4 border-t text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600">No borrowers found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Borrowers;
