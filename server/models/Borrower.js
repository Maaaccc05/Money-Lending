import mongoose from 'mongoose';

const borrowerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide borrower name'],
      trim: true,
    },
    surname: {
      type: String,
      trim: true,
    },
    familyGroup: {
      type: String,
      trim: true,
      index: true,
    },
    dob: {
      type: Date,
    },
    address: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      unique: true,
      sparse: true, // allows multiple docs without a PAN
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please provide a valid PAN number'],
      select: false, // Sensitive field - not returned by default
    },
    aadhaarNumber: {
      type: String,
      match: [/^[0-9]{12}$/, 'Please provide a valid 12-digit Aadhaar number'],
      select: false, // Sensitive field - not returned by default
    },
    bankAccountNumber: {
      type: String,
      select: false, // Sensitive field - not returned by default
    },
    ifscCode: {
      type: String,
      uppercase: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    branch: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Borrower', borrowerSchema);
