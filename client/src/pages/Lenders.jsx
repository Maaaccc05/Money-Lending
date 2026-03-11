import React, { useState, useEffect } from 'react';
import { Sidebar, Navbar, LenderForm } from '../components/index';
import { lenderAPI } from '../services/api';
import { Plus, AlertCircle } from 'lucide-react';

export const Lenders = () => {
  const [lenders, setLenders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchLenders();
  }, [page]);

  const fetchLenders = async () => {
    setIsLoading(true);
    try {
      const { data } = await lenderAPI.getAll(page, 10);
      setLenders(data.lenders);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to fetch lenders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLender = async (data) => {
    setFieldErrors({});
    try {
      await lenderAPI.create(data);
      setShowForm(false);
      setPage(1);
      fetchLenders();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && serverErrors.length > 0) {
        const mapped = {};
        serverErrors.forEach(({ field, message }) => {
          mapped[field] = message;
        });
        setFieldErrors(mapped);
        setError('Please fix the highlighted fields below.');
      } else {
        setError(err.response?.data?.message || 'Failed to create lender');
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
            <h1 className="text-3xl font-bold text-gray-800">Lenders</h1>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} /> Add Lender
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
              <h2 className="text-xl font-bold mb-4">Add New Lender</h2>
              <LenderForm onSubmit={handleCreateLender} isLoading={isLoading} serverErrors={fieldErrors} />
              <button
                onClick={() => setShowForm(false)}
                className="mt-4 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">Loading lenders...</div>
          ) : lenders.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Family Group</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">DOB</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Bank</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lenders.map((lender) => (
                    <tr key={lender._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {lender.name} {lender.surname}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{lender.familyGroup}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(lender.dob).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{lender.bankName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{lender.branch}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{lender.address}</td>
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
            <div className="text-center py-12 text-gray-600">No lenders found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lenders;
