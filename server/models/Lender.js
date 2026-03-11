import mongoose from 'mongoose';

const lenderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide lender name'],
      trim: true,
    },
    surname: {
      type: String,
      required: [true, 'Please provide lender surname'],
      trim: true,
    },
    familyGroup: {
      type: String,
      required: [true, 'Please provide family group'],
      trim: true,
      index: true,
    },
    dob: {
      type: Date,
      required: [true, 'Please provide date of birth'],
    },
    address: {
      type: String,
      required: [true, 'Please provide address'],
      trim: true,
    },
    panNumber: {
      type: String,
      required: [true, 'Please provide PAN number'],
      unique: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please provide a valid PAN number'],
      select: false, // Sensitive field - not returned by default
    },
    aadhaarNumber: {
      type: String,
      required: [true, 'Please provide Aadhaar number'],
      match: [/^[0-9]{12}$/, 'Please provide a valid 12-digit Aadhaar number'],
      select: false, // Sensitive field - not returned by default
    },
    bankAccountNumber: {
      type: String,
      required: [true, 'Please provide bank account number'],
      select: false, // Sensitive field - not returned by default
    },
    ifscCode: {
      type: String,
      required: [true, 'Please provide IFSC code'],
      uppercase: true,
    },
    bankName: {
      type: String,
      required: [true, 'Please provide bank name'],
      trim: true,
    },
    branch: {
      type: String,
      required: [true, 'Please provide branch name'],
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Lender', lenderSchema);
