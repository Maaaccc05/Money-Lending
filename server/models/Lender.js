const mongoose = require('mongoose');

const LenderSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'First name is required'], trim: true },
    surname: { type: String, required: [true, 'Surname is required'], trim: true },
    familyGroup: { type: String, trim: true, default: '' },
    dob: { type: Date, required: [true, 'Date of birth is required'] },
    address: { type: String, trim: true, default: '' },
    panNumber: { type: String, trim: true, uppercase: true, default: '' },
    aadhaarNumber: { type: String, trim: true, default: '' },
    bankAccountNumber: { type: String, trim: true, default: '' },
    ifscCode: { type: String, trim: true, uppercase: true, default: '' },
    bankName: { type: String, trim: true, default: '' },
    branch: { type: String, trim: true, default: '' },
}, { timestamps: true });

LenderSchema.index({ name: 'text', surname: 'text', familyGroup: 'text' });

module.exports = mongoose.model('Lender', LenderSchema);
