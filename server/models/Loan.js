import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema(
  {
    loanId: {
      type: String,
      unique: true,
      index: true,
    },
    borrowerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Borrower',
      required: [true, 'Please provide borrower ID'],
    },
    totalLoanAmount: {
      type: Number,
      required: [true, 'Please provide total loan amount'],
      min: [0, 'Loan amount must be positive'],
    },
    fundedAmount: {
      type: Number,
      default: 0,
      min: [0, 'Funded amount must be positive'],
    },
    remainingAmount: {
      type: Number,
      default: 0,
    },
    disbursementDate: {
      type: Date,
      required: [true, 'Please provide disbursement date'],
    },
    interestRateAnnual: {
      type: Number,
      required: [true, 'Please provide annual interest rate'],
      min: [0, 'Interest rate must be positive'],
    },
    interestPeriodMonths: {
      type: Number,
      enum: [1, 3, 6],
      required: [true, 'Interest period must be 1, 3, or 6 months'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_FUNDED', 'FULLY_FUNDED', 'CLOSED'],
      default: 'PENDING',
    },
    lenders: [
      {
        lenderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Lender',
          required: true,
        },
        amountContributed: {
          type: Number,
          required: true,
          min: [0, 'Amount must be positive'],
        },
        lenderInterestRate: {
          type: Number,
          required: true,
          min: [0, 'Interest rate must be positive'],
        },
        moneyReceivedDate: {
          type: Date,
          required: true,
        },
        interestStartDate: {
          type: Date,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate loanId before saving
loanSchema.pre('save', async function (next) {
  if (!this.loanId) {
    const count = await mongoose.model('Loan').countDocuments();
    this.loanId = `LOAN-${Date.now()}-${count + 1}`;
  }
  next();
});

export default mongoose.model('Loan', loanSchema);
