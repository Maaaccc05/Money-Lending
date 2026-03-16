import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sidebar, Navbar } from '../components/index';
import { loanAPI, lenderAPI } from '../services/api';
import {
  ArrowLeft, User, Building, Landmark, Calendar, FileText,
  IndianRupee, PieChart, Users, AlertCircle, Plus, CheckCircle, X
} from 'lucide-react';

const STATUS_STYLE = {
  FULLY_FUNDED:    'bg-green-100 text-green-700 border-green-200',
  PARTIALLY_FUNDED:'bg-orange-100 text-orange-700 border-orange-200',
  PENDING:         'bg-gray-100 text-gray-700 border-gray-200',
  CLOSED:          'bg-red-100 text-red-700 border-red-200',
  // legacy
  active:          'bg-green-100 text-green-700 border-green-200',
  closed:          'bg-red-100 text-red-700 border-red-200',
};

export const LoanDetails = () => {
  const { loanId } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Add-lender form state
  const [showAddLender, setShowAddLender] = useState(false);
  const [lenderSearch, setLenderSearch] = useState('');
  const [lenderResults, setLenderResults] = useState([]);
  const [showLenderDropdown, setShowLenderDropdown] = useState(false);
  const [selectedLender, setSelectedLender] = useState(null);
  const [newLender, setNewLender] = useState({
    lenderId: '', amountContributed: '', lenderInterestRate: '', moneyReceivedDate: '',
  });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Live interest (calculated on demand, not stored)
  const [showLiveInterest, setShowLiveInterest] = useState(false);
  const [liveInterest, setLiveInterest] = useState(null);

  const toUtcStartOfDay = (value) => {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  };

  const diffDaysInclusiveUtc = (startDate, endDate) => {
    const start = toUtcStartOfDay(startDate);
    const end = toUtcStartOfDay(endDate);
    if (!start || !end) return null;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const diff = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
    return diff + 1;
  };

  const calculateSimpleInterestDailyLive = ({ principal, annualRatePct, periodStart, periodEnd }) => {
    const days = diffDaysInclusiveUtc(periodStart, periodEnd);
    if (days == null || days <= 0) {
      return { interestAmount: 0, days: days ?? 0 };
    }
    const rateDecimal = (Number(annualRatePct) || 0) / 100;
    const interest = (Number(principal) || 0) * rateDecimal * (days / 365);
    return {
      interestAmount: Math.round(interest * 100) / 100,
      days,
    };
  };

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

  useEffect(() => {
    fetchLoanData();
  }, [loanId]);

  // Reset panel when navigating away or switching loans
  useEffect(() => {
    setShowLiveInterest(false);
    setLiveInterest(null);
  }, [loanId]);

  // ----- Lender search for add-lender form -----
  const handleLenderSearch = async (query) => {
    setLenderSearch(query);
    setSelectedLender(null);
    setNewLender((p) => ({ ...p, lenderId: '' }));
    if (query.length < 2) { setLenderResults([]); setShowLenderDropdown(false); return; }
    try {
      const { data: res } = await lenderAPI.search(query);
      setLenderResults(res);
      setShowLenderDropdown(true);
    } catch (_) {}
  };

  const selectLender = (l) => {
    setSelectedLender(l);
    setLenderSearch(`${l.name} ${l.surname}`);
    setNewLender((p) => ({ ...p, lenderId: l._id }));
    setShowLenderDropdown(false);
  };

  const handleAddLender = async () => {
    setAddError('');
    if (!newLender.lenderId) { setAddError('Please select a lender'); return; }
    if (!newLender.amountContributed || parseFloat(newLender.amountContributed) <= 0) {
      setAddError('Amount must be greater than 0'); return;
    }
    if (!newLender.moneyReceivedDate) { setAddError('Please pick a money received date'); return; }

    setIsAdding(true);
    try {
      await loanAPI.addLender(data.loan._id, {
        lenderId: newLender.lenderId,
        amountContributed: parseFloat(newLender.amountContributed),
        lenderInterestRate: parseFloat(newLender.lenderInterestRate) || 0,
        moneyReceivedDate: newLender.moneyReceivedDate,
      });
      setAddSuccess('Lender added successfully!');
      setNewLender({ lenderId: '', amountContributed: '', lenderInterestRate: '', moneyReceivedDate: '' });
      setSelectedLender(null);
      setLenderSearch('');
      setLenderResults([]);
      setShowAddLender(false);
      // Refresh data
      await fetchLoanData();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add lender');
    } finally {
      setIsAdding(false);
    }
  };

  const handleShowInterest = () => {
    if (showLiveInterest) {
      setShowLiveInterest(false);
      setLiveInterest(null);
      return;
    }

    const loan = data?.loan;
    if (!loan) return;

    const today = new Date();

    const borrowerName = loan?.borrowerId
      ? `${loan.borrowerId.name || ''} ${loan.borrowerId.surname || ''}`.trim()
      : '';

    const borrowerCalc = calculateSimpleInterestDailyLive({
      principal: loan.totalLoanAmount,
      annualRatePct: loan.interestRateAnnual,
      periodStart: loan.disbursementDate,
      periodEnd: today,
    });

    const lenders = Array.isArray(loan.lenders) ? loan.lenders : [];
    const lenderRows = lenders.map((l) => {
      const lenderName = l?.lenderId
        ? `${l.lenderId.name || ''} ${l.lenderId.surname || ''}`.trim()
        : '';
      const start = l?.moneyReceivedDate || l?.interestStartDate;
      const calc = calculateSimpleInterestDailyLive({
        principal: l?.amountContributed,
        annualRatePct: l?.lenderInterestRate,
        periodStart: start,
        periodEnd: today,
      });
      return {
        key: `${l?.lenderId?._id || lenderName || 'lender'}-${String(start || '')}`,
        lenderName,
        startDate: start,
        endDate: today,
        interestAmount: calc.interestAmount,
      };
    });

    setLiveInterest({
      asOf: today,
      borrower: {
        borrowerName,
        startDate: loan.disbursementDate,
        endDate: today,
        interestAmount: borrowerCalc.interestAmount,
      },
      lenders: lenderRows,
    });
    setShowLiveInterest(true);
  };

  // ----- Loading / Error states -----
  if (isLoading) {
    return (
      <div className="flex w-full overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 lg:ml-64">
          <Navbar />
          <div className="pt-20 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen flex items-center justify-center">
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
          <div className="pt-20 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen">
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

  const { loan } = data;
  const borrower = loan.borrowerId;

  const fundedAmount  = loan.fundedAmount  ?? loan.lenders.reduce((s, l) => s + l.amountContributed, 0);
  const remainingAmount = loan.remainingAmount ?? Math.max(0, loan.totalLoanAmount - fundedAmount);
  const fundingPct = loan.totalLoanAmount > 0 ? Math.min(100, (fundedAmount / loan.totalLoanAmount) * 100) : 0;

  // Group lenders by family group
  const lendersGrouped = loan.lenders.reduce((acc, curr) => {
    const family = curr.lenderId?.familyGroup || 'Other Family';
    if (!acc[family]) acc[family] = [];
    acc[family].push(curr);
    return acc;
  }, {});

  return (
    <div className="flex w-full overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 lg:ml-64">
        <Navbar />
        <div className="pt-20 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen w-full max-w-full">
          <div className="max-w-6xl mx-auto w-full">

            {/* Back */}
            <div className="mb-6">
              <Link
                to="/current-loans"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} /> Back to Loans
              </Link>
            </div>

            {addSuccess && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl flex items-center gap-2 text-sm">
                <CheckCircle size={18} /> {addSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* ── Left (main) ── */}
              <div className="lg:col-span-3 space-y-6">

                {/* 1. Loan Summary Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between mb-6">
                    <h2 className="text-lg sm:text-2xl font-bold flex items-center gap-2 text-gray-800 min-w-0">
                      <FileText size={20} className="text-blue-600 shrink-0" />
                      <span className="truncate">Loan <span className="text-blue-600">({loan.loanId})</span></span>
                    </h2>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 ml-4 border ${STATUS_STYLE[loan.status] || 'bg-gray-100 text-gray-700'}`}>
                      {loan.status?.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Key stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><IndianRupee size={12}/> Total Amount</p>
                      <p className="font-bold text-xl text-gray-900">₹{loan.totalLoanAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><IndianRupee size={12}/> Funded</p>
                      <p className="font-bold text-xl text-green-600">₹{fundedAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><IndianRupee size={12}/> Remaining</p>
                      <p className={`font-bold text-xl ${remainingAmount > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                        ₹{remainingAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar size={12}/> Disbursed</p>
                      <p className="font-semibold text-gray-800 text-sm">{new Date(loan.disbursementDate).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><PieChart size={12}/> Interest Rate</p>
                      <p className="font-semibold text-gray-800 text-sm">{loan.interestRateAnnual}% / yr</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><PieChart size={12}/> Period</p>
                      <p className="font-semibold text-gray-800 text-sm">Every {loan.interestPeriodMonths} Month(s)</p>
                    </div>
                  </div>

                  {/* Funding progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Funding Progress</span>
                      <span>{fundingPct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${fundingPct >= 100 ? 'bg-green-500' : 'bg-orange-400'}`}
                        style={{ width: `${fundingPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Borrower Details */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 mb-6 pb-4 border-b">
                    <User size={22} className="text-orange-600" /> Borrower Details
                  </h2>
                  {borrower ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Full Name</p>
                        <p className="font-medium text-gray-900">{borrower.name} {borrower.surname}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Family Group</p>
                        <p className="font-medium text-gray-900">{borrower.familyGroup || 'Other'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-red-500 italic">Borrower data is missing or was deleted.</p>
                  )}
                </div>

                {/* 3. Lender Contributions */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                      <Users size={22} className="text-purple-600" /> Lender Contributions
                    </h2>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-0.5">Total Funded</p>
                      <p className={`font-bold flex items-center justify-end gap-1 ${fundedAmount >= loan.totalLoanAmount ? 'text-green-600' : 'text-orange-500'}`}>
                        <IndianRupee size={15}/>{fundedAmount.toLocaleString('en-IN')}
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
                                Total: ₹{familyTotal.toLocaleString('en-IN')}
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
                                      <td className="px-4 py-2.5 text-gray-700 font-semibold">
                                        ₹{m.amountContributed.toLocaleString('en-IN')}
                                      </td>
                                      <td className="px-4 py-2.5 text-gray-600">{m.lenderInterestRate}%</td>
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

                  {/* ── Add New Lender Contribution ── */}
                  <div className="mt-6 border-t pt-5">
                    {!showAddLender ? (
                      <button
                        onClick={() => { setShowAddLender(true); setAddSuccess(''); }}
                        className="flex items-center gap-2 text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        disabled={loan.status === 'CLOSED'}
                      >
                        <Plus size={16} /> Add New Lender Contribution
                      </button>
                    ) : (
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-gray-800">New Lender Contribution</h3>
                          <button onClick={() => { setShowAddLender(false); setAddError(''); }} className="text-gray-400 hover:text-gray-600">
                            <X size={18} />
                          </button>
                        </div>

                        {addError && (
                          <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
                            <AlertCircle size={15}/> {addError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Lender search */}
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1.5 text-gray-700">Lender</label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search lender by name..."
                                value={lenderSearch}
                                onChange={(e) => handleLenderSearch(e.target.value)}
                                onFocus={() => lenderResults.length > 0 && setShowLenderDropdown(true)}
                                onBlur={() => setTimeout(() => setShowLenderDropdown(false), 150)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                autoComplete="off"
                              />
                              {showLenderDropdown && lenderResults.length > 0 && (
                                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                                  {lenderResults.map((l) => (
                                    <li
                                      key={l._id}
                                      onMouseDown={() => selectLender(l)}
                                      className="px-4 py-2.5 hover:bg-purple-50 cursor-pointer flex items-center gap-2"
                                    >
                                      <span className="font-medium text-gray-800">{l.name} {l.surname}</span>
                                      <span className="text-xs text-gray-400 ml-auto">{l.familyGroup}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            {selectedLender && (
                              <p className="text-green-600 text-xs mt-1">✓ {selectedLender.name} {selectedLender.surname}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1.5 text-gray-700">Amount (₹)</label>
                            <input
                              type="number" min="1" placeholder="e.g. 1500"
                              value={newLender.amountContributed}
                              onChange={(e) => setNewLender((p) => ({ ...p, amountContributed: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5 text-gray-700">Interest Rate (%)</label>
                            <input
                              type="number" step="0.01" min="0" placeholder="e.g. 12"
                              value={newLender.lenderInterestRate}
                              onChange={(e) => setNewLender((p) => ({ ...p, lenderInterestRate: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1.5 text-gray-700">Money Received Date</label>
                            <input
                              type="date"
                              value={newLender.moneyReceivedDate}
                              onChange={(e) => setNewLender((p) => ({ ...p, moneyReceivedDate: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={handleAddLender}
                            disabled={isAdding}
                            className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 transition-colors"
                          >
                            <Plus size={16} /> {isAdding ? 'Adding...' : 'Add Lender'}
                          </button>
                          <button
                            onClick={() => { setShowAddLender(false); setAddError(''); }}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* ── Right Column (Show Interest) ── */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 lg:min-h-[560px] sticky top-24">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                      <Landmark size={20} className="text-green-600" /> Interest
                    </h2>
                    <button
                      onClick={handleShowInterest}
                      className="text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {showLiveInterest ? 'Hide Interest' : 'Show Interest'}
                    </button>
                  </div>

                  {!showLiveInterest ? (
                    <div className="text-center py-10 text-gray-600 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm font-medium">Interest not shown</p>
                      <p className="text-xs text-gray-500 mt-1">Click “Show Interest” to calculate totals till today.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Borrower Interest */}
                      <div className="p-4 border rounded-xl bg-gray-50/50">
                        <p className="text-xs text-gray-500 font-semibold mb-2">Borrower Interest</p>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate" title={`${borrower?.name || ''} ${borrower?.surname || ''}`.trim()}>
                              {borrower?.name ? `${borrower?.name} ${borrower?.surname}` : '-'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1 tabular-nums">
                              {loan.disbursementDate ? new Date(loan.disbursementDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                              <span className="text-gray-400 mx-1">→</span>
                              {liveInterest?.asOf ? new Date(liveInterest.asOf).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[11px] text-gray-500">Total Interest till today</p>
                            <p className="text-lg font-bold text-orange-600">₹{Number(liveInterest?.borrower?.interestAmount || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Lender Interest */}
                      <div className="p-4 border rounded-xl bg-gray-50/50">
                        <p className="text-xs text-gray-500 font-semibold mb-2">Lender Interest</p>
                        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                          {liveInterest?.lenders?.length ? (
                            liveInterest.lenders.map((l) => (
                              <div key={l.key} className="p-3 border rounded-lg bg-white">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate" title={l.lenderName || ''}>
                                      {l.lenderName || 'Lender'}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1 tabular-nums">
                                      {l.startDate ? new Date(l.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                      <span className="text-gray-400 mx-1">→</span>
                                      {liveInterest?.asOf ? new Date(liveInterest.asOf).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-[11px] text-gray-500">Total Interest till today</p>
                                    <p className="text-base font-bold text-blue-600">₹{Number(l.interestAmount || 0).toLocaleString('en-IN')}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">No lenders found.</p>
                          )}
                        </div>
                      </div>
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
