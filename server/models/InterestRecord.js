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
      default: null,
    },
    // --- New fields (per updated lending rules) ---
    principal: {
      type: Number,
      required: [true, 'Please provide principal'],
      min: [0, 'Amount must be positive'],
    },
    borrowerRate: {
      // Annual rate (%) from the Loan
      type: Number,
      default: null,
      min: [0, 'Borrower rate must be positive'],
    },
    lenderRate: {
      // Annual rate (%) defined by lender contribution
      type: Number,
      default: null,
      min: [0, 'Lender rate must be positive'],
    },
    days: {
      type: Number,
      required: [true, 'Please provide days'],
      min: [1, 'Days must be at least 1'],
    },
    periodStart: {
      type: Date,
      required: [true, 'Please provide period start'],
    },
    periodEnd: {
      type: Date,
      required: [true, 'Please provide period end'],
    },
    interestAmount: {
      type: Number,
      required: [true, 'Please provide interest amount'],
      min: [0, 'Interest must be positive'],
    },

    // --- Legacy fields (kept for existing UI/backward compatibility) ---
    // New record generation will also populate these.
    principalAmount: {
      type: Number,
      default: null,
      min: [0, 'Amount must be positive'],
    },
    interestRate: {
      type: Number,
      default: null,
      min: [0, 'Interest rate must be positive'],
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    daysCount: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Backward/forward compatibility:
// - If an old document only has legacy fields, backfill the new required fields.
// - If a new document only has new fields, backfill legacy fields for existing UI code.
interestRecordSchema.pre('validate', function (next) {
  try {
    // Legacy -> new
    if ((this.principal == null || Number.isNaN(this.principal)) && this.principalAmount != null) {
      this.principal = this.principalAmount;
    }
    if (!this.periodStart && this.startDate) {
      this.periodStart = this.startDate;
    }
    if (!this.periodEnd && this.endDate) {
      this.periodEnd = this.endDate;
    }
    if ((this.days == null || Number.isNaN(this.days)) && this.daysCount != null) {
      this.days = this.daysCount;
    }
    // For legacy records, `interestRate` corresponds to lender rate.
    if ((this.lenderRate == null || Number.isNaN(this.lenderRate)) && this.interestRate != null) {
      this.lenderRate = this.interestRate;
    }

    // New -> legacy
    if ((this.principalAmount == null || Number.isNaN(this.principalAmount)) && this.principal != null) {
      this.principalAmount = this.principal;
    }
    if ((this.interestRate == null || Number.isNaN(this.interestRate)) && this.lenderRate != null) {
      this.interestRate = this.lenderRate;
    }
    if (!this.startDate && this.periodStart) {
      this.startDate = this.periodStart;
    }
    if (!this.endDate && this.periodEnd) {
      this.endDate = this.periodEnd;
    }
    if ((this.daysCount == null || Number.isNaN(this.daysCount)) && this.days != null) {
      this.daysCount = this.days;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Duplicate prevention: unique per loanId + lenderId + periodStart + periodEnd
interestRecordSchema.index(
  { loanId: 1, lenderId: 1, periodStart: 1, periodEnd: 1 },
  {
    unique: true,
    name: 'uniq_interest_period_per_lender',
    // Enforce uniqueness for the refactored records only.
    // This avoids index build failures if legacy documents don't have periodStart/periodEnd.
    partialFilterExpression: {
      periodStart: { $type: 'date' },
      periodEnd: { $type: 'date' },
    },
  }
);

// Helpful query indexes
interestRecordSchema.index({ status: 1, periodEnd: 1 });
interestRecordSchema.index({ loanId: 1, periodStart: 1 });

export default mongoose.model('InterestRecord', interestRecordSchema);
