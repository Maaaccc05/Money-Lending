import dayjs from 'dayjs';

// Calculate daily interest rate
const calculateDailyRate = (annualRate) => {
  return annualRate / 365;
};

// Calculate interest for a period
export const calculateInterest = (principal, annualRate, startDate, endDate) => {
  const dailyRate = calculateDailyRate(annualRate / 100); // Convert percentage to decimal

  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const daysCount = end.diff(start, 'day') + 1; // Include both start and end date

  const interest = principal * dailyRate * daysCount;

  return {
    interest: Math.round(interest * 100) / 100, // Round to 2 decimal places
    daysCount,
  };
};

// Generate interest records for a loan period
// Each lender's interest starts from their own interestStartDate (= moneyReceivedDate)
export const generateInterestRecords = (loan, endDate) => {
  const records = [];
  const periodEndDate = dayjs(endDate);

  for (const lender of loan.lenders) {
    // Use interestStartDate (= moneyReceivedDate) for this specific lender
    const lenderStartDate = lender.interestStartDate || lender.moneyReceivedDate;

    if (!lenderStartDate) continue;

    const start = dayjs(lenderStartDate);

    // Skip lenders whose money was received after the requested end date
    if (start.isAfter(periodEndDate)) continue;

    const { interest, daysCount } = calculateInterest(
      lender.amountContributed,
      lender.lenderInterestRate,
      lenderStartDate,
      periodEndDate.toDate()
    );

    records.push({
      loanId: loan._id,
      lenderId: lender.lenderId,
      principalAmount: lender.amountContributed,
      interestRate: lender.lenderInterestRate,
      startDate: new Date(lenderStartDate),
      endDate: periodEndDate.toDate(),
      daysCount,
      interestAmount: interest,
      status: 'pending',
    });
  }

  return records;
};

export default {
  calculateInterest,
  generateInterestRecords,
  calculateDailyRate,
};
