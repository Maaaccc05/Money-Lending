import mongoose from 'mongoose';

const isFourDigitNumericLoanId = (v) => /^\d{4}$/.test(String(v || ''));

const loanSchema = new mongoose.Schema(
  {
    loanId: {
      type: String,
      unique: true,
      index: true,
      required: true,
      validate: {
        validator: function (value) {
          // Do not break legacy loans on edit; enforce only for new docs or explicit loanId changes.
          if (!this.isNew && !this.isModified('loanId')) return true;
          return isFourDigitNumericLoanId(value);
        },
        message: 'loanId must be a random unique 4-digit numeric string (1000-9999)',
      },
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
    // New: operational status for interest generation
    loanStatus: {
      type: String,
      enum: ['ACTIVE', 'CLOSED'],
      default: 'ACTIVE',
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

// Random 4-digit unique loanId generator (1000-9999).
// Uniqueness is checked against the DB; the unique index still enforces it under concurrency.
loanSchema.statics.generateLoanId = async function generateLoanId() {
  let newId;
  let exists = true;

  // If the 4-digit ID space is exhausted, fail fast.
  const count4Digit = await this.countDocuments({ loanId: /^\d{4}$/ });
  if (count4Digit >= 9000) {
    throw new Error('No available 4-digit loanId left (range 1000-9999 is exhausted)');
  }

  while (exists) {
    newId = Math.floor(1000 + Math.random() * 9000).toString(); // 1000–9999
    // eslint-disable-next-line no-await-in-loop
    const existingLoan = await this.findOne({ loanId: newId }).select('_id').lean();
    exists = !!existingLoan;
  }

  return newId;
};

// Ensure new loans always get a loanId before validation.
loanSchema.pre('validate', async function (next) {
  try {
    if (this.isNew && !this.loanId) {
      this.loanId = await this.constructor.generateLoanId();
    }
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('Loan', loanSchema);
