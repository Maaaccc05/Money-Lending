const dayjs = require('dayjs');

/**
 * Calculate interest using daily rate formula:
 * dailyRate = annualRate / 365
 * interest = principal × dailyRate × numberOfDays
 */
const calculateInterest = (principal, annualRate, startDate, endDate) => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const daysCount = end.diff(start, 'day');
    const dailyRate = annualRate / 100 / 365;
    const interestAmount = principal * dailyRate * daysCount;
    return {
        daysCount,
        interestAmount: Math.round(interestAmount * 100) / 100,
        dailyRate,
    };
};

/**
 * Generate interest period end date based on start date and period in months
 */
const getInterestPeriodEndDate = (startDate, periodMonths) => {
    return dayjs(startDate).add(periodMonths, 'month').toDate();
};

/**
 * Generate all interest records for a loan's lenders from a start date
 * for one interest period cycle
 */
const generateInterestRecordsForLoan = (loan, startDate) => {
    const records = [];
    const periodMonths = loan.interestPeriodMonths;
    const endDate = getInterestPeriodEndDate(startDate, periodMonths);

    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const periodLabel = `${start.format('MMM YYYY')} - ${end.format('MMM YYYY')}`;

    for (const lenderEntry of loan.lenders) {
        const { daysCount, interestAmount } = calculateInterest(
            lenderEntry.amountContributed,
            lenderEntry.lenderInterestRate,
            startDate,
            endDate
        );

        records.push({
            loanId: loan._id,
            lenderId: lenderEntry.lenderId,
            principalAmount: lenderEntry.amountContributed,
            interestRate: lenderEntry.lenderInterestRate,
            startDate: start.toDate(),
            endDate: end.toDate(),
            daysCount,
            interestAmount,
            periodLabel,
            status: 'pending',
        });
    }

    return { records, endDate };
};

/**
 * Calculate daily interest for display purposes
 */
const getDailyInterest = (principal, annualRate) => {
    const dailyRate = annualRate / 100 / 365;
    return Math.round(principal * dailyRate * 100) / 100;
};

module.exports = {
    calculateInterest,
    getInterestPeriodEndDate,
    generateInterestRecordsForLoan,
    getDailyInterest,
};
