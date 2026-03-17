import React, { useState } from 'react';
import { Sidebar, Navbar } from '../components/index';
import { reportAPI, borrowerAPI, lenderAPI } from '../services/api';
import { AlertCircle, Download } from 'lucide-react';

export const Reports = () => {
  const [reportType, setReportType] = useState('current-loans');
  const [borrowerList, setBorrowerList] = useState([]);
  const [lenderList, setLenderList] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [borrowers, setBorrowers] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('');

  const normalizeDataArray = (payload) => {
    if (!payload) return [];
    // New backend shape: { success: true, data: [...] }
    if (Array.isArray(payload.data)) return payload.data;
    // Legacy shape: response is already an array
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const fetchReportData = async (type) => {
    setIsLoading(true);
    setError('');
    // Always keep UI safe
    setReportData([]);
    try {
      let data;
      switch (type) {
        case 'current-loans':
          ({ data } = await reportAPI.getCurrentLoans());
          setReportData(normalizeDataArray(data));
          break;
        case 'loans-by-borrower':
          ({ data } = await reportAPI.getLoansByBorrower());
          setReportData(normalizeDataArray(data));
          // Fetch borrowers for filter (safe)
          try {
            const res = await borrowerAPI.getAll(1, 100);
            const list = res?.data?.borrowers || [];
            setBorrowerList(Array.isArray(list) ? list : []);
            setBorrowers(Array.isArray(list) ? list : []);
          } catch (err) {
            console.error(err);
            setBorrowerList([]);
            setBorrowers([]);
          }
          break;
        case 'loans-by-lender':
          ({ data } = await reportAPI.getLoansByLender());
          setReportData(normalizeDataArray(data));
          // Fetch lenders for filter (safe)
          try {
            const res = await lenderAPI.getAll(1, 100);
            const list = res?.data?.lenders || [];
            setLenderList(Array.isArray(list) ? list : []);
            setLenders(Array.isArray(list) ? list : []);
          } catch (err) {
            console.error(err);
            setLenderList([]);
            setLenders([]);
          }
          break;
        case 'pending-interest':
          ({ data } = await reportAPI.getPendingInterest());
          setReportData(normalizeDataArray(data));
          break;
        default:
          break;
      }
    } catch (err) {
      setError('Failed to fetch report data');
      console.error(err);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportTypeChange = (type) => {
    setReportType(type);
    fetchReportData(type);
  };

  const downloadReport = () => {
    const csv = generateCSV();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `report-${reportType}-${Date.now()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const generateCSV = () => {
    let headers = [];
    let rows = [];

    switch (reportType) {
      case 'current-loans':
        headers = ['Loan ID', 'Borrower', 'Amount', 'Interest Rate', 'Status', 'Lenders Count', 'Pending Interest'];
        rows = reportData.map((loan) => [
          loan.loanId,
          `${loan.borrowerId?.name} ${loan.borrowerId?.surname}`,
          loan.totalLoanAmount,
          loan.interestRateAnnual,
          loan.status,
          loan.lenders?.length || 0,
          loan.totalPendingInterest || 0,
        ]);
        break;

      case 'pending-interest':
        headers = ['Lender', 'Total Pending', 'Count'];
        rows = (reportData || []).map((item) => [
          item.lenderDetails?.[0]?.name || 'Unknown',
          item.totalPending || 0,
          item.count || 0,
        ]);
        break;

      case 'loans-by-borrower':
        headers = ['Borrower', 'Total Loans', 'Total Amount'];
        rows = (reportData || []).map((g) => [
          `${g?.borrower?.name || ''} ${g?.borrower?.surname || ''}`.trim() || 'Unknown',
          g?.totalLoans || 0,
          g?.totalAmount || 0,
        ]);
        break;

      case 'loans-by-lender':
        headers = ['Lender', 'Loans Total', 'Total Contributed'];
        rows = (reportData || []).map((g) => [
          `${g?.lender?.name || ''} ${g?.lender?.surname || ''}`.trim() || 'Unknown',
          g?.loansTotal || 0,
          g?.totalContributed || 0,
        ]);
        break;

      default:
        return 'No data available';
    }

    const headerRow = headers.join(',');
    const dataRows = rows.map((row) => row.join(',')).join('\n');
    return `${headerRow}\n${dataRows}`;
  };

  return (
    <div className="flex w-full overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 lg:ml-64">
        <Navbar />
        <div className="pt-20 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen w-full max-w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Reports</h1>
            {reportData.length > 0 && (
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                <Download size={20} /> Download CSV
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Report Type Selection */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Select Report Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'current-loans', label: 'Current Loans' },
                { value: 'loans-by-borrower', label: 'Loans by Borrower' },
                { value: 'loans-by-lender', label: 'Loans by Lender' },
                { value: 'pending-interest', label: 'Pending Interest' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleReportTypeChange(option.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    reportType === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Report Data Display */}
          {isLoading ? (
            <div className="text-center py-12">Loading report...</div>
          ) : (reportData && reportData.length > 0) ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {reportType === 'current-loans' && (
                        <>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Loan ID</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Borrower</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Rate</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Pending Interest</th>
                        </>
                      )}
                      {reportType === 'pending-interest' && (
                        <>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Lender</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Total Pending</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Records Count</th>
                        </>
                      )}

                      {reportType === 'loans-by-borrower' && (
                        <>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Borrower</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Total Loans</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Total Amount</th>
                        </>
                      )}

                      {reportType === 'loans-by-lender' && (
                        <>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Lender</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Loans Total</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">Total Contributed</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportType === 'current-loans' &&
                      (reportData || []).map((loan) => (
                        <tr key={loan._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">{loan.loanId}</td>
                          <td className="px-6 py-4 text-sm">
                            {loan.borrowerId?.name} {loan.borrowerId?.surname}
                          </td>
                          <td className="px-6 py-4 text-sm">₹{loan.totalLoanAmount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm">{loan.interestRateAnnual}%</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${{
                                FULLY_FUNDED: 'bg-green-100 text-green-800',
                                PARTIALLY_FUNDED: 'bg-orange-100 text-orange-800',
                                PENDING: 'bg-gray-100 text-gray-600',
                                CLOSED: 'bg-red-100 text-red-800',
                              }[loan.status] || 'bg-gray-100 text-gray-800'}`}
                            >
                              {loan.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold">
                            ₹{loan.totalPendingInterest?.toLocaleString() || 0}
                          </td>
                        </tr>
                      ))}

                    {reportType === 'pending-interest' &&
                      (reportData || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">
                            {item.lenderDetails?.[0]?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold">
                            ₹{item.totalPending?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 text-sm">{item.count || 0}</td>
                        </tr>
                      ))}

                    {reportType === 'loans-by-borrower' &&
                      (reportData || []).map((g) => (
                        <tr key={g?._id || Math.random()} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">
                            {(`${g?.borrower?.name || ''} ${g?.borrower?.surname || ''}`.trim()) || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-sm">{g?.totalLoans || 0}</td>
                          <td className="px-6 py-4 text-sm font-semibold">₹{Number(g?.totalAmount || 0).toLocaleString()}</td>
                        </tr>
                      ))}

                    {reportType === 'loans-by-lender' &&
                      (reportData || []).map((g) => (
                        <tr key={g?._id || Math.random()} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">
                            {(`${g?.lender?.name || ''} ${g?.lender?.surname || ''}`.trim()) || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-sm">{g?.loansTotal || 0}</td>
                          <td className="px-6 py-4 text-sm font-semibold">₹{Number(g?.totalContributed || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600 bg-white rounded-lg">
              No data available for this report
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
