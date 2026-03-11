import React, { useState, useEffect } from 'react';
import { Sidebar, Navbar, InterestTable } from '../components/index';
import { interestAPI } from '../services/api';
import { AlertCircle } from 'lucide-react';

export const InterestRecords = () => {
  const [interests, setInterests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchPendingInterest();
  }, [page]);

  const fetchPendingInterest = async () => {
    setIsLoading(true);
    try {
      const { data } = await interestAPI.getPending(page, 10);
      setInterests(data.records);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to fetch interest records');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPaid = async (recordId) => {
    try {
      const record = interests.find((i) => i._id === recordId);
      if (!record) return;

      await interestAPI.recordPayment({
        interestRecordId: recordId,
        amountPaid: record.interestAmount,
        paymentDate: new Date().toISOString().split('T')[0],
      });

      setInterests(interests.filter((i) => i._id !== recordId));
    } catch (err) {
      setError('Failed to record interest payment');
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <div className="pt-20 p-6 bg-gray-50 min-h-screen">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Interest Records</h1>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">Loading interest records...</div>
          ) : interests.length > 0 ? (
            <InterestTable interests={interests} onMarkPaid={handleMarkPaid} pagination={pagination} />
          ) : (
            <div className="text-center py-12 text-gray-600 bg-white rounded-lg">
              No pending interest records found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterestRecords;
