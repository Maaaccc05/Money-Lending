import mongoose from 'mongoose';

const interestPaymentSchema = new mongoose.Schema(
  {
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: [true, 'Please provide loan ID'],
    },
    lenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lender',
      required: [true, 'Please provide lender ID'],
    },
    interestRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterestRecord',
      required: [true, 'Please provide interest record ID'],
    },
    amountPaid: {
      type: Number,
      required: [true, 'Please provide paid amount'],
      min: [0, 'Amount must be positive'],
    },

    // New: explicit payment breakdown for TDS receipts.
    amountReceived: {
      type: Number,
      default: null,
      min: [0, 'Amount received must be non-negative'],
    },
    tdsPercent: {
      type: Number,
      default: 10,
      min: [0, 'TDS percent must be non-negative'],
      max: [100, 'TDS percent cannot exceed 100'],
    },
    tdsAmount: {
      type: Number,
      default: null,
      min: [0, 'TDS amount must be non-negative'],
    },
    balanceAmount: {
      type: Number,
      default: null,
      min: [0, 'Balance amount must be non-negative'],
    },
    receiptPdfUrl: {
      type: String,
      default: null,
      trim: true,
    },
    paymentDate: {
      type: Date,
      required: [true, 'Please provide payment date'],
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('InterestPayment', interestPaymentSchema);
