import React, { useState } from 'react';
import { Sidebar, Navbar } from '../components/index';
import { borrowerAPI, lenderAPI, loanAPI } from '../services/api';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

export const CreateLoan = () => {
  const [borrowers, setBorrowers] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [selectedBorrower, setSelectedBorrower] = useState(null); // full object
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [showBorrowerDropdown, setShowBorrowerDropdown] = useState(false);
  const [selectedLender, setSelectedLender] = useState(null); // full object for current lender
  const [lenderSearch, setLenderSearch] = useState('');
  const [showLenderDropdown, setShowLenderDropdown] = useState(false);
  const [loanData, setLoanData] = useState({
    totalLoanAmount: 0,
    disbursementDate: '',
    interestRateAnnual: 0,
    interestPeriodMonths: 1,
  });
  const [loanLenders, setLoanLenders] = useState([]);
  const [currentLender, setCurrentLender] = useState({
    lenderId: '',
    amountContributed: 0,
    lenderInterestRate: 0,
    moneyReceivedDate: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isSubmitting = React.useRef(false);

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

  const handleLenderSearch = async (query) => {
    setLenderSearch(query);
    setSelectedLender(null);
    setCurrentLender({ lenderId: '', amountContributed: 0, lenderInterestRate: 0, moneyReceivedDate: '' });
    if (query.length < 2) { setLenders([]); setShowLenderDropdown(false); return; }
    try {
      const { data } = await lenderAPI.search(query);
      setLenders(data);
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

  const handleAddLender = () => {
    if (!currentLender.lenderId || currentLender.amountContributed === 0) {
      setError('Please fill all lender fields');
      return;
    }

    if (!selectedLender) {
      setError('Invalid lender selected');
      return;
    }

    setLoanLenders([...loanLenders, {
      ...currentLender,
      lenderName: `${selectedLender.name} ${selectedLender.surname}`,
      familyGroup: selectedLender.familyGroup || 'Other',
    }]);
    setCurrentLender({ lenderId: '', amountContributed: 0, lenderInterestRate: 0, moneyReceivedDate: '' });
    setSelectedLender(null);
    setLenderSearch('');
    setLenders([]);
    setError('');
  };

  const handleRemoveLender = (index) => {
    setLoanLenders(loanLenders.filter((_, i) => i !== index));
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();

    // Synchronous guard prevents double-submission even with fast clicks
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    setIsLoading(true);
    setError('');

    try {
      if (!selectedBorrower) {
        setError('Please select a borrower');
        return;
      }

      if (loanLenders.length === 0) {
        setError('Please add at least one lender');
        return;
      }

      const totalAmount = loanLenders.reduce((sum, l) => sum + parseFloat(l.amountContributed), 0);
      if (totalAmount !== parseFloat(loanData.totalLoanAmount)) {
        setError(`Total lender contributions (₹${totalAmount}) must equal loan amount (₹${loanData.totalLoanAmount})`);
        return;
      }

      await loanAPI.create({
        borrowerId: selectedBorrower._id,
        ...loanData,
        totalLoanAmount: parseFloat(loanData.totalLoanAmount),
        interestRateAnnual: parseFloat(loanData.interestRateAnnual),
        interestPeriodMonths: parseInt(loanData.interestPeriodMonths),
        lenders: loanLenders.map((l) => ({
          lenderId: l.lenderId,
          amountContributed: parseFloat(l.amountContributed),
          lenderInterestRate: parseFloat(l.lenderInterestRate),
          moneyReceivedDate: l.moneyReceivedDate,
        })),
      });

      // Reset form
      setSelectedBorrower(null);
      setBorrowerSearch('');
      setBorrowers([]);
      setLoanData({ totalLoanAmount: 0, disbursementDate: '', interestRateAnnual: 0, interestPeriodMonths: 1 });
      setLoanLenders([]);
      setError('');
      alert('Loan created successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create loan');
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  };

  return (
    <div className="flex w-full overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 lg:ml-64">
        <Navbar />
        <div className="pt-20 px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen w-full max-w-full">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">Create New Loan</h1>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <form onSubmit={handleCreateLoan} className="space-y-6">
            {/* Borrower Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Select Borrower</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type borrower name to search..."
                  value={borrowerSearch}
                  onChange={(e) => handleBorrowerSearch(e.target.value)}
                  onFocus={() => borrowers.length > 0 && setShowBorrowerDropdown(true)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
                {showBorrowerDropdown && borrowers.length > 0 && (
                  <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                    {borrowers.map((b) => (
                      <li
                        key={b._id}
                        onMouseDown={() => selectBorrower(b)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2"
                      >
                        <span className="font-medium text-gray-800">{b.name} {b.surname}</span>
                        <span className="text-xs text-gray-400 ml-auto">{b.bankName}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedBorrower && (
                <p className="text-green-600 mt-2 flex items-center gap-1">
                  ✓ Selected: <strong>{selectedBorrower.name} {selectedBorrower.surname}</strong>
                </p>
              )}
            </div>

            {/* Loan Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Loan Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Total Loan Amount</label>
                  <input
                    type="number"
                    value={loanData.totalLoanAmount}
                    onChange={(e) => setLoanData({ ...loanData, totalLoanAmount: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Disbursement Date</label>
                  <input
                    type="date"
                    value={loanData.disbursementDate}
                    onChange={(e) => setLoanData({ ...loanData, disbursementDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Annual Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={loanData.interestRateAnnual}
                    onChange={(e) => setLoanData({ ...loanData, interestRateAnnual: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Interest Period</label>
                  <select
                    value={loanData.interestPeriodMonths}
                    onChange={(e) => setLoanData({ ...loanData, interestPeriodMonths: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Add Lenders */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Add Lenders</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Lender</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type lender name to search..."
                      value={lenderSearch}
                      onChange={(e) => handleLenderSearch(e.target.value)}
                      onFocus={() => lenders.length > 0 && setShowLenderDropdown(true)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="off"
                    />
                    {showLenderDropdown && lenders.length > 0 && (
                      <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
                        {(() => {
                          // Group search results by familyGroup
                          const grouped = {};
                          lenders.forEach((l) => {
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
                    <p className="text-green-600 text-sm mt-1">✓ {selectedLender.name} {selectedLender.surname}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Amount</label>
                  <input
                    type="number"
                    value={currentLender.amountContributed}
                    onChange={(e) => setCurrentLender({ ...currentLender, amountContributed: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentLender.lenderInterestRate}
                    onChange={(e) => setCurrentLender({ ...currentLender, lenderInterestRate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Money Received Date</label>
                  <input
                    type="date"
                    value={currentLender.moneyReceivedDate}
                    onChange={(e) => setCurrentLender({ ...currentLender, moneyReceivedDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddLender}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                <Plus size={18} /> Add Another Lender
              </button>
            </div>

            {/* Lenders List */}
            {loanLenders.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Added Lenders ({loanLenders.length})</h2>
                {(() => {
                  // Group added lenders by family
                  const grouped = {};
                  loanLenders.forEach((l, idx) => {
                    const g = l.familyGroup || 'Other';
                    if (!grouped[g]) grouped[g] = [];
                    grouped[g].push({ ...l, idx });
                  });
                  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, members]) => (
                    <div key={group} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-600 bg-blue-50 px-3 py-1 rounded-full">🏠 {group} Family</span>
                      </div>
                      <div className="overflow-x-auto">
                      <table className="w-full min-w-[380px]">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Lender</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Amount</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Rate</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map(({ idx, lenderName, amountContributed, lenderInterestRate }) => (
                            <tr key={idx} className="border-b">
                              <td className="px-4 py-2 text-sm">{lenderName}</td>
                              <td className="px-4 py-2 text-sm">₹{parseFloat(amountContributed).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2 text-sm">{lenderInterestRate}%</td>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLender(idx)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 size={18} />
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
                <p className="text-sm font-semibold text-gray-700 mt-4 border-t pt-3">
                  Total: ₹{loanLenders.reduce((sum, l) => sum + parseFloat(l.amountContributed), 0).toLocaleString('en-IN')}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50"
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
