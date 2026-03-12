import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sidebar, Navbar } from '../components/index';
import { loanAPI } from '../services/api';
import { ArrowLeft, User, Building, Landmark, Calendar, FileText, IndianRupee, PieChart, Users, AlertCircle } from 'lucide-react';

export const LoanDetails = () => {
  const { loanId } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLoanData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await loanAPI.getByLoanId(loanId);
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Loan details not found');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLoanData();
  }, [loanId]);

  if (isLoading) {
    return (
      <div className="flex w-full overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 lg:ml-64">
          <Navbar />
          <div className="pt-20 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen w-full max-w-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Loading loan details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.loan) {
    return (
      <div className="flex w-full overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 lg:ml-64">
          <Navbar />
          <div className="pt-20 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen w-full max-w-full">
            <div className="max-w-3xl mx-auto mt-10">
              <Link to="/current-loans" className="flex items-center text-blue-600 hover:text-blue-800 mb-6 font-medium">
                <ArrowLeft size={18} className="mr-2" /> Back to Loans
              </Link>
              <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 flex items-center gap-3">
                <AlertCircle size={24} />
                <span className="text-lg font-medium">{error || 'Loan details not found'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { loan, interestRecords } = data;
  const borrower = loan.borrowerId;

  // Group lenders by family group
  const lendersGrouped = loan.lenders.reduce((acc, curr) => {
    const family = curr.lenderId?.familyGroup || 'Other Family';
    if (!acc[family]) acc[family] = [];
    acc[family].push(curr);
    return acc;
  }, {});

  const totalContributions = loan.lenders.reduce((sum, l) => sum + l.amountContributed, 0);

  return (
    <div className="flex w-full overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 lg:ml-64">
        <Navbar />
        <div className="pt-20 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen w-full max-w-full">
          <div className="max-w-6xl mx-auto w-full">
            {/* Header / Back */}
            <div className="mb-6">
              <Link
                to="/current-loans"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} /> Back to Loans
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Left Column */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Loan Summary Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  {/* Card header row: title + status badge */}
                  <div className="flex items-start justify-between mb-6">
                    <h2 className="text-lg sm:text-2xl font-bold flex items-center gap-2 text-gray-800 min-w-0">
                      <FileText size={20} className="text-blue-600 shrink-0" />
                      <span className="truncate">Loan Data <span className="text-blue-600">({loan.loanId})</span></span>
                    </h2>
                    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold shrink-0 ml-4 ${
                      loan.status === 'active'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${loan.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                      {loan.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><IndianRupee size={14}/> Amount</p>
                      <p className="font-bold text-xl text-gray-900">₹{loan.totalLoanAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><Calendar size={14}/> Disbursed On</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(loan.disbursementDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><PieChart size={14}/> Interest Rate</p>
                      <p className="font-semibold text-gray-800">
                        {loan.interestRateAnnual}% / yr
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><PieChart size={14}/> Interest Period</p>
                      <p className="font-semibold text-gray-800">
                        Every {loan.interestPeriodMonths} Month(s)
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><PieChart size={14}/> Calc Type</p>
                      <p className="font-semibold text-gray-800">Daily</p>
                    </div>
                  </div>
                </div>

                {/* 2. Borrower Details Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 mb-6 pb-4 border-b">
                    <User size={22} className="text-orange-600" />
                    Borrower Details
                  </h2>
                  {borrower ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Full Name</p>
                        <p className="font-medium text-gray-900">{borrower.name} {borrower.surname}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">PAN Number</p>
                        <p className="font-medium text-gray-900 uppercase font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-200 inline-block">
                          {borrower.panNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Bank Name</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1.5">
                          <Building size={14} className="text-gray-400"/> {borrower.bankName || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Account Number</p>
                        <p className="font-medium text-gray-900 font-mono tracking-wide">{borrower.bankAccountNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">IFSC Code & Branch</p>
                        <p className="font-medium text-gray-900 uppercase">{borrower.ifscCode || 'N/A'} ({borrower.branch || 'N/A'})</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500 mb-1">Address</p>
                        <p className="font-medium text-gray-800 text-sm">{borrower.address || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-red-500 italic">Borrower data is missing or was deleted.</p>
                  )}
                </div>

                {/* 3. Lenders Contributions (Grouped) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b">
                     <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                      <Users size={22} className="text-purple-600" />
                      Lender Contributions
                    </h2>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-0.5">Total Contributed</p>
                      <p className={`font-bold ${totalContributions === loan.totalLoanAmount ? 'text-green-600' : 'text-orange-500'} flex items-center justify-end gap-1`}>
                        <IndianRupee size={15}/>{totalContributions.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {loan.lenders.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-4">No lenders recorded for this loan.</p>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(lendersGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([family, members]) => {
                        const familyTotal = members.reduce((sum, curr) => sum + curr.amountContributed, 0);
                        return (
                          <div key={family} className="border border-purple-100 rounded-xl overflow-hidden">
                            <div className="bg-purple-50/50 px-4 py-3 flex justify-between items-center border-b border-purple-100">
                              <h3 className="font-bold text-purple-900">{family} Family</h3>
                              <span className="text-sm font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                                Family Total: ₹{familyTotal.toLocaleString()}
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-white text-gray-500 text-xs uppercase font-medium">
                                  <tr>
                                    <th className="px-4 py-2 border-b">Lender Name</th>
                                    <th className="px-4 py-2 border-b">Amount</th>
                                    <th className="px-4 py-2 border-b">Rate(%)</th>
                                    <th className="px-4 py-2 border-b">Recv. Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {members.map((m, idx) => (
                                    <tr key={m._id || idx} className="border-b last:border-b-0 hover:bg-gray-50">
                                      <td className="px-4 py-2.5 font-medium text-gray-800">
                                        {m.lenderId?.name} {m.lenderId?.surname}
                                      </td>
                                      <td className="px-4 py-2.5 text-gray-700 font-semibold tracking-wide">
                                        ₹{m.amountContributed.toLocaleString()}
                                      </td>
                                      <td className="px-4 py-2.5 text-gray-600">
                                        {m.lenderInterestRate}%
                                      </td>
                                      <td className="px-4 py-2.5 text-gray-600 tabular-nums">
                                        {new Date(m.moneyReceivedDate).toLocaleDateString('en-IN')}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
              
              {/* Right Column (Interest History) */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-24">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 mb-4 pb-3 border-b">
                    <Landmark size={20} className="text-green-600" />
                    Interest History
                  </h2>
                  
                  {interestRecords && interestRecords.length > 0 ? (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {interestRecords.map((record) => (
                        <div key={record._id} className="p-3 border rounded-xl hover:shadow-sm transition-shadow bg-gray-50/50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Period</p>
                              <p className="text-sm font-semibold text-gray-800 tabular-nums">
                                {new Date(record.startDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'short'})} 
                                <span className="text-gray-400 mx-1">→</span>
                                {new Date(record.endDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'short'})}
                              </p>
                            </div>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                              record.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>
                              {record.status}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-500 truncate max-w-[120px]" title={`${record.lenderId?.name} ${record.lenderId?.surname}`}>
                              {record.lenderId?.name} {record.lenderId?.surname}
                            </span>
                            <span className="font-bold text-green-600 text-sm border-b border-green-200">
                              ₹{record.interestAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Landmark size={20} className="text-gray-400"/>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">No interest records generated yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Records will appear when generated.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanDetails;
