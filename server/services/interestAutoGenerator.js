import InterestRecord from '../models/InterestRecord.js';
import Loan from '../models/Loan.js';
import { calculateSimpleInterestDaily, getNextInterestPeriodUtc } from './interestCalculator.js';

const SUPPORTED_CYCLES = new Set([1, 3, 6]);
const MAX_PERIODS_PER_ENTITY = 2000; // safety against infinite loops / bad data

const utcStartOfDay = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const maxDate = (a, b) => (a.getTime() >= b.getTime() ? a : b);

const computeFundedAmount = (loan) => {
  const lenders = Array.isArray(loan?.lenders) ? loan.lenders : [];
  return lenders.reduce((sum, l) => sum + (Number(l?.amountContributed) || 0), 0);
};

const buildDuePeriods = ({ disbursementDate, cycleMonths, asOfUtc }) => {
  const periods = [];
  let lastPeriodEnd = null;

  for (let i = 0; i < MAX_PERIODS_PER_ENTITY; i += 1) {
    const period = getNextInterestPeriodUtc({
      baseStartDate: disbursementDate,
      lastPeriodEnd,
      cycleMonths,
    });
    if (!period) break;
    if (period.periodEnd.getTime() > asOfUtc.getTime()) break;
    periods.push(period);
    lastPeriodEnd = period.periodEnd;
  }

  return periods;
};

const buildLenderDocForPeriod = ({ loan, lenderEntry, borrowerPeriod }) => {
  const borrowerObjectId = loan?.borrowerId?._id || loan?.borrowerId || null;
  const lenderObjectId = lenderEntry?.lenderId?._id || lenderEntry?.lenderId;
  if (!lenderObjectId) return null;

  const rawStart = lenderEntry.moneyReceivedDate || lenderEntry.interestStartDate;
  const lenderStart = utcStartOfDay(rawStart);
  if (!lenderStart) return null;
  if (lenderStart.getTime() > borrowerPeriod.periodEnd.getTime()) return null;

  const effectiveStart = maxDate(borrowerPeriod.periodStart, lenderStart);
  const interest = calculateSimpleInterestDaily({
    principal: lenderEntry.amountContributed,
    annualRatePct: loan.interestRateAnnual,
    periodStart: effectiveStart,
    periodEnd: borrowerPeriod.periodEnd,
  });

  return {
    loanId: loan._id,
    borrowerId: borrowerObjectId,
    totalLoanAmount: Number(loan.totalLoanAmount) || 0,
    lenderId: lenderObjectId,
    principal: lenderEntry.amountContributed,
    borrowerRate: loan.interestRateAnnual,
    lenderRate: null,
    days: interest.days,
    periodStart: borrowerPeriod.periodStart,
    periodEnd: borrowerPeriod.periodEnd,
    interestAmount: interest.interestAmount,
    status: 'pending',

    // legacy fields
    principalAmount: lenderEntry.amountContributed,
    interestRate: loan.interestRateAnnual,
    daysCount: interest.days,
    startDate: effectiveStart,
    endDate: borrowerPeriod.periodEnd,
  };
};

const buildBorrowerDocForPeriod = ({ loan, borrowerPeriod, lenderDocs }) => {
  const borrowerObjectId = loan?.borrowerId?._id || loan?.borrowerId || null;
  const totalLenderInterest = lenderDocs.reduce((sum, doc) => sum + (Number(doc.interestAmount) || 0), 0);
  const borrowerInterest = Math.round(totalLenderInterest * 100) / 100;
  const activePrincipal = lenderDocs.reduce((sum, doc) => sum + (Number(doc.principal) || 0), 0);
  const borrowerDays = calculateSimpleInterestDaily({
    principal: 1,
    annualRatePct: 1,
    periodStart: borrowerPeriod.periodStart,
    periodEnd: borrowerPeriod.periodEnd,
  }).days;

  return {
    loanId: loan._id,
    borrowerId: borrowerObjectId,
    totalLoanAmount: Number(loan.totalLoanAmount) || 0,
    lenderId: null,
    principal: activePrincipal,
    borrowerRate: loan.interestRateAnnual,
    lenderRate: null,
    days: borrowerDays,
    periodStart: borrowerPeriod.periodStart,
    periodEnd: borrowerPeriod.periodEnd,
    interestAmount: borrowerInterest,
    status: 'pending',

    // legacy fields
    principalAmount: activePrincipal,
    interestRate: loan.interestRateAnnual,
    daysCount: borrowerDays,
    startDate: borrowerPeriod.periodStart,
    endDate: borrowerPeriod.periodEnd,
  };
};

export const generateInterestRecords = async ({ loan, asOf = new Date(), replaceExisting = true } = {}) => {
  if (!loan?._id) {
    throw new Error('generateInterestRecords requires a loan document');
  }

  if (loan?.loanStatus === 'CLOSED' || loan?.status === 'CLOSED') {
    return {
      borrowerRecordsCreated: 0,
      lenderRecordsCreated: 0,
      deletedRecords: 0,
      periodsGenerated: 0,
      skipped: true,
    };
  }

  const asOfUtc = utcStartOfDay(asOf);
  if (!asOfUtc) throw new Error('Invalid asOf date for interest regeneration');

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

  const periods = buildDuePeriods({
    disbursementDate: loan.disbursementDate,
    cycleMonths,
    asOfUtc,
  });

  let deletedRecords = 0;
  if (replaceExisting) {
    const del = await InterestRecord.deleteMany({ loanId: loan._id });
    deletedRecords = Number(del?.deletedCount || 0);
  }

  const lenderEntries = Array.isArray(loan.lenders) ? loan.lenders : [];
  const docs = [];

  for (const borrowerPeriod of periods) {
    const lenderDocs = [];
    for (const lenderEntry of lenderEntries) {
      const lenderDoc = buildLenderDocForPeriod({ loan, lenderEntry, borrowerPeriod });
      if (!lenderDoc) continue;
      lenderDocs.push(lenderDoc);
    }

    // Partial funding support: borrower interest follows funded contributions only.
    const borrowerDoc = buildBorrowerDocForPeriod({ loan, borrowerPeriod, lenderDocs });
    docs.push(borrowerDoc, ...lenderDocs);
  }

  if (docs.length > 0) {
    await InterestRecord.insertMany(docs, { ordered: false });
  }

  return {
    borrowerRecordsCreated: periods.length,
    lenderRecordsCreated: docs.length - periods.length,
    deletedRecords,
    periodsGenerated: periods.length,
    skipped: false,
  };
};

const getLastPeriodEnd = async ({ loanObjectId, lenderId }) => {
  const q = { loanId: loanObjectId, lenderId: lenderId ?? null };
  const last = await InterestRecord.findOne(q)
    .sort({ periodEnd: -1, endDate: -1 })
    .select('periodEnd endDate')
    .lean();
  return last?.periodEnd || last?.endDate || null;
};

const recordExistsForPeriod = async ({ loanObjectId, lenderId, periodStart, periodEnd }) => {
  return Boolean(
    await InterestRecord.findOne({
      loanId: loanObjectId,
      lenderId: lenderId ?? null,
      $or: [
        { periodStart, periodEnd },
        // Legacy duplicates
        { startDate: periodStart, endDate: periodEnd },
      ],
    })
      .select('_id')
      .lean()
  );
};

const upsertInterestRecord = async (doc) => {
  const filter = {
    loanId: doc.loanId,
    lenderId: doc.lenderId ?? null,
    periodStart: doc.periodStart,
    periodEnd: doc.periodEnd,
  };

  // Upsert prevents duplicates across concurrent cron runs.
  const result = await InterestRecord.updateOne(filter, { $setOnInsert: doc }, { upsert: true });
  const upsertedId = result.upsertedId?._id || result.upsertedId;
  return Boolean(upsertedId);
};

export const generateDueInterestForLoan = async ({ loan, asOf } = {}) => {
  if (!loan?._id) {
    throw new Error('generateDueInterestForLoan requires a loan document');
  }

  // Never generate interest for closed loans
  if (loan?.loanStatus === 'CLOSED' || loan?.status === 'CLOSED') {
    return {
      borrowerRecordsCreated: 0,
      lenderRecordsCreated: 0,
      skippedDuplicates: 0,
      errors: 0,
    };
  }

  const asOfUtc = utcStartOfDay(asOf ?? new Date());
  if (!asOfUtc) {
    throw new Error('Invalid asOf date for interest generation');
  }

  const cycleMonths = Number(loan.interestPeriodMonths);
  if (!SUPPORTED_CYCLES.has(cycleMonths)) {
    return {
      borrowerRecordsCreated: 0,
      lenderRecordsCreated: 0,
      skippedDuplicates: 0,
      errors: 0,
    };
  }

  const summary = {
    borrowerRecordsCreated: 0,
    lenderRecordsCreated: 0,
    skippedDuplicates: 0,
    errors: 0,
  };

  const borrowerObjectId = loan?.borrowerId?._id || loan?.borrowerId || null;
  const lenderEntries = Array.isArray(loan.lenders) ? loan.lenders : [];

  // Borrower period is authoritative; borrower + lender records are generated in lockstep per period.
  let borrowerLastEnd = await getLastPeriodEnd({ loanObjectId: loan._id, lenderId: null });
  for (let i = 0; i < MAX_PERIODS_PER_ENTITY; i += 1) {
    const borrowerPeriod = getNextInterestPeriodUtc({
      baseStartDate: loan.disbursementDate,
      lastPeriodEnd: borrowerLastEnd,
      cycleMonths,
    });
    if (!borrowerPeriod) break;
    if (borrowerPeriod.periodEnd.getTime() > asOfUtc.getTime()) break;

    const lenderDocsForPeriod = [];
    for (const lenderEntry of lenderEntries) {
      const lenderDoc = buildLenderDocForPeriod({ loan, lenderEntry, borrowerPeriod });
      if (!lenderDoc) continue;
      lenderDocsForPeriod.push(lenderDoc);
    }

    for (const lenderDoc of lenderDocsForPeriod) {
      const exists = await recordExistsForPeriod({
        loanObjectId: loan._id,
        lenderId: lenderDoc.lenderId,
        periodStart: lenderDoc.periodStart,
        periodEnd: lenderDoc.periodEnd,
      });

      if (exists) {
        summary.skippedDuplicates += 1;
        continue;
      }

      const inserted = await upsertInterestRecord({
        ...lenderDoc,
        borrowerId: borrowerObjectId,
        totalLoanAmount: Number(loan.totalLoanAmount) || 0,
      });
      if (inserted) summary.lenderRecordsCreated += 1;
    }

    const borrowerDoc = buildBorrowerDocForPeriod({ loan, borrowerPeriod, lenderDocs: lenderDocsForPeriod });
    const borrowerExists = await recordExistsForPeriod({
      loanObjectId: loan._id,
      lenderId: null,
      periodStart: borrowerDoc.periodStart,
      periodEnd: borrowerDoc.periodEnd,
    });

    if (borrowerExists) {
      summary.skippedDuplicates += 1;
    } else {
      const inserted = await upsertInterestRecord({
        ...borrowerDoc,
        borrowerId: borrowerObjectId,
        totalLoanAmount: Number(loan.totalLoanAmount) || 0,
      });
      if (inserted) summary.borrowerRecordsCreated += 1;
    }

    borrowerLastEnd = borrowerPeriod.periodEnd;
  }

  return summary;
};

export const generateDueInterestForAllLoans = async ({ asOf = new Date() } = {}) => {
  const loans = await Loan.find({
    status: { $ne: 'CLOSED' },
    loanStatus: { $ne: 'CLOSED' },
  }).lean();

  const asOfUtc = utcStartOfDay(asOf ?? new Date());
  if (!asOfUtc) {
    throw new Error('Invalid asOf date for interest generation job');
  }

  const summary = {
    asOf: asOfUtc,
    loansScanned: loans.length,
    borrowerRecordsCreated: 0,
    lenderRecordsCreated: 0,
    skippedDuplicates: 0,
    errors: 0,
  };

  for (const loan of loans) {
    try {
      const r = await generateDueInterestForLoan({ loan, asOf: asOfUtc });
      summary.borrowerRecordsCreated += r.borrowerRecordsCreated;
      summary.lenderRecordsCreated += r.lenderRecordsCreated;
      summary.skippedDuplicates += r.skippedDuplicates;
      summary.errors += r.errors;
    } catch (err) {
      summary.errors += 1;
      console.error('[interestAutoGenerator] loan error', loan?._id, err);
    }
  }

  return summary;
};

export default {
  generateInterestRecords,
  generateDueInterestForAllLoans,
  generateDueInterestForLoan,
};
