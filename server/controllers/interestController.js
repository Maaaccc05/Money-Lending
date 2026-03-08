const Loan = require('../models/Loan');
const InterestRecord = require('../models/InterestRecord');
const InterestPayment = require('../models/InterestPayment');
const { generateInterestRecordsForLoan } = require('../services/interestCalculator');
const dayjs = require('dayjs');

// @desc    Generate interest records for a loan
// @route   POST /api/interest/generate/:loanId
exports.generateInterest = async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.loanId).populate('lenders.lenderId');
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
        if (loan.lenders.length === 0) {
            return res.status(400).json({ success: false, message: 'No lenders assigned to this loan' });
        }

        // Determine start date: use provided or find last record's end date
        let startDate = req.body.startDate ? new Date(req.body.startDate) : null;

        if (!startDate) {
            // Find the latest interest record for this loan
            const lastRecord = await InterestRecord.findOne({ loanId: loan._id }).sort({ endDate: -1 });
            startDate = lastRecord ? lastRecord.endDate : loan.disbursementDate;
        }

        const { records, endDate } = generateInterestRecordsForLoan(loan, startDate);

        // Check for duplicate (same loan + lender + startDate)
        const inserted = [];
        for (const record of records) {
            const existing = await InterestRecord.findOne({
                loanId: record.loanId,
                lenderId: record.lenderId,
                startDate: record.startDate,
            });
            if (!existing) {
                const created = await InterestRecord.create(record);
                inserted.push(created);
            }
        }

        res.status(201).json({
            success: true,
            message: `Generated ${inserted.length} interest records (period: ${dayjs(startDate).format('DD/MM/YYYY')} - ${dayjs(endDate).format('DD/MM/YYYY')})`,
            data: inserted,
        });
    } catch (error) {
        console.error('Generate interest error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get pending interest records
// @route   GET /api/interest/pending
exports.getPendingInterest = async (req, res) => {
    try {
        const records = await InterestRecord.find({ status: 'pending' })
            .populate('loanId', 'loanId totalLoanAmount borrowerId')
            .populate('lenderId', 'name surname')
            .sort({ endDate: 1 });
        res.json({ success: true, count: records.length, data: records });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all interest records for a loan
// @route   GET /api/interest/loan/:loanId
exports.getInterestByLoan = async (req, res) => {
    try {
        const records = await InterestRecord.find({ loanId: req.params.loanId })
            .populate('lenderId', 'name surname')
            .sort({ startDate: 1 });
        res.json({ success: true, count: records.length, data: records });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Record interest payment received
// @route   POST /api/interest/receive
exports.receiveInterestPayment = async (req, res) => {
    try {
        const { interestRecordId, amountPaid, paymentDate, notes } = req.body;

        const interestRecord = await InterestRecord.findById(interestRecordId);
        if (!interestRecord) {
            return res.status(404).json({ success: false, message: 'Interest record not found' });
        }

        // Create payment record
        const payment = await InterestPayment.create({
            loanId: interestRecord.loanId,
            lenderId: interestRecord.lenderId,
            interestRecordId,
            amountPaid: amountPaid || interestRecord.interestAmount,
            paymentDate: paymentDate || new Date(),
            notes: notes || '',
        });

        // Mark interest record as paid
        interestRecord.status = 'paid';
        await interestRecord.save();

        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all interest payments for a loan
// @route   GET /api/interest/payments/:loanId
exports.getPaymentsByLoan = async (req, res) => {
    try {
        const payments = await InterestPayment.find({ loanId: req.params.loanId })
            .populate('lenderId', 'name surname')
            .populate('interestRecordId')
            .sort({ paymentDate: -1 });
        res.json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
