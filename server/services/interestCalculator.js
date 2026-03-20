// NOTE: We intentionally use UTC date math (start-of-day) to avoid
// timezone/DST causing off-by-one day errors.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const toUtcStartOfDay = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

export const addDaysUtc = (date, days) => {
  const d = toUtcStartOfDay(date);
  if (!d) return null;
  return new Date(d.getTime() + days * MS_PER_DAY);
};

export const diffDaysInclusiveUtc = (startDate, endDate) => {
  const start = toUtcStartOfDay(startDate);
  const end = toUtcStartOfDay(endDate);
  if (!start || !end) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  return diff + 1;
};


export const endOfMonthUtc = (date) => {
  const d = toUtcStartOfDay(date);
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  // day 0 of next month is last day of current month
  return new Date(Date.UTC(y, m + 1, 0));
};

// Public alias used by interest generation utilities.
export const getLastDateOfMonth = (date) => endOfMonthUtc(date);

export const startOfMonthUtc = (date) => {
  const d = toUtcStartOfDay(date);
  if (!d) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

export const firstDayNextMonthUtc = (date) => {
  const d = toUtcStartOfDay(date);
  if (!d) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
};

export const addMonthsUtc = (date, months) => {
  const d = toUtcStartOfDay(date);
  if (!d) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Number(months || 0), d.getUTCDate()));
};

// Public alias used by interest generation utilities.
export const addMonths = (date, months) => addMonthsUtc(date, months);

// Period boundary resolver for month-based cycles.
// periodType supports 1 and 3 months here; 6-month uses financial cycle helpers.
export const getPeriodEndDate = (startDate, periodType) => {
  const start = toUtcStartOfDay(startDate);
  if (!start) return null;

  if (Number(periodType) === 1) {
    return getLastDateOfMonth(start);
  }

  if (Number(periodType) === 3) {
    return getLastDateOfMonth(addMonths(start, 2));
  }

  return null;
};

// Fixed financial half-year cycles:
// Cycle 1: Apr 1 -> Sep 30
// Cycle 2: Oct 1 -> Mar 31 (next year)
export const getSixMonthCycle = (date) => {
  const d = toUtcStartOfDay(date);
  if (!d) return null;

  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1; // 1-12

  if (month >= 4 && month <= 9) {
    return {
      startDate: new Date(Date.UTC(year, 3, 1)),
      endDate: new Date(Date.UTC(year, 8, 30)),
    };
  }

  if (month >= 10) {
    return {
      startDate: new Date(Date.UTC(year, 9, 1)),
      endDate: new Date(Date.UTC(year + 1, 2, 31)),
    };
  }

  return {
    startDate: new Date(Date.UTC(year - 1, 9, 1)),
    endDate: new Date(Date.UTC(year, 2, 31)),
  };
};

// Returns the nearest financial cycle boundary end date for a given start date.
// Jan-Mar  -> Mar 31 (same year)
// Apr-Sep  -> Sep 30 (same year)
// Oct-Dec  -> Mar 31 (next year)
export const getSixMonthEndDate = (startDate) => {
  const start = toUtcStartOfDay(startDate);
  if (!start) return null;

  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + 1;

  if (month >= 1 && month <= 3) {
    return new Date(Date.UTC(year, 2, 31));
  }

  if (month >= 4 && month <= 9) {
    return new Date(Date.UTC(year, 8, 30));
  }

  return new Date(Date.UTC(year + 1, 2, 31));
};

const getInitialSixMonthPeriod = (loanStartDate) => {
  const start = toUtcStartOfDay(loanStartDate);
  if (!start) return null;
  const endDate = getSixMonthEndDate(start);
  return {
    startDate: start,
    endDate,
  };
};

// Hybrid six-month periods:
// 1) first partial period from loan start to cycle boundary
// 2) subsequent fixed cycles Apr-Sep and Oct-Mar
export const getSixMonthPeriods = (loan, today = new Date()) => {
  const loanStart = toUtcStartOfDay(loan?.disbursementDate || loan?.loanStartDate || loan);
  const asOf = toUtcStartOfDay(today);
  if (!loanStart || !asOf) return [];
  if (asOf.getTime() < loanStart.getTime()) return [];

  const first = getInitialSixMonthPeriod(loanStart);
  if (!first) return [];

  const periods = [
    {
      startDate: first.startDate,
      endDate: first.endDate,
    },
  ];

  if (asOf.getTime() <= first.endDate.getTime()) {
    return periods;
  }

  let cursor = addDaysUtc(first.endDate, 1);
  for (let i = 0; i < 2000; i += 1) {
    if (!cursor) break;
    const cycle = getSixMonthCycle(cursor);
    if (!cycle) break;

    periods.push({
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    });

    if (asOf.getTime() <= cycle.endDate.getTime()) break;

    cursor = addDaysUtc(cycle.endDate, 1);
  }

  return periods;
};

const halfYearCycleCandidatesUtc = (year) => [
  new Date(Date.UTC(year, 2, 31)), // Mar 31
  new Date(Date.UTC(year, 8, 30)), // Sep 30
];

export const getNextCycleEndDateUtc = (periodStart, cycleMonths) => {
  const start = toUtcStartOfDay(periodStart);
  if (!start) return null;

  if (cycleMonths === 1) return endOfMonthUtc(start);
  if (cycleMonths === 3) return endOfMonthUtc(addMonthsUtc(start, 2));

  const year = start.getUTCFullYear();
  const candidates = halfYearCycleCandidatesUtc(year);

  for (const c of candidates) {
    if (c.getTime() >= start.getTime()) return c;
  }

  // Start is after the last cycle end date in this year; move to next year.
  const nextYearCandidates = halfYearCycleCandidatesUtc(year + 1);
  return nextYearCandidates[0];
};

export const calculatePeriodInterest = ({ principal, annualRatePct, periodStart, periodEnd }) => {
  const days = diffDaysInclusiveUtc(periodStart, periodEnd);
  if (days == null) {
    throw new Error('Invalid dates for interest calculation');
  }

  const rateDecimal = (Number(annualRatePct) || 0) / 100;
  const interest = (Number(principal) || 0) * rateDecimal * (days / 365);

  return {
    interestAmount: Math.round(interest * 100) / 100,
    days,
  };
};


export const getNextInterestPeriodUtc = ({ baseStartDate, lastPeriodEnd, cycleMonths }) => {
  const base = toUtcStartOfDay(baseStartDate);
  if (!base) return null;

  if (cycleMonths === 6) {
    if (!lastPeriodEnd) {
      const first = getInitialSixMonthPeriod(base);
      if (!first) return null;
      return {
        periodStart: first.startDate,
        periodEnd: first.endDate,
      };
    }

    const refDate = addDaysUtc(lastPeriodEnd, 1);
    if (!refDate) return null;
    const cycle = getSixMonthCycle(refDate);
    if (!cycle) return null;
    return {
      periodStart: cycle.startDate,
      periodEnd: cycle.endDate,
    };
  }

  let periodStart = base;
  if (lastPeriodEnd) {
    const next = addDaysUtc(lastPeriodEnd, 1);
    if (!next) return null;
    // Never move earlier than base start date.
    periodStart = next.getTime() > base.getTime() ? next : base;
  }

  const periodEnd = getPeriodEndDate(periodStart, cycleMonths) || getNextCycleEndDateUtc(periodStart, cycleMonths);
  if (!periodEnd) return null;

  return { periodStart, periodEnd };
};

const monthDiff = (startMonthDate, endMonthDate) => {
  const s = startOfMonthUtc(startMonthDate);
  const e = startOfMonthUtc(endMonthDate);
  if (!s || !e) return 0;
  return (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth());
};

const getCurrentRollingPeriod1M = ({ loanStart, asOf }) => {
  const firstEnd = endOfMonthUtc(loanStart);
  if (asOf.getTime() <= firstEnd.getTime()) {
    return { periodStart: loanStart, periodEnd: firstEnd };
  }
  const periodStart = startOfMonthUtc(asOf);
  const periodEnd = endOfMonthUtc(asOf);
  return { periodStart, periodEnd };
};

const getCurrentRollingPeriod3M = ({ loanStart, asOf }) => {
  const firstEnd = endOfMonthUtc(loanStart);
  if (asOf.getTime() <= firstEnd.getTime()) {
    return { periodStart: loanStart, periodEnd: firstEnd };
  }

  const firstFullStart = firstDayNextMonthUtc(loanStart);
  const monthsSinceFirstFullStart = monthDiff(firstFullStart, asOf);
  const cycleIndex = Math.floor(Math.max(0, monthsSinceFirstFullStart) / 3);
  const periodStart = addMonthsUtc(firstFullStart, cycleIndex * 3);
  const periodEnd = endOfMonthUtc(addMonthsUtc(periodStart, 2));
  return { periodStart, periodEnd };
};

// Rolling active period selector used by current-period-only interest generation.
// 6-month logic intentionally reuses existing period boundary behavior.
export const getCurrentInterestPeriodUtc = ({ loanStartDate, cycleMonths, asOfDate = new Date() }) => {
  const loanStart = toUtcStartOfDay(loanStartDate);
  const asOf = toUtcStartOfDay(asOfDate);
  if (!loanStart || !asOf) return null;

  if (cycleMonths === 1) {
    return getCurrentRollingPeriod1M({ loanStart, asOf });
  }

  if (cycleMonths === 3) {
    return getCurrentRollingPeriod3M({ loanStart, asOf });
  }

  if (cycleMonths === 6) {
    const periods = getSixMonthPeriods({ disbursementDate: loanStart }, asOf);
    if (!periods.length) return null;
    const current = periods[periods.length - 1];
    return {
      periodStart: current.startDate,
      periodEnd: current.endDate,
    };
  }

  return null;
};

export default {
  addDaysUtc,
  addMonthsUtc,
  diffDaysInclusiveUtc,
  endOfMonthUtc,
  firstDayNextMonthUtc,
  getCurrentInterestPeriodUtc,
  getLastDateOfMonth,
  addMonths,
  getPeriodEndDate,
  getSixMonthCycle,
  getSixMonthEndDate,
  getSixMonthPeriods,
  getNextCycleEndDateUtc,
  calculatePeriodInterest,
  getNextInterestPeriodUtc,
  startOfMonthUtc,
  toUtcStartOfDay,
};
