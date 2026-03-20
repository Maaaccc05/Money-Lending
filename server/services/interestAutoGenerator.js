import InterestRecord from '../models/InterestRecord.js';
import Loan from '../models/Loan.js';
import {
  calculatePeriodInterest,
  diffDaysInclusiveUtc,
  getCurrentInterestPeriodUtc,
  getSixMonthPeriods,
  getNextInterestPeriodUtc,
  toUtcStartOfDay,
} from './interestCalculator.js';

const SUPPORTED_CYCLES = new Set([1, 3, 6]);

const getObjectId = (v) => v?._id || v || null;

const computeFundedAmount = (loan) => {
  const lenders = Array.isArray(loan?.lenders) ? loan.lenders : [];
  return lenders.reduce((sum, l) => sum + (Number(l?.amountContributed) || 0), 0);
};

const toDateKey = (value) => {
  const d = toUtcStartOfDay(value);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
};

const isSixMonthBoundaryEnd = (value) => {
  const d = toUtcStartOfDay(value);
  if (!d) return false;
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return (month === 3 && day === 31) || (month === 9 && day === 30);
};

const buildLenderDocForPeriod = ({ loan, lenderEntry, period, days, interestAmount, status = 'pending' }) => {
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
    status,

    // legacy fields
    principalAmount: lenderEntry.amountContributed,
    interestRate: loan.interestRateAnnual,
    daysCount: days,
    startDate: period.periodStart,
    endDate: period.periodEnd,
  };
};

const buildBorrowerDocForPeriod = ({ loan, period, activePrincipal, borrowerInterest, days, status = 'pending' }) => {
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
    status,

    // legacy fields
    principalAmount: activePrincipal,
    interestRate: loan.interestRateAnnual,
    daysCount: days,
    startDate: period.periodStart,
    endDate: period.periodEnd,
  };
};

export const generateInterestSchedule = ({ loan, asOf = new Date() } = {}) => {
  if (!loan?._id) throw new Error('generateInterestSchedule requires a loan document');

  const loanStart = toUtcStartOfDay(loan.disbursementDate);
  const asOfUtc = toUtcStartOfDay(asOf);
  if (!loanStart || !asOfUtc) throw new Error('Invalid loan or asOf date for schedule generation');

  const cycleMonths = Number(loan.interestPeriodMonths);
  if (!SUPPORTED_CYCLES.has(cycleMonths)) throw new Error('Interest period must be 1, 3, or 6 months');

  if (asOfUtc.getTime() < loanStart.getTime()) return [];

  if (cycleMonths === 6) {
    const raw = getSixMonthPeriods(loan, asOfUtc);
    const periods = raw
      .map((p) => ({
        periodStart: p.startDate,
        periodEnd: p.endDate,
      }))
      .filter((p) => p.periodStart && p.periodEnd && p.periodStart.getTime() <= p.periodEnd.getTime());
    return periods;
  }

  const currentPeriod = getCurrentInterestPeriodUtc({
    loanStartDate: loanStart,
    cycleMonths,
    asOfDate: asOfUtc,
  });
  if (!currentPeriod) return [];

  const periods = [];
  let lastPeriodEnd = null;

  for (let i = 0; i < 2400; i += 1) {
    const next = getNextInterestPeriodUtc({
      baseStartDate: loanStart,
      lastPeriodEnd,
      cycleMonths,
    });
    if (!next) break;

    periods.push({ periodStart: next.periodStart, periodEnd: next.periodEnd });

    if (next.periodEnd.getTime() >= currentPeriod.periodEnd.getTime()) break;
    lastPeriodEnd = next.periodEnd;
  }

  return periods;
};

export const generatePeriods = (loan, today = new Date()) => {
  const periods = generateInterestSchedule({ loan, asOf: today });

  for (let i = 0; i < periods.length; i += 1) {
    const curr = periods[i];
    if (!curr?.periodStart || !curr?.periodEnd) {
      throw new Error('Invalid period generated: missing start or end date');
    }
    if (curr.periodEnd.getTime() < curr.periodStart.getTime()) {
      throw new Error('Invalid period generated: endDate must be on or after startDate');
    }

    if (i > 0) {
      const prev = periods[i - 1];
      const expectedStart = new Date(prev.periodEnd.getTime() + (24 * 60 * 60 * 1000));
      if (curr.periodStart.getTime() !== expectedStart.getTime()) {
        throw new Error('Generated periods are overlapping or contain gaps');
      }
    }
  }

  return periods;
};

const buildPeriodDocs = ({ loan, period, includeClosedLenders = false, status = 'pending' }) => {
  const days = diffDaysInclusiveUtc(period.periodStart, period.periodEnd);
  if (!days || days <= 0) return [];

  const lenders = Array.isArray(loan.lenders) ? loan.lenders : [];
  const activeLenders = lenders.filter((l) => {
    if (!includeClosedLenders && String(l?.status || 'active').toLowerCase() === 'closed') return false;
    const joined = toUtcStartOfDay(l.moneyReceivedDate || l.interestStartDate);
    if (!joined) return false;
    return joined.getTime() <= period.periodStart.getTime();
  });

  const activePrincipal = activeLenders.reduce((sum, l) => sum + (Number(l.amountContributed) || 0), 0);
  const borrowerCalc = calculatePeriodInterest({
    principal: activePrincipal,
    annualRatePct: loan.interestRateAnnual,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
  });

  const docs = [
    buildBorrowerDocForPeriod({
      loan,
      period,
      activePrincipal,
      borrowerInterest: borrowerCalc.interestAmount,
      days,
      status,
    }),
  ];

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
        status,
      });
      if (lenderDoc) docs.push(lenderDoc);
    });
  }

  return docs;
};

const indexExistingByKey = (records) => {
  const map = new Map();
  for (const r of records) {
    const lenderKey = r?.lenderId ? String(r.lenderId) : 'borrower';
    const startKey = toDateKey(r.periodStart || r.startDate);
    const endKey = toDateKey(r.periodEnd || r.endDate);
    if (!startKey || !endKey) continue;
    map.set(`${lenderKey}|${startKey}|${endKey}`, r);
  }
  return map;
};

const keyForDoc = (doc) => {
  const lenderKey = doc?.lenderId ? String(doc.lenderId) : 'borrower';
  const startKey = toDateKey(doc.periodStart || doc.startDate);
  const endKey = toDateKey(doc.periodEnd || doc.endDate);
  return `${lenderKey}|${startKey}|${endKey}`;
};

export const generatePastInterest = async ({ loan, asOf = new Date(), replaceExisting = false } = {}) => {
  if (!loan?._id) throw new Error('generatePastInterest requires a loan document');
  const cycleMonths = Number(loan.interestPeriodMonths);

  if (loan?.loanStatus === 'CLOSED' || loan?.status === 'CLOSED') {
    return {
      borrowerRecordsCreated: 0,
      lenderRecordsCreated: 0,
      deletedRecords: 0,
      periodsGenerated: 0,
      skipped: true,
    };
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

  const periods = generatePeriods(loan, asOf);
  if (periods.length === 0) {
    return {
      borrowerRecordsCreated: 0,
      lenderRecordsCreated: 0,
      deletedRecords: 0,
      periodsGenerated: 0,
      skipped: false,
    };
  }

  let deletedRecords = 0;
  let existingMap = new Map();

  if (replaceExisting) {
    const del = await InterestRecord.deleteMany({ loanId: loan._id });
    deletedRecords = Number(del?.deletedCount || 0);
  } else {
    if (cycleMonths === 6) {
      // Repair legacy rows where 6-month pending record endDate was saved as "today"
      // instead of cycle boundary (Mar 31 / Sep 30).
      const pending = await InterestRecord.find({
        loanId: loan._id,
        status: 'pending',
      })
        .select('_id periodEnd endDate')
        .lean();

      const badIds = pending
        .filter((r) => !isSixMonthBoundaryEnd(r?.periodEnd || r?.endDate))
        .map((r) => r._id);

      if (badIds.length > 0) {
        const delBad = await InterestRecord.deleteMany({ _id: { $in: badIds } });
        deletedRecords += Number(delBad?.deletedCount || 0);
      }
    }

    const existing = await InterestRecord.find({ loanId: loan._id })
      .select('_id lenderId periodStart periodEnd startDate endDate')
      .lean();
    existingMap = indexExistingByKey(existing);
  }

  const toInsert = [];
  let borrowerRecordsCreated = 0;
  let lenderRecordsCreated = 0;

  for (const period of periods) {
    const docs = buildPeriodDocs({ loan, period, includeClosedLenders: false, status: 'pending' });
    for (const doc of docs) {
      const key = keyForDoc(doc);
      if (!replaceExisting && existingMap.has(key)) continue;
      toInsert.push(doc);
      if (doc.lenderId) lenderRecordsCreated += 1;
      else borrowerRecordsCreated += 1;
      if (!replaceExisting) existingMap.set(key, true);
    }
  }

  if (toInsert.length > 0) {
    await InterestRecord.insertMany(toInsert, { ordered: false });
  }

  return {
    borrowerRecordsCreated,
    lenderRecordsCreated,
    deletedRecords,
    periodsGenerated: periods.length,
    periodStart: periods[0].periodStart,
    periodEnd: periods[periods.length - 1].periodEnd,
    skipped: false,
  };
};

export const generateSettlementInterest = async ({ loan, lenderEntry, settlementDate = new Date() } = {}) => {
  if (!loan?._id) throw new Error('generateSettlementInterest requires a loan document');
  if (!lenderEntry?._id) throw new Error('generateSettlementInterest requires lender entry');

  const lenderObjectId = getObjectId(lenderEntry.lenderId);
  if (!lenderObjectId) throw new Error('Lender ID missing on lender contribution');

  const settlementUtc = toUtcStartOfDay(settlementDate);
  if (!settlementUtc) throw new Error('Invalid settlement date');

  const lenderRecords = await InterestRecord.find({
    loanId: loan._id,
    lenderId: lenderObjectId,
  })
    .select('periodEnd endDate')
    .sort({ periodEnd: -1, endDate: -1 })
    .lean();

  const lenderStart = toUtcStartOfDay(lenderEntry.moneyReceivedDate || lenderEntry.interestStartDate || loan.disbursementDate);
  if (!lenderStart) throw new Error('Invalid lender start date for settlement');

  let startDate = lenderStart;
  if (lenderRecords.length > 0) {
    const lastEnd = toUtcStartOfDay(lenderRecords[0].periodEnd || lenderRecords[0].endDate);
    if (lastEnd) {
      const next = new Date(lastEnd.getTime() + (24 * 60 * 60 * 1000));
      if (next.getTime() > startDate.getTime()) startDate = next;
    }
  }

  if (startDate.getTime() > settlementUtc.getTime()) {
    return {
      created: false,
      lenderInterestAmount: 0,
      borrowerInterestAmount: 0,
    };
  }

  const days = diffDaysInclusiveUtc(startDate, settlementUtc);
  const calc = calculatePeriodInterest({
    principal: Number(lenderEntry.amountContributed) || 0,
    annualRatePct: loan.interestRateAnnual,
    periodStart: startDate,
    periodEnd: settlementUtc,
  });

  if (!days || days <= 0) {
    return {
      created: false,
      lenderInterestAmount: 0,
      borrowerInterestAmount: 0,
    };
  }

  const lenderDoc = buildLenderDocForPeriod({
    loan,
    lenderEntry,
    period: { periodStart: startDate, periodEnd: settlementUtc },
    days,
    interestAmount: calc.interestAmount,
    status: 'paid',
  });

  const borrowerDoc = buildBorrowerDocForPeriod({
    loan,
    period: { periodStart: startDate, periodEnd: settlementUtc },
    activePrincipal: Number(lenderEntry.amountContributed) || 0,
    borrowerInterest: calc.interestAmount,
    days,
    status: 'paid',
  });

  if (lenderDoc) {
    await InterestRecord.insertMany([borrowerDoc, lenderDoc], { ordered: true });
  }

  return {
    created: Boolean(lenderDoc),
    lenderInterestAmount: calc.interestAmount,
    borrowerInterestAmount: calc.interestAmount,
    periodStart: startDate,
    periodEnd: settlementUtc,
  };
};

export const generateCurrentPeriodInterest = async ({ loan, asOf = new Date(), replaceExisting = true } = {}) => {
  return generatePastInterest({ loan, asOf, replaceExisting });
};

export const generateDueInterestForLoan = async ({ loan, asOf } = {}) => {
  const result = await generatePastInterest({ loan, asOf, replaceExisting: false });
  return {
    borrowerRecordsCreated: result.borrowerRecordsCreated,
    lenderRecordsCreated: result.lenderRecordsCreated,
    skippedDuplicates: 0,
    errors: 0,
  };
};

export const generateInterestRecords = async ({ loan, asOf = new Date(), replaceExisting = true } = {}) =>
  generatePastInterest({ loan, asOf, replaceExisting });

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
      const r = await generatePastInterest({ loan, asOf: asOfUtc, replaceExisting: false });
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
  generatePeriods,
  generateInterestSchedule,
  generatePastInterest,
  generateSettlementInterest,
  generateCurrentPeriodInterest,
  generateCurrentPeriodInterestForAllLoans,
  generateInterestRecords,
  generateDueInterestForAllLoans,
  generateDueInterestForLoan,
};
