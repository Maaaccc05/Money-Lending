import React, { useMemo, useState, useEffect } from 'react';
import { Sidebar, Navbar } from '../components/index';
import { interestAPI } from '../services/api';
import { AlertCircle } from 'lucide-react';

const formatINR = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `₹${n.toLocaleString('en-IN')}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN');
};

const StatusBadge = ({ status }) => {
  const s = String(status || '').toLowerCase();
  const isPending = s === 'pending';
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        isPending ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
      }`}
    >
      {status || '-'}
    </span>
  );
};

export const InterestRecords = () => {
  const [view, setView] = useState('borrower');
  const [interests, setInterests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchPendingInterest();
  }, [page, view]);

  useEffect(() => {
    // Switching views should start from page 1 to avoid empty pages.
    setPage(1);
  }, [view]);

  const fetchPendingInterest = async () => {
    setIsLoading(true);
    setError('');
    try {
      const scope = view === 'borrower' ? 'borrower' : 'lender';
      const { data } = await interestAPI.getPending(page, 10, scope);
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

      await fetchPendingInterest();
    } catch (err) {
      setError('Failed to record interest payment');
    }
  };

  const borrowerRows = useMemo(
    () => interests.filter((r) => !r.lenderName).map((r) => ({
      ...r,
      totalLoanAmount: r.totalLoanAmount ?? r.principal,
    })),
    [interests]
  );

  const lenderRows = useMemo(() => interests.filter((r) => r.lenderName), [interests]);

  const canPrev = pagination?.page > 1;
  const canNext = pagination?.page < pagination?.pages;
  const onPrev = () => canPrev && setPage((p) => Math.max(1, p - 1));
  const onNext = () => canNext && setPage((p) => p + 1);

  return (
    <div className="flex w-full overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 lg:ml-64">
        <Navbar />
        <div className="pt-20 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen w-full max-w-full">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Interest Records</h1>

          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setView('borrower')}
              className={`px-4 py-2 rounded-md text-sm font-semibold border ${
                view === 'borrower'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Borrower Interest
            </button>
            <button
              type="button"
              onClick={() => setView('lender')}
              className={`px-4 py-2 rounded-md text-sm font-semibold border ${
                view === 'lender'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Lender Interest
            </button>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">Loading interest records...</div>
          ) : (view === 'borrower' ? borrowerRows : lenderRows).length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b bg-white">
                <h2 className="text-lg font-semibold text-gray-800">
                  {view === 'borrower' ? 'Borrower Interest Records' : 'Lender Interest Records'}
                </h2>
              </div>

              <div className="overflow-x-auto">
                {view === 'borrower' ? (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Loan ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Borrower Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total Loan Amount</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Borrower Interest</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Period Start Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">End Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {borrowerRows.map((row) => (
                        <tr key={row._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{row.loanId}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{row.borrowerName || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatINR(row.totalLoanAmount)}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatINR(row.borrowerInterest)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatDate(row.startDate)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatDate(row.endDate)}</td>
                          <td className="px-6 py-4 text-sm">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {String(row.status || '').toLowerCase() === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(row._id)}
                                className="text-green-600 hover:text-green-800 text-xs font-semibold"
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Loan ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Lender Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Borrower Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Principal</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Lender Interest</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rate</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Period Start Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">End Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lenderRows.map((row) => (
                        <tr key={row._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{row.loanId}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{row.lenderName || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{row.borrowerName || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatINR(row.principal)}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatINR(row.lenderInterest)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{row.rate ?? '-'}%</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatDate(row.startDate)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatDate(row.endDate)}</td>
                          <td className="px-6 py-4 text-sm">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {String(row.status || '').toLowerCase() === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(row._id)}
                                className="text-green-600 hover:text-green-800 text-xs font-semibold"
                              >
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {pagination && (
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onPrev}
                      disabled={!canPrev}
                      className={`px-3 py-2 rounded border text-sm ${
                        canPrev ? 'bg-white hover:bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={onNext}
                      disabled={!canNext}
                      className={`px-3 py-2 rounded border text-sm ${
                        canNext ? 'bg-white hover:bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
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
