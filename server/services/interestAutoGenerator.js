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

  // ---- Borrower records (lenderId = null) ----
  let borrowerLastEnd = await getLastPeriodEnd({ loanObjectId: loan._id, lenderId: null });
  for (let i = 0; i < MAX_PERIODS_PER_ENTITY; i += 1) {
    const borrowerPeriod = getNextInterestPeriodUtc({
      baseStartDate: loan.disbursementDate,
      lastPeriodEnd: borrowerLastEnd,
      cycleMonths,
    });
    if (!borrowerPeriod) break;
    if (borrowerPeriod.periodEnd.getTime() > asOfUtc.getTime()) break;

    const exists = await recordExistsForPeriod({
      loanObjectId: loan._id,
      lenderId: null,
      periodStart: borrowerPeriod.periodStart,
      periodEnd: borrowerPeriod.periodEnd,
    });

    if (exists) {
      summary.skippedDuplicates += 1;
      borrowerLastEnd = borrowerPeriod.periodEnd;
      continue;
    }

    const borrowerInterest = calculateSimpleInterestDaily({
      principal: loan.totalLoanAmount,
      annualRatePct: loan.interestRateAnnual,
      periodStart: borrowerPeriod.periodStart,
      periodEnd: borrowerPeriod.periodEnd,
    });

    const inserted = await upsertInterestRecord({
      loanId: loan._id,
      lenderId: null,
      principal: loan.totalLoanAmount,
      borrowerRate: loan.interestRateAnnual,
      lenderRate: null,
      days: borrowerInterest.days,
      periodStart: borrowerPeriod.periodStart,
      periodEnd: borrowerPeriod.periodEnd,
      interestAmount: borrowerInterest.interestAmount,
      status: 'pending',

      // legacy fields
      principalAmount: loan.totalLoanAmount,
      interestRate: loan.interestRateAnnual,
      daysCount: borrowerInterest.days,
      startDate: borrowerPeriod.periodStart,
      endDate: borrowerPeriod.periodEnd,
    });

    if (inserted) summary.borrowerRecordsCreated += 1;
    borrowerLastEnd = borrowerPeriod.periodEnd;
  }

  // ---- Lender records ----
  const lenderEntries = Array.isArray(loan.lenders) ? loan.lenders : [];
  for (const lenderEntry of lenderEntries) {
    const lenderObjectId = lenderEntry?.lenderId;
    if (!lenderObjectId) continue;

    const baseStart = lenderEntry.moneyReceivedDate || lenderEntry.interestStartDate;
    if (!baseStart) continue;

    let lenderLastEnd = await getLastPeriodEnd({ loanObjectId: loan._id, lenderId: lenderObjectId });

    for (let i = 0; i < MAX_PERIODS_PER_ENTITY; i += 1) {
      const lenderPeriod = getNextInterestPeriodUtc({
        baseStartDate: baseStart,
        lastPeriodEnd: lenderLastEnd,
        cycleMonths,
      });
      if (!lenderPeriod) break;
      if (lenderPeriod.periodEnd.getTime() > asOfUtc.getTime()) break;

      const exists = await recordExistsForPeriod({
        loanObjectId: loan._id,
        lenderId: lenderObjectId,
        periodStart: lenderPeriod.periodStart,
        periodEnd: lenderPeriod.periodEnd,
      });

      if (exists) {
        summary.skippedDuplicates += 1;
        lenderLastEnd = lenderPeriod.periodEnd;
        continue;
      }

      const lenderInterest = calculateSimpleInterestDaily({
        principal: lenderEntry.amountContributed,
        annualRatePct: lenderEntry.lenderInterestRate,
        periodStart: lenderPeriod.periodStart,
        periodEnd: lenderPeriod.periodEnd,
      });

      const inserted = await upsertInterestRecord({
        loanId: loan._id,
        lenderId: lenderObjectId,
        principal: lenderEntry.amountContributed,
        borrowerRate: loan.interestRateAnnual,
        lenderRate: lenderEntry.lenderInterestRate,
        days: lenderInterest.days,
        periodStart: lenderPeriod.periodStart,
        periodEnd: lenderPeriod.periodEnd,
        interestAmount: lenderInterest.interestAmount,
        status: 'pending',

        // legacy fields
        principalAmount: lenderEntry.amountContributed,
        interestRate: lenderEntry.lenderInterestRate,
        daysCount: lenderInterest.days,
        startDate: lenderPeriod.periodStart,
        endDate: lenderPeriod.periodEnd,
      });

      if (inserted) summary.lenderRecordsCreated += 1;
      lenderLastEnd = lenderPeriod.periodEnd;
    }
  }

  return summary;
};

export const generateDueInterestForAllLoans = async ({ asOf = new Date() } = {}) => {
  const loans = await Loan.find({ status: { $ne: 'CLOSED' } }).lean();

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
  generateDueInterestForAllLoans,
  generateDueInterestForLoan,
};
