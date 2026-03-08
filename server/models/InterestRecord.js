const mongoose = require('mongoose');

const InterestRecordSchema = new mongoose.Schema({
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
    lenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lender', required: true },
    principalAmount: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    daysCount: { type: Number, required: true },
    interestAmount: { type: Number, required: true },
    periodLabel: { type: String, default: '' }, // e.g., "Jan 2024 - Feb 2024"
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('InterestRecord', InterestRecordSchema);
