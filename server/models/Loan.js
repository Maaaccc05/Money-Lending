const mongoose = require('mongoose');

const LenderContributionSchema = new mongoose.Schema({
    lenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lender', required: true },
    amountContributed: { type: Number, required: true, min: 0 },
    lenderInterestRate: { type: Number, required: true, min: 0 },
    moneyReceivedDate: { type: Date, required: true },
});

const LoanSchema = new mongoose.Schema({
    loanId: { type: String, unique: true },
    borrowerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Borrower', required: true },
    totalLoanAmount: { type: Number, required: [true, 'Loan amount is required'], min: 1 },
    disbursementDate: { type: Date, required: [true, 'Disbursement date is required'] },
    interestRateAnnual: { type: Number, required: [true, 'Interest rate is required'], min: 0 },
    interestPeriodMonths: { type: Number, enum: [1, 3, 6], required: [true, 'Interest period is required'] },
    status: { type: String, enum: ['active', 'closed', 'defaulted'], default: 'active' },
    lenders: [LenderContributionSchema],
    notes: { type: String, default: '' },
}, { timestamps: true });

// Auto-generate loanId before saving
LoanSchema.pre('save', async function (next) {
    if (!this.loanId) {
        const count = await mongoose.model('Loan').countDocuments();
        const year = new Date().getFullYear();
        this.loanId = `LN-${year}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Loan', LoanSchema);
