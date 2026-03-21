import React, { useState, useEffect } from 'react';
import { Sidebar, Navbar } from '../components/index';
import { interestAPI } from '../services/api';
import { AlertCircle, Download, Eye, X } from 'lucide-react';

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

const getFileNameFromDisposition = (value) => {
  if (!value) return null;
  const match = value.match(/filename="?([^\";]+)"?/i);
  return match?.[1] || null;
};

const downloadBlobFile = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
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
  const [interests, setInterests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsData, setDetailsData] = useState(null);
  const [csvLoadingLenderId, setCsvLoadingLenderId] = useState(null);
  const [markingPaidRecordId, setMarkingPaidRecordId] = useState(null);

  useEffect(() => {
    fetchPendingInterest();
  }, [page]);

  const fetchPendingInterest = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await interestAPI.getPending(page, 10, 'borrower');
      setInterests(data.records);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to fetch interest records');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (recordId) => {
    setIsDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError('');
    setDetailsData(null);

    try {
      const { data } = await interestAPI.getRecordDetails(recordId);
      setDetailsData(data);
    } catch (err) {
      setDetailsError(err?.response?.data?.message || 'Failed to fetch interest details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setIsDetailsOpen(false);
    setDetailsLoading(false);
    setDetailsError('');
    setDetailsData(null);
    setCsvLoadingLenderId(null);
    setMarkingPaidRecordId(null);
  };

  const handleDownloadCsv = async (lender) => {
    if (!detailsData?.recordId || !lender?.lenderId || !lender?.canDownloadCsv) return;

    setCsvLoadingLenderId(lender.lenderId);
    try {
      const response = await interestAPI.downloadRecordCsv(detailsData.recordId, lender.lenderId);
      const disposition = response.headers?.['content-disposition'];
      const fileName = getFileNameFromDisposition(disposition)
        || `interest-${detailsData?.borrower?.loanId || 'record'}-${lender.lenderName || 'lender'}.csv`;
      downloadBlobFile(response.data, fileName);
    } catch (err) {
      setDetailsError(err?.response?.data?.message || 'Failed to download CSV');
    } finally {
      setCsvLoadingLenderId(null);
    }
  };

  const handleMarkLenderPaidFromModal = async (lender) => {
    if (!lender?.interestRecordId || lender?.interestStatus !== 'pending') return;

    setMarkingPaidRecordId(lender.interestRecordId);
    setDetailsError('');

    try {
      await interestAPI.markLenderRecordPaid(lender.interestRecordId);

      // Remove settled lender row instantly from the modal list.
      setDetailsData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lenderBreakdown: (prev.lenderBreakdown || []).filter(
            (row) => row.interestRecordId !== lender.interestRecordId
          ),
        };
      });

      await fetchPendingInterest();
    } catch (err) {
      setDetailsError(err?.response?.data?.message || 'Failed to mark lender interest as paid');
    } finally {
      setMarkingPaidRecordId(null);
    }
  };

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

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">Loading interest records...</div>
          ) : interests.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b bg-white">
                <h2 className="text-lg font-semibold text-gray-800">Interest Records</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Loan ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Borrower Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Loan Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Interest</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rate</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Period Start Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">End Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {interests.map((row) => {
                      const interestAmount = row.borrowerInterest ?? row.interestAmount;
                      const loanAmount = row.totalLoanAmount ?? row.principal ?? row.principalAmount;

                      return (
                        <tr key={row._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{row.loanId}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{row.borrowerName || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatINR(loanAmount)}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatINR(interestAmount)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{row.rate ?? '-'}%</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatDate(row.startDate)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{formatDate(row.endDate)}</td>
                          <td className="px-6 py-4 text-sm">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              type="button"
                              onClick={() => handleViewDetails(row._id)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold"
                            >
                              <Eye size={14} />
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
              <p>No pending interest records found</p>
              <p className="text-sm text-gray-500 mt-2">
                Interest records appear only when the due date is within the next 10 days.
              </p>
            </div>
          )}
        </div>
      </div>

      {isDetailsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Interest Record Details</h3>
              <button
                type="button"
                onClick={closeDetailsModal}
                className="p-1 rounded hover:bg-gray-100 text-gray-600"
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {detailsLoading && <p className="text-sm text-gray-600">Loading details...</p>}

              {!detailsLoading && detailsError && (
                <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{detailsError}</div>
              )}

              {!detailsLoading && !detailsError && detailsData && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-gray-500">Borrower Name</p>
                      <p className="font-semibold text-gray-900">{detailsData?.borrower?.borrowerName || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-gray-500">Loan ID</p>
                      <p className="font-semibold text-gray-900">{detailsData?.borrower?.loanId || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-gray-500">Total Loan Amount</p>
                      <p className="font-semibold text-gray-900">{formatINR(detailsData?.borrower?.totalLoanAmount)}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-gray-500">Interest Amount</p>
                      <p className="font-semibold text-gray-900">{formatINR(detailsData?.borrower?.interestAmount)}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-gray-500">Due Date</p>
                      <p className="font-semibold text-gray-900">{formatDate(detailsData?.dueDate)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Lender Breakdown</h4>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Lender Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Contribution</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Interest Share</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(detailsData?.lenderBreakdown || []).map((lender) => (
                            <tr key={lender.interestRecordId || lender.lenderId || lender.lenderName}>
                              <td className="px-4 py-3 text-gray-900">{lender.lenderName || '-'}</td>
                              <td className="px-4 py-3 text-gray-900">{formatINR(lender.contributionAmount)}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{formatINR(lender.interestShare)}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={lender.interestStatus || lender.lenderStatus || '-'} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={!lender.canDownloadCsv || csvLoadingLenderId === lender.lenderId}
                                    onClick={() => handleDownloadCsv(lender)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border ${
                                      lender.canDownloadCsv
                                        ? 'border-blue-200 text-blue-700 hover:bg-blue-50'
                                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    <Download size={13} />
                                    {csvLoadingLenderId === lender.lenderId ? 'Downloading...' : 'Download CSV'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      lender.interestStatus !== 'pending'
                                      || !lender.interestRecordId
                                      || markingPaidRecordId === lender.interestRecordId
                                    }
                                    onClick={() => handleMarkLenderPaidFromModal(lender)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border ${
                                      lender.interestStatus === 'pending' && lender.interestRecordId
                                        ? 'border-green-200 text-green-700 hover:bg-green-50'
                                        : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    {markingPaidRecordId === lender.interestRecordId ? 'Marking...' : 'Mark Paid'}
                                  </button>
                                </div>
                                {!lender.canDownloadCsv && (
                                  <p className="mt-1 text-xs text-red-600">
                                    Missing: {(lender.missingFields || []).join(', ')}
                                  </p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterestRecords;
