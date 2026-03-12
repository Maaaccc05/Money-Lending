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
    paymentDate: {
      type: Date,
      required: [true, 'Please provide payment date'],
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('InterestPayment', interestPaymentSchema);
