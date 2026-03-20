import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Sidebar, Navbar } from '../components/index';
import { borrowerAPI, loanAPI, lenderAPI } from '../services/api';
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

const LENDER_STATUS_STYLE = {
  active: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-red-100 text-red-700 border-red-200',
};

const lenderContributionStatus = (entry) => String(entry?.status || 'active').toLowerCase();

export const LoanDetails = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
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
    lenderId: '', amountContributed: '', moneyReceivedDate: '',
  });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Live interest (calculated on demand, not stored)
  const [showLiveInterest, setShowLiveInterest] = useState(false);
  const [liveInterest, setLiveInterest] = useState(null);

  // Edit loan
  const [showEditLoan, setShowEditLoan] = useState(false);
  const [editLoanForm, setEditLoanForm] = useState({
    totalLoanAmount: '',
    disbursementDate: '',
    interestRateAnnual: '',
    interestPeriodMonths: '1',
  });
  const [editLoanError, setEditLoanError] = useState('');
  const [isSavingLoan, setIsSavingLoan] = useState(false);

  // Edit borrower
  const [showEditBorrower, setShowEditBorrower] = useState(false);
  const [editBorrowerForm, setEditBorrowerForm] = useState({ name: '', surname: '', familyGroup: '' });
  const [editBorrowerError, setEditBorrowerError] = useState('');
  const [isSavingBorrower, setIsSavingBorrower] = useState(false);

  // Edit lender contribution
  const [showEditLender, setShowEditLender] = useState(false);
  const [editLenderEntry, setEditLenderEntry] = useState(null);
  const [editLenderForm, setEditLenderForm] = useState({
    name: '',
    surname: '',
    amountContributed: '',
    moneyReceivedDate: '',
  });
  const [editLenderError, setEditLenderError] = useState('');
  const [isSavingLender, setIsSavingLender] = useState(false);

  // Per-lender settlement / Delete
  const [settlingLenderId, setSettlingLenderId] = useState('');
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);
  const [settleError, setSettleError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const getLastDateOfMonth = (value) => {
    const d = toUtcStartOfDay(value);
    if (!d) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  };

  const addMonthsUtc = (value, months) => {
    const d = toUtcStartOfDay(value);
    if (!d) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Number(months || 0), d.getUTCDate()));
  };

  const getSixMonthCycleLive = (value) => {
    const d = toUtcStartOfDay(value);
    if (!d) return null;

    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;

    if (month >= 4 && month <= 9) {
      return {
        periodStart: new Date(Date.UTC(year, 3, 1)),
        periodEnd: new Date(Date.UTC(year, 8, 30)),
      };
    }

    if (month >= 10) {
      return {
        periodStart: new Date(Date.UTC(year, 9, 1)),
        periodEnd: new Date(Date.UTC(year + 1, 2, 31)),
      };
    }

    return {
      periodStart: new Date(Date.UTC(year - 1, 9, 1)),
      periodEnd: new Date(Date.UTC(year, 2, 31)),
    };
  };

  const getSixMonthPeriodsLive = ({ disbursementDate, asOfDate = new Date() }) => {
    const loanStart = toUtcStartOfDay(disbursementDate);
    const asOf = toUtcStartOfDay(asOfDate);
    if (!loanStart || !asOf) return [];
    if (asOf.getTime() < loanStart.getTime()) return [];

    const y = loanStart.getUTCFullYear();
    const m = loanStart.getUTCMonth() + 1;

    let firstEnd;
    if (m >= 1 && m <= 3) firstEnd = new Date(Date.UTC(y, 2, 31));
    else if (m >= 4 && m <= 9) firstEnd = new Date(Date.UTC(y, 8, 30));
    else firstEnd = new Date(Date.UTC(y + 1, 2, 31));

    const periods = [{ periodStart: loanStart, periodEnd: firstEnd }];
    if (asOf.getTime() <= firstEnd.getTime()) return periods;

    let cursor = new Date(firstEnd.getTime() + 24 * 60 * 60 * 1000);
    for (let i = 0; i < 2000; i += 1) {
      const cycle = getSixMonthCycleLive(cursor);
      if (!cycle) break;
      periods.push(cycle);
      if (asOf.getTime() <= cycle.periodEnd.getTime()) break;
      cursor = new Date(cycle.periodEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    return periods;
  };

  const getCurrentInterestPeriodLive = ({ disbursementDate, cycleMonths, asOfDate = new Date() }) => {
    const loanStart = toUtcStartOfDay(disbursementDate);
    const asOf = toUtcStartOfDay(asOfDate);
    if (!loanStart || !asOf) return null;

    if (Number(cycleMonths) === 1) {
      const firstEnd = getLastDateOfMonth(loanStart);
      if (asOf.getTime() <= firstEnd.getTime()) {
        return { periodStart: loanStart, periodEnd: firstEnd };
      }
      const startOfCurrentMonth = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));
      return { periodStart: startOfCurrentMonth, periodEnd: getLastDateOfMonth(asOf) };
    }

    if (Number(cycleMonths) === 3) {
      const firstEnd = getLastDateOfMonth(loanStart);
      if (asOf.getTime() <= firstEnd.getTime()) {
        return { periodStart: loanStart, periodEnd: firstEnd };
      }
      const firstFullStart = new Date(Date.UTC(loanStart.getUTCFullYear(), loanStart.getUTCMonth() + 1, 1));
      const monthsSince = (asOf.getUTCFullYear() - firstFullStart.getUTCFullYear()) * 12 + (asOf.getUTCMonth() - firstFullStart.getUTCMonth());
      const cycleIndex = Math.floor(Math.max(0, monthsSince) / 3);
      const periodStart = addMonthsUtc(firstFullStart, cycleIndex * 3);
      const periodEnd = getLastDateOfMonth(addMonthsUtc(periodStart, 2));
      return { periodStart, periodEnd };
    }

    const periods = getSixMonthPeriodsLive({ disbursementDate, asOfDate: asOf });
    if (!periods.length) return null;
    return periods[periods.length - 1];
  };

  const calculatePeriodInterestLive = ({ principal, annualRatePct, periodStart, periodEnd }) => {
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

  const toDateInputValue = (value) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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

  useEffect(() => {
    // Reset modals when switching loans
    setShowEditLoan(false);
    setShowEditBorrower(false);
    setShowEditLender(false);
    setShowSettleConfirm(false);
    setSettleTarget(null);
    setSettleError('');
    setShowDeleteConfirm(false);
    setEditLoanError('');
    setEditBorrowerError('');
    setEditLenderError('');
    setDeleteError('');
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
        moneyReceivedDate: newLender.moneyReceivedDate,
      });
      setAddSuccess('Lender added successfully!');
      setNewLender({ lenderId: '', amountContributed: '', moneyReceivedDate: '' });
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

    const period = getCurrentInterestPeriodLive({
      disbursementDate: loan.disbursementDate,
      cycleMonths: Number(loan.interestPeriodMonths) || 1,
      asOfDate: new Date(),
    });
    if (!period) return;

    const borrowerName = loan?.borrowerId
      ? `${loan.borrowerId.name || ''} ${loan.borrowerId.surname || ''}`.trim()
      : '';

    const activeLenders = (Array.isArray(loan.lenders) ? loan.lenders : []).filter((l) => {
      if (lenderContributionStatus(l) === 'closed') return false;
      const joined = toUtcStartOfDay(l?.moneyReceivedDate || l?.interestStartDate);
      return joined && joined.getTime() <= period.periodStart.getTime();
    });
    const activePrincipal = activeLenders.reduce((sum, l) => sum + (Number(l?.amountContributed) || 0), 0);

    const borrowerCalc = calculatePeriodInterestLive({
      principal: activePrincipal,
      annualRatePct: loan.interestRateAnnual,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    });

    let distributedInterest = 0;
    const lenderRows = activeLenders.map((l, idx) => {
      const lenderName = l?.lenderId
        ? `${l.lenderId.name || ''} ${l.lenderId.surname || ''}`.trim()
        : '';
      const contributionShare = activePrincipal > 0
        ? (Number(l?.amountContributed) || 0) / activePrincipal
        : 0;
      let proportionalInterest = Math.round((borrowerCalc.interestAmount * contributionShare) * 100) / 100;
      if (idx === activeLenders.length - 1) {
        proportionalInterest = Math.round((borrowerCalc.interestAmount - distributedInterest) * 100) / 100;
      }
      distributedInterest = Math.round((distributedInterest + proportionalInterest) * 100) / 100;

      return {
        key: `${l?.lenderId?._id || lenderName || 'lender'}-${String(period.periodStart || '')}`,
        lenderName,
        startDate: period.periodStart,
        endDate: period.periodEnd,
        interestAmount: proportionalInterest,
      };
    });

    setLiveInterest({
      asOf: period.periodEnd,
      borrower: {
        borrowerName,
        startDate: period.periodStart,
        endDate: period.periodEnd,
        interestAmount: borrowerCalc.interestAmount,
      },
      lenders: lenderRows,
    });
    setShowLiveInterest(true);
  };

  const openEditLoan = () => {
    const loan = data?.loan;
    if (!loan) return;
    setEditLoanError('');
    setEditLoanForm({
      totalLoanAmount: String(loan.totalLoanAmount ?? ''),
      disbursementDate: toDateInputValue(loan.disbursementDate),
      interestRateAnnual: String(loan.interestRateAnnual ?? ''),
      interestPeriodMonths: String(loan.interestPeriodMonths ?? '1'),
    });
    setShowEditLoan(true);
  };

  const saveLoanEdits = async () => {
    const loan = data?.loan;
    if (!loan) return;
    setEditLoanError('');

    const total = parseFloat(editLoanForm.totalLoanAmount);
    const rate = parseFloat(editLoanForm.interestRateAnnual);
    const period = parseInt(editLoanForm.interestPeriodMonths, 10);

    if (Number.isNaN(total) || total <= 0) {
      setEditLoanError('Loan amount must be greater than 0');
      return;
    }
    if (!editLoanForm.disbursementDate) {
      setEditLoanError('Please select a disbursement date');
      return;
    }
    if (Number.isNaN(rate) || rate < 0) {
      setEditLoanError('Interest rate must be 0 or more');
      return;
    }
    if (![1, 3, 6].includes(period)) {
      setEditLoanError('Interest period must be 1, 3, or 6 months');
      return;
    }

    // Optional guard: contributions cannot exceed total
    const currentFunded = (loan.fundedAmount ?? loan.lenders.reduce((s, l) => s + (Number(l.amountContributed) || 0), 0));
    if (currentFunded > total) {
      setEditLoanError('Loan amount cannot be less than total contributions');
      return;
    }

    setIsSavingLoan(true);
    try {
      await loanAPI.update(loan._id, {
        totalLoanAmount: total,
        disbursementDate: editLoanForm.disbursementDate,
        interestRateAnnual: rate,
        interestPeriodMonths: period,
      });
      setShowEditLoan(false);
      await fetchLoanData();
    } catch (err) {
      setEditLoanError(err.response?.data?.message || 'Failed to update loan');
    } finally {
      setIsSavingLoan(false);
    }
  };

  const openEditBorrower = () => {
    const b = data?.loan?.borrowerId;
    if (!b?._id) return;
    setEditBorrowerError('');
    setEditBorrowerForm({
      name: b.name || '',
      surname: b.surname || '',
      familyGroup: b.familyGroup || '',
    });
    setShowEditBorrower(true);
  };

  const saveBorrowerEdits = async () => {
    const b = data?.loan?.borrowerId;
    if (!b?._id) return;
    setEditBorrowerError('');
    if (!editBorrowerForm.name.trim() || !editBorrowerForm.surname.trim()) {
      setEditBorrowerError('Borrower name and surname are required');
      return;
    }
    if (!editBorrowerForm.familyGroup.trim()) {
      setEditBorrowerError('Family group is required');
      return;
    }

    setIsSavingBorrower(true);
    try {
      await borrowerAPI.update(b._id, {
        name: editBorrowerForm.name.trim(),
        surname: editBorrowerForm.surname.trim(),
        familyGroup: editBorrowerForm.familyGroup.trim(),
      });
      setShowEditBorrower(false);
      await fetchLoanData();
    } catch (err) {
      setEditBorrowerError(err.response?.data?.message || 'Failed to update borrower');
    } finally {
      setIsSavingBorrower(false);
    }
  };

  const openEditLenderContribution = (entry) => {
    if (!entry?._id) return;
    setEditLenderError('');
    setEditLenderEntry(entry);
    setEditLenderForm({
      name: entry.lenderId?.name || '',
      surname: entry.lenderId?.surname || '',
      amountContributed: String(entry.amountContributed ?? ''),
      moneyReceivedDate: toDateInputValue(entry.moneyReceivedDate),
    });
    setShowEditLender(true);
  };

  const saveLenderEdits = async () => {
    const loan = data?.loan;
    const entry = editLenderEntry;
    if (!loan?._id || !entry?._id) return;
    setEditLenderError('');

    const amount = parseFloat(editLenderForm.amountContributed);
    if (!editLenderForm.name.trim() || !editLenderForm.surname.trim()) {
      setEditLenderError('Lender name and surname are required');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setEditLenderError('Amount must be greater than 0');
      return;
    }
    if (!editLenderForm.moneyReceivedDate) {
      setEditLenderError('Please select a receive date');
      return;
    }

    // Optional guard: contributions cannot exceed total after edit
    const currentFunded = (loan.fundedAmount ?? loan.lenders.reduce((s, l) => s + (Number(l.amountContributed) || 0), 0));
    const newFunded = currentFunded - (Number(entry.amountContributed) || 0) + amount;
    if (newFunded > loan.totalLoanAmount) {
      setEditLenderError('Total lender contributions cannot exceed the loan amount');
      return;
    }

    setIsSavingLender(true);
    try {
      // Update lender name (master record)
      if (entry.lenderId?._id) {
        await lenderAPI.update(entry.lenderId._id, {
          name: editLenderForm.name.trim(),
          surname: editLenderForm.surname.trim(),
        });
      }

      // Update contribution in loan
      await loanAPI.updateLenderContribution(loan._id, entry._id, {
        amountContributed: amount,
        moneyReceivedDate: editLenderForm.moneyReceivedDate,
      });

      setShowEditLender(false);
      setEditLenderEntry(null);
      await fetchLoanData();
    } catch (err) {
      setEditLenderError(err.response?.data?.message || 'Failed to update lender contribution');
    } finally {
      setIsSavingLender(false);
    }
  };

  const openSettleLenderConfirm = (entry) => {
    if (!entry?._id) return;
    if (lenderContributionStatus(entry) === 'closed') return;
    setSettleError('');
    setSettleTarget(entry);
    setShowSettleConfirm(true);
  };

  const settleLenderContribution = async () => {
    const loan = data?.loan;
    const entry = settleTarget;
    if (!loan?._id || !entry?._id) return;
    if (lenderContributionStatus(entry) === 'closed') return;

    setSettlingLenderId(entry._id);
    setSettleError('');
    try {
      await loanAPI.closeLenderContribution(loan._id, entry._id);
      setAddSuccess('Lender settled successfully');
      setShowSettleConfirm(false);
      setSettleTarget(null);
      await fetchLoanData();
    } catch (err) {
      setSettleError(err.response?.data?.message || 'Failed to settle lender contribution');
    } finally {
      setSettlingLenderId('');
    }
  };

  const confirmDeleteLoan = async () => {
    const loan = data?.loan;
    if (!loan?._id) return;
    setDeleteError('');
    setIsDeleting(true);
    try {
      await loanAPI.delete(loan._id);
      setShowDeleteConfirm(false);
      navigate('/current-loans');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete loan');
    } finally {
      setIsDeleting(false);
    }
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
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLE[loan.status] || 'bg-gray-100 text-gray-700'}`}>
                        {loan.status?.replace('_', ' ')}
                      </span>
                      <button
                        onClick={openEditLoan}
                        disabled={loan.status === 'CLOSED'}
                        className="text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Edit Loan
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
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
                  <div className="flex items-center justify-between mb-6 pb-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                      <User size={22} className="text-orange-600" /> Borrower Details
                    </h2>
                    {borrower?._id && (
                      <button
                        onClick={openEditBorrower}
                        className="text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Edit Borrower
                      </button>
                    )}
                  </div>
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
                                    <th className="px-4 py-2 border-b">Recv. Date</th>
                                    <th className="px-4 py-2 border-b">Status</th>
                                    <th className="px-4 py-2 border-b text-right">Actions</th>
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
                                      <td className="px-4 py-2.5 text-gray-600 tabular-nums">
                                        {new Date(m.moneyReceivedDate).toLocaleDateString('en-IN')}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${LENDER_STATUS_STYLE[lenderContributionStatus(m)] || LENDER_STATUS_STYLE.active}`}>
                                          {lenderContributionStatus(m)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                        <button
                                          onClick={() => openEditLenderContribution(m)}
                                          disabled={loan.status === 'CLOSED' || lenderContributionStatus(m) === 'closed'}
                                          className="text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => openSettleLenderConfirm(m)}
                                          disabled={loan.status === 'CLOSED' || lenderContributionStatus(m) === 'closed' || settlingLenderId === m._id}
                                          className="ml-2 text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                                        >
                                          {lenderContributionStatus(m) === 'closed'
                                            ? 'Closed'
                                            : (settlingLenderId === m._id ? 'Closing...' : 'Close')}
                                        </button>
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
                      <p className="text-xs text-gray-500 mt-1">Click “Show Interest” to calculate totals for the current period.</p>
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
                              {liveInterest?.borrower?.startDate ? new Date(liveInterest.borrower.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                              <span className="text-gray-400 mx-1">→</span>
                              {liveInterest?.borrower?.endDate ? new Date(liveInterest.borrower.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[11px] text-gray-500">Interest Due</p>
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
                                      {l.endDate ? new Date(l.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-[11px] text-gray-500">Interest Accrued</p>
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

            {/* ---- Modals ---- */}
            {showEditLoan && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Edit Loan</h3>
                    <button onClick={() => setShowEditLoan(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {editLoanError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
                        <AlertCircle size={15} /> {editLoanError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">Loan Amount (₹)</label>
                        <input
                          type="number"
                          min="1"
                          value={editLoanForm.totalLoanAmount}
                          onChange={(e) => setEditLoanForm((p) => ({ ...p, totalLoanAmount: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">Disbursement Date</label>
                        <input
                          type="date"
                          value={editLoanForm.disbursementDate}
                          onChange={(e) => setEditLoanForm((p) => ({ ...p, disbursementDate: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">Interest Rate (% / yr)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editLoanForm.interestRateAnnual}
                          onChange={(e) => setEditLoanForm((p) => ({ ...p, interestRateAnnual: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">Interest Period</label>
                        <select
                          value={editLoanForm.interestPeriodMonths}
                          onChange={(e) => setEditLoanForm((p) => ({ ...p, interestPeriodMonths: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="1">1 month</option>
                          <option value="3">3 months</option>
                          <option value="6">6 months</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={saveLoanEdits}
                        disabled={isSavingLoan}
                        className="flex-1 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
                      >
                        {isSavingLoan ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setShowEditLoan(false)}
                        className="flex-1 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showEditBorrower && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Edit Borrower</h3>
                    <button onClick={() => setShowEditBorrower(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {editBorrowerError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
                        <AlertCircle size={15} /> {editBorrowerError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">Name</label>
                        <input
                          type="text"
                          value={editBorrowerForm.name}
                          onChange={(e) => setEditBorrowerForm((p) => ({ ...p, name: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">Surname</label>
                        <input
                          type="text"
                          value={editBorrowerForm.surname}
                          onChange={(e) => setEditBorrowerForm((p) => ({ ...p, surname: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">Family Group</label>
                        <input
                          type="text"
                          value={editBorrowerForm.familyGroup}
                          onChange={(e) => setEditBorrowerForm((p) => ({ ...p, familyGroup: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={saveBorrowerEdits}
                        disabled={isSavingBorrower}
                        className="flex-1 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
                      >
                        {isSavingBorrower ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setShowEditBorrower(false)}
                        className="flex-1 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showEditLender && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100">
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Edit Lender Contribution</h3>
                    <button onClick={() => setShowEditLender(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {editLenderError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
                        <AlertCircle size={15} /> {editLenderError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">Lender Name</label>
                        <input
                          type="text"
                          value={editLenderForm.name}
                          onChange={(e) => setEditLenderForm((p) => ({ ...p, name: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">Surname</label>
                        <input
                          type="text"
                          value={editLenderForm.surname}
                          onChange={(e) => setEditLenderForm((p) => ({ ...p, surname: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">Amount (₹)</label>
                        <input
                          type="number"
                          min="1"
                          value={editLenderForm.amountContributed}
                          onChange={(e) => setEditLenderForm((p) => ({ ...p, amountContributed: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1.5 text-gray-700">Receive Date</label>
                        <input
                          type="date"
                          value={editLenderForm.moneyReceivedDate}
                          onChange={(e) => setEditLenderForm((p) => ({ ...p, moneyReceivedDate: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={saveLenderEdits}
                        disabled={isSavingLender}
                        className="flex-1 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
                      >
                        {isSavingLender ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setShowEditLender(false)}
                        className="flex-1 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showSettleConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Confirm Lender Settlement</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Are you sure you want to close this lender? This will finalize interest calculation.
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    {settleError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
                        <AlertCircle size={15} /> {settleError}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setShowSettleConfirm(false); setSettleTarget(null); setSettleError(''); }}
                        className="flex-1 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={settleLenderContribution}
                        disabled={Boolean(settlingLenderId)}
                        className="flex-1 bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50 transition-colors"
                      >
                        {settlingLenderId ? 'Confirming...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showDeleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Delete Loan</h3>
                    <p className="text-sm text-gray-600 mt-1">This will delete the loan and all related interest records.</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {deleteError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
                        <AlertCircle size={15} /> {deleteError}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={confirmDeleteLoan}
                        disabled={isDeleting}
                        className="flex-1 bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 transition-colors"
                      >
                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanDetails;
