import React, { useState } from 'react';
import { Sidebar, Navbar } from '../components/index';
import { borrowerAPI, lenderAPI, loanAPI } from '../services/api';
import { Plus, Trash2, AlertCircle, CheckCircle, IndianRupee } from 'lucide-react';

export const CreateLoan = () => {
  const [borrowers, setBorrowers] = useState([]);
  const [lenderResults, setLenderResults] = useState([]);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [showBorrowerDropdown, setShowBorrowerDropdown] = useState(false);
  const [selectedLender, setSelectedLender] = useState(null);
  const [lenderSearch, setLenderSearch] = useState('');
  const [showLenderDropdown, setShowLenderDropdown] = useState(false);
  const [loanData, setLoanData] = useState({
    totalLoanAmount: '',
    disbursementDate: '',
    interestRateAnnual: '',
    interestPeriodMonths: 1,
  });
  const [lenders, setLenders] = useState([]);
  const [isAddingLender, setIsAddingLender] = useState(true);
  const [currentLender, setCurrentLender] = useState({
    lenderId: '',
    amountContributed: '',
    moneyReceivedDate: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isSubmitting = React.useRef(false);

  // --- Borrower search ---
  const handleBorrowerSearch = async (query) => {
    setBorrowerSearch(query);
    setSelectedBorrower(null);
    if (query.length < 2) { setBorrowers([]); setShowBorrowerDropdown(false); return; }
    try {
      const { data } = await borrowerAPI.search(query);
      setBorrowers(data);
      setShowBorrowerDropdown(true);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const selectBorrower = (b) => {
    setSelectedBorrower(b);
    setBorrowerSearch(`${b.name} ${b.surname}`);
    setShowBorrowerDropdown(false);
  };

  // --- Lender search ---
  const handleLenderSearch = async (query) => {
    setLenderSearch(query);
    setSelectedLender(null);
    setCurrentLender((prev) => ({ ...prev, lenderId: '' }));
    if (query.length < 2) { setLenderResults([]); setShowLenderDropdown(false); return; }
    try {
      const { data } = await lenderAPI.search(query);
      setLenderResults(data);
      setShowLenderDropdown(true);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const selectLender = (l) => {
    setSelectedLender(l);
    setLenderSearch(`${l.name} ${l.surname}`);
    setCurrentLender((prev) => ({ ...prev, lenderId: l._id }));
    setShowLenderDropdown(false);
  };

  // --- Add a lender to the staging list ---
  const handleAddLender = () => {
    if (!currentLender.lenderId || !selectedLender) {
      setError('Please select a lender first');
      return;
    }
    if (!currentLender.amountContributed || parseFloat(currentLender.amountContributed) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (!currentLender.moneyReceivedDate) {
      setError('Please select a money received date');
      return;
    }

    setLenders([...lenders, {
      ...currentLender,
      amountContributed: parseFloat(currentLender.amountContributed),
      lenderName: `${selectedLender.name} ${selectedLender.surname}`,
      familyGroup: selectedLender.familyGroup || 'Other',
    }]);
    setCurrentLender({ lenderId: '', amountContributed: '', moneyReceivedDate: '' });
    setSelectedLender(null);
    setLenderSearch('');
    setLenderResults([]);
    setIsAddingLender(false);
    setError('');
  };

  const handleRemoveLender = (index) => {
    const next = lenders.filter((_, i) => i !== index);
    setLenders(next);
    if (next.length === 0) {
      setIsAddingLender(true);
    }
  };

  // --- Derived funding stats ---
  const totalAmount = parseFloat(loanData.totalLoanAmount) || 0;
  const fundedAmount = lenders.reduce((sum, l) => sum + parseFloat(l.amountContributed), 0);
  const remainingAmount = Math.max(0, totalAmount - fundedAmount);
  const fundingStatus = fundedAmount === 0
    ? 'PENDING'
    : fundedAmount >= totalAmount
    ? 'FULLY_FUNDED'
    : 'PARTIALLY_FUNDED';

  // --- Submit ---
  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!selectedBorrower) {
        setError('Please select a borrower');
        return;
      }
      if (lenders.length === 0) {
        setError('Please add at least one lender');
        return;
      }
      if (!loanData.totalLoanAmount || parseFloat(loanData.totalLoanAmount) <= 0) {
        setError('Please enter a valid loan amount');
        return;
      }
      if (loanData.interestRateAnnual === '' || Number.isNaN(parseFloat(loanData.interestRateAnnual))) {
        setError('Please enter a valid annual interest rate');
        return;
      }

      await loanAPI.create({
        borrowerId: selectedBorrower._id,
        totalLoanAmount: parseFloat(loanData.totalLoanAmount),
        disbursementDate: loanData.disbursementDate,
        interestRateAnnual: parseFloat(loanData.interestRateAnnual),
        interestPeriodMonths: parseInt(loanData.interestPeriodMonths),
        lenders: lenders.map((l) => ({
          lenderId: l.lenderId,
          amountContributed: parseFloat(l.amountContributed),
          moneyReceivedDate: l.moneyReceivedDate,
        })),
      });

      // Reset
      setSelectedBorrower(null);
      setBorrowerSearch('');
      setBorrowers([]);
      setLoanData({ totalLoanAmount: '', disbursementDate: '', interestRateAnnual: '', interestPeriodMonths: 1 });
      setLenders([]);
      setIsAddingLender(true);
      setSuccess('Loan created successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create loan');
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  };

  const statusColors = {
    PENDING: 'bg-gray-100 text-gray-700',
    PARTIALLY_FUNDED: 'bg-orange-100 text-orange-700',
    FULLY_FUNDED: 'bg-green-100 text-green-700',
  };

  return (
    <div className="flex w-full overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 lg:ml-64">
        <Navbar />
        <div className="pt-20 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen w-full max-w-full">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">Create New Loan</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-2">
              <AlertCircle size={20} className="shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-6 flex items-center gap-2">
              <CheckCircle size={20} className="shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleCreateLoan} className="space-y-6">

            {/* Borrower Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold mb-4 text-gray-800">Select Borrower</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type borrower name to search..."
                  value={borrowerSearch}
                  onChange={(e) => handleBorrowerSearch(e.target.value)}
                  onFocus={() => borrowers.length > 0 && setShowBorrowerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowBorrowerDropdown(false), 150)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
                {showBorrowerDropdown && borrowers.length > 0 && (
                  <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                    {borrowers.map((b) => (
                      <li
                        key={b._id}
                        onMouseDown={() => selectBorrower(b)}
                        className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2"
                      >
                        <span className="font-medium text-gray-800">{b.name} {b.surname}</span>
                        <span className="text-xs text-gray-400 ml-auto">{b.bankName}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedBorrower && (
                <p className="text-green-600 mt-2 flex items-center gap-1 text-sm">
                  ✓ Selected: <strong>{selectedBorrower.name} {selectedBorrower.surname}</strong>
                </p>
              )}
            </div>

            {/* Loan Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold mb-4 text-gray-800">Loan Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Total Loan Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 2000"
                    value={loanData.totalLoanAmount}
                    onChange={(e) => setLoanData({ ...loanData, totalLoanAmount: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Disbursement Date</label>
                  <input
                    type="date"
                    value={loanData.disbursementDate}
                    onChange={(e) => setLoanData({ ...loanData, disbursementDate: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Annual Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 12"
                    value={loanData.interestRateAnnual}
                    onChange={(e) => setLoanData({ ...loanData, interestRateAnnual: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Interest Period</label>
                  <select
                    value={loanData.interestPeriodMonths}
                    onChange={(e) => setLoanData({ ...loanData, interestPeriodMonths: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                  </select>
                </div>
              </div>

              {/* Live funding summary */}
              {totalAmount > 0 && (
                <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Total</p>
                    <p className="font-bold text-gray-900">₹{totalAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-center border-x border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Funded</p>
                    <p className="font-bold text-green-600">₹{fundedAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Remaining</p>
                    <p className={`font-bold ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      ₹{remainingAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="col-span-3 text-center mt-1">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusColors[fundingStatus]}`}>
                      {fundingStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Add Lender Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold mb-4 text-gray-800">Add Lender Contribution</h2>
              {(lenders.length === 0 || isAddingLender) && (
                <div className="transition-all duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* Lender search */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Lender</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search lender..."
                      value={lenderSearch}
                      onChange={(e) => handleLenderSearch(e.target.value)}
                      onFocus={() => lenderResults.length > 0 && setShowLenderDropdown(true)}
                      onBlur={() => setTimeout(() => setShowLenderDropdown(false), 150)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="off"
                    />
                    {showLenderDropdown && lenderResults.length > 0 && (
                      <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
                        {(() => {
                          const grouped = {};
                          lenderResults.forEach((l) => {
                            const g = l.familyGroup || 'Other';
                            if (!grouped[g]) grouped[g] = [];
                            grouped[g].push(l);
                          });
                          return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, members]) => (
                            <li key={group}>
                              <div className="px-4 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
                                🏠 {group} Family
                              </div>
                              {members.map((l) => (
                                <div
                                  key={l._id}
                                  onMouseDown={() => selectLender(l)}
                                  className="px-5 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2"
                                >
                                  <span className="font-medium text-gray-800">{l.name} {l.surname}</span>
                                  <span className="text-xs text-gray-400 ml-auto">{l.bankName}</span>
                                </div>
                              ))}
                            </li>
                          ));
                        })()}
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
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={currentLender.amountContributed}
                    onChange={(e) => setCurrentLender({ ...currentLender, amountContributed: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Money Received Date</label>
                  <input
                    type="date"
                    value={currentLender.moneyReceivedDate}
                    onChange={(e) => setCurrentLender({ ...currentLender, moneyReceivedDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAddLender}
                      className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 font-medium transition-colors"
                    >
                      <Plus size={18} /> Save Lender
                    </button>
                    {lenders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingLender(false);
                          setCurrentLender({ lenderId: '', amountContributed: '', moneyReceivedDate: '' });
                          setSelectedLender(null);
                          setLenderSearch('');
                          setLenderResults([]);
                        }}
                        className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}

              {lenders.length > 0 && !isAddingLender && (
                <button
                  type="button"
                  onClick={() => setIsAddingLender(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <Plus size={18} /> Add Lender
                </button>
              )}
            </div>

            {/* Staged Lenders List */}
            {lenders.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Lenders Added ({lenders.length})</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[fundingStatus]}`}>
                    {fundingStatus.replace('_', ' ')}
                  </span>
                </div>
                {(() => {
                  const grouped = {};
                  lenders.forEach((l, idx) => {
                    const g = l.familyGroup || 'Other';
                    if (!grouped[g]) grouped[g] = [];
                    grouped[g].push({ ...l, idx });
                  });
                  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, members]) => (
                    <div key={group} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-600 bg-blue-50 px-3 py-1 rounded-full">🏠 {group} Family</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[400px]">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Lender</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Remove</th>
                            </tr>
                          </thead>
                          <tbody>
                            {members.map(({ idx, lenderName, amountContributed, moneyReceivedDate }) => (
                              <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{lenderName}</td>
                                <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">₹{parseFloat(amountContributed).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-500 tabular-nums">{moneyReceivedDate}</td>
                                <td className="px-4 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLender(idx)}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ));
                })()}
                <div className="flex gap-6 text-sm font-semibold border-t pt-3 mt-2">
                  <span className="text-gray-500">Total funded: <span className="text-green-600">₹{fundedAmount.toLocaleString('en-IN')}</span></span>
                  {remainingAmount > 0 && (
                    <span className="text-gray-500">Remaining: <span className="text-orange-500">₹{remainingAmount.toLocaleString('en-IN')}</span></span>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl hover:bg-blue-700 font-bold disabled:opacity-50 transition-colors text-base"
            >
              {isLoading ? 'Creating Loan...' : 'Create Loan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateLoan;
