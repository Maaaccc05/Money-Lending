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
export const generateInterestRecords = (loan, startDate) => {
  const records = [];
  const interestPeriodMonths = loan.interestPeriodMonths;

  for (const lender of loan.lenders) {
    const endDate = dayjs(startDate).add(interestPeriodMonths, 'month');

    const { interest, daysCount } = calculateInterest(
      lender.amountContributed,
      lender.lenderInterestRate,
      startDate,
      endDate
    );

    records.push({
      loanId: loan._id,
      lenderId: lender.lenderId,
      principalAmount: lender.amountContributed,
      interestRate: lender.lenderInterestRate,
      startDate,
      endDate: endDate.toDate(),
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
