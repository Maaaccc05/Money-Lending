import mongoose from 'mongoose';

const interestRecordSchema = new mongoose.Schema(
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
    principalAmount: {
      type: Number,
      required: [true, 'Please provide principal amount'],
      min: [0, 'Amount must be positive'],
    },
    interestRate: {
      type: Number,
      required: [true, 'Please provide interest rate'],
      min: [0, 'Interest rate must be positive'],
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide end date'],
    },
    daysCount: {
      type: Number,
      required: true,
    },
    interestAmount: {
      type: Number,
      required: [true, 'Please provide interest amount'],
      min: [0, 'Interest must be positive'],
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model('InterestRecord', interestRecordSchema);
