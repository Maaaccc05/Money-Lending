import InterestRecord from '../models/InterestRecord.js';
import Loan from '../models/Loan.js';
import { calculatePeriodInterest, diffDaysInclusiveUtc, getCurrentInterestPeriodUtc, toUtcStartOfDay } from './interestCalculator.js';

const SUPPORTED_CYCLES = new Set([1, 3, 6]);

const getObjectId = (v) => v?._id || v || null;

const computeFundedAmount = (loan) => {
  const lenders = Array.isArray(loan?.lenders) ? loan.lenders : [];
  return lenders.reduce((sum, l) => sum + (Number(l?.amountContributed) || 0), 0);
};

const buildLenderDocForPeriod = ({ loan, lenderEntry, period, days, interestAmount }) => {
  const borrowerObjectId = getObjectId(loan?.borrowerId);
  const lenderObjectId = getObjectId(lenderEntry?.lenderId);
  if (!lenderObjectId) return null;

  return {
    loanId: loan._id,
    borrowerId: borrowerObjectId,
    totalLoanAmount: Number(loan.totalLoanAmount) || 0,
    lenderId: lenderObjectId,
    principal: lenderEntry.amountContributed,
    borrowerRate: loan.interestRateAnnual,
    lenderRate: null,
    days,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    interestAmount,
    status: 'pending',

    // legacy fields
    principalAmount: lenderEntry.amountContributed,
    interestRate: loan.interestRateAnnual,
    daysCount: days,
    startDate: period.periodStart,
    endDate: period.periodEnd,
  };
};

const buildBorrowerDocForPeriod = ({ loan, period, activePrincipal, borrowerInterest, days }) => {
  const borrowerObjectId = getObjectId(loan?.borrowerId);

  return {
    loanId: loan._id,
    borrowerId: borrowerObjectId,
    totalLoanAmount: Number(loan.totalLoanAmount) || 0,
    lenderId: null,
    principal: activePrincipal,
    borrowerRate: loan.interestRateAnnual,
    lenderRate: null,
    days,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    interestAmount: borrowerInterest,
    status: 'pending',

    // legacy fields
    principalAmount: activePrincipal,
    interestRate: loan.interestRateAnnual,
    daysCount: days,
    startDate: period.periodStart,
    endDate: period.periodEnd,
  };
};

export const generateCurrentPeriodInterest = async ({ loan, asOf = new Date(), replaceExisting = true } = {}) => {
  if (!loan?._id) throw new Error('generateCurrentPeriodInterest requires a loan document');

  if (loan?.loanStatus === 'CLOSED' || loan?.status === 'CLOSED') {
    return {
      borrowerRecordsCreated: 0,
      lenderRecordsCreated: 0,
      deletedRecords: 0,
      periodsGenerated: 0,
      skipped: true,
    };
  }

  const asOfUtc = toUtcStartOfDay(asOf);
  if (!asOfUtc) throw new Error('Invalid asOf date for interest generation');

  const cycleMonths = Number(loan.interestPeriodMonths);
  if (!SUPPORTED_CYCLES.has(cycleMonths)) {
    throw new Error('Interest period must be 1, 3, or 6 months');
  }

  const fundedAmount = computeFundedAmount(loan);
  const totalLoanAmount = Number(loan.totalLoanAmount) || 0;
  const isMarkedFullyFunded = loan.status === 'FULLY_FUNDED' && totalLoanAmount > 0;
  const isFullyFunded = fundedAmount >= totalLoanAmount && totalLoanAmount > 0;
  if (isMarkedFullyFunded && Math.abs(fundedAmount - totalLoanAmount) > 0.01) {
    throw new Error('FULLY_FUNDED loans must have contributions equal to total loan amount');
  }
  if (isFullyFunded && Math.abs(fundedAmount - totalLoanAmount) > 0.01) {
    throw new Error('Invalid funding state: FULLY_FUNDED loans must have contributions equal to total loan amount');
  }

  const period = getCurrentInterestPeriodUtc({
    loanStartDate: loan.disbursementDate,
    cycleMonths,
    asOfDate: asOfUtc,
  });
  if (!period) throw new Error('Unable to determine current interest period');

  const days = diffDaysInclusiveUtc(period.periodStart, period.periodEnd);
  if (!days || days <= 0) throw new Error('Invalid period duration for interest calculation');

  let deletedRecords = 0;
  if (replaceExisting) {
    const del = await InterestRecord.deleteMany({ loanId: loan._id });
    deletedRecords = Number(del?.deletedCount || 0);
  }

  const rawLenders = Array.isArray(loan.lenders) ? loan.lenders : [];
  const activeLenders = rawLenders.filter((l) => {
    if (String(l?.status || 'active').toLowerCase() === 'closed') return false;
    const joined = toUtcStartOfDay(l.moneyReceivedDate || l.interestStartDate);
    return joined && joined.getTime() <= period.periodStart.getTime();
  });

  const activePrincipal = activeLenders.reduce((sum, l) => sum + (Number(l.amountContributed) || 0), 0);
  const borrowerCalc = calculatePeriodInterest({
    principal: activePrincipal,
    annualRatePct: loan.interestRateAnnual,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
  });

  const docs = [];
  const borrowerDoc = buildBorrowerDocForPeriod({
    loan,
    period,
    activePrincipal,
    borrowerInterest: borrowerCalc.interestAmount,
    days,
  });
  docs.push(borrowerDoc);

  if (activePrincipal > 0 && activeLenders.length > 0) {
    let distributed = 0;
    activeLenders.forEach((l, index) => {
      const contribution = Number(l.amountContributed) || 0;
      const share = contribution / activePrincipal;
      let lenderInterest = Math.round((borrowerCalc.interestAmount * share) * 100) / 100;
      if (index === activeLenders.length - 1) {
        lenderInterest = Math.round((borrowerCalc.interestAmount - distributed) * 100) / 100;
      }
      distributed = Math.round((distributed + lenderInterest) * 100) / 100;

      const lenderDoc = buildLenderDocForPeriod({
        loan,
        lenderEntry: l,
        period,
        days,
        interestAmount: lenderInterest,
      });
      if (lenderDoc) docs.push(lenderDoc);
    });
  }

  if (docs.length > 0) {
    await InterestRecord.insertMany(docs, { ordered: true });
  }

  return {
    borrowerRecordsCreated: 1,
    lenderRecordsCreated: Math.max(0, docs.length - 1),
    deletedRecords,
    periodsGenerated: 1,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    skipped: false,
  };
};

export const generateDueInterestForLoan = async ({ loan, asOf } = {}) => {
  const result = await generateCurrentPeriodInterest({ loan, asOf, replaceExisting: true });
  return {
    borrowerRecordsCreated: result.borrowerRecordsCreated,
    lenderRecordsCreated: result.lenderRecordsCreated,
    skippedDuplicates: 0,
    errors: 0,
  };
};

export const generateInterestRecords = async ({ loan, asOf = new Date(), replaceExisting = true } = {}) =>
  generateCurrentPeriodInterest({ loan, asOf, replaceExisting });

export const generateCurrentPeriodInterestForAllLoans = async ({ asOf = new Date() } = {}) => {
  const loans = await Loan.find({
    status: { $ne: 'CLOSED' },
    loanStatus: { $ne: 'CLOSED' },
  }).lean();

  const asOfUtc = toUtcStartOfDay(asOf ?? new Date());
  if (!asOfUtc) throw new Error('Invalid asOf date for interest generation job');

  const summary = {
    asOf: asOfUtc,
    loansScanned: loans.length,
    borrowerRecordsCreated: 0,
    lenderRecordsCreated: 0,
    replacedRecords: 0,
    errors: 0,
  };

  for (const loan of loans) {
    try {
      const r = await generateCurrentPeriodInterest({ loan, asOf: asOfUtc, replaceExisting: true });
      summary.borrowerRecordsCreated += r.borrowerRecordsCreated;
      summary.lenderRecordsCreated += r.lenderRecordsCreated;
      summary.replacedRecords += r.deletedRecords;
    } catch (err) {
      summary.errors += 1;
      console.error('[interestAutoGenerator] loan error', loan?._id, err);
    }
  }

  return summary;
};

export const generateDueInterestForAllLoans = async ({ asOf = new Date() } = {}) => {
  return generateCurrentPeriodInterestForAllLoans({ asOf });
};

export default {
  generateCurrentPeriodInterest,
  generateCurrentPeriodInterestForAllLoans,
  generateInterestRecords,
  generateDueInterestForAllLoans,
  generateDueInterestForLoan,
};
