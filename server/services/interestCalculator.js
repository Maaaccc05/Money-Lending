// NOTE: We intentionally use UTC date math (start-of-day) to avoid
// timezone/DST causing off-by-one day errors.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toUtcStartOfDay = (value) => {
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

const halfYearCycleCandidatesUtc = (year) => [
  new Date(Date.UTC(year, 2, 31)), // Mar 31
  new Date(Date.UTC(year, 8, 30)), // Sep 30
];

export const getNextCycleEndDateUtc = (periodStart, cycleMonths) => {
  const start = toUtcStartOfDay(periodStart);
  if (!start) return null;

  if (cycleMonths === 1) {
    // Fixed-day cycle: 30 days total, inclusive of start and end.
    // (We subtract 1 because diffDaysInclusiveUtc counts both endpoints.)
    return addDaysUtc(start, 29);
  }

  if (cycleMonths === 3) {
    // Fixed-day cycle: 90 days total, inclusive of start and end.
    return addDaysUtc(start, 89);
  }

  const year = start.getUTCFullYear();
  const candidates = halfYearCycleCandidatesUtc(year);

  for (const c of candidates) {
    if (c.getTime() >= start.getTime()) return c;
  }

  // Start is after the last cycle end date in this year; move to next year.
  const nextYearCandidates =
    cycleMonths === 3 ? quarterCycleCandidatesUtc(year + 1) : halfYearCycleCandidatesUtc(year + 1);
  return nextYearCandidates[0];
};

export const calculateSimpleInterestDaily = ({ principal, annualRatePct, periodStart, periodEnd }) => {
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

  let periodStart = base;
  if (lastPeriodEnd) {
    const next = addDaysUtc(lastPeriodEnd, 1);
    if (!next) return null;
    // Never move earlier than base start date.
    periodStart = next.getTime() > base.getTime() ? next : base;
  }

  const periodEnd = getNextCycleEndDateUtc(periodStart, cycleMonths);
  if (!periodEnd) return null;

  return { periodStart, periodEnd };
};

export default {
  addDaysUtc,
  diffDaysInclusiveUtc,
  endOfMonthUtc,
  getNextCycleEndDateUtc,
  calculateSimpleInterestDaily,
  getNextInterestPeriodUtc,
};
