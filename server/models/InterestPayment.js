const mongoose = require('mongoose');

const InterestPaymentSchema = new mongoose.Schema({
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
    lenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lender', required: true },
    interestRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterestRecord', required: true },
    amountPaid: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('InterestPayment', InterestPaymentSchema);
