import InterestRecord from '../models/InterestRecord.js';
import InterestPayment from '../models/InterestPayment.js';
import Loan from '../models/Loan.js';
import { generateInterestRecords, calculateInterest } from '../services/interestCalculator.js';
import dayjs from 'dayjs';

export const generateInterest = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { startDate } = req.body;

    const loan = await Loan.findById(loanId).populate('lenders.lenderId');
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const records = generateInterestRecords(loan, startDate);

    // Save all interest records
    const savedRecords = await InterestRecord.insertMany(records);

    res.status(201).json({
      message: 'Interest generated successfully',
      records: savedRecords,
    });
  } catch (error) {
    console.error('Generate interest error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getPendingInterest = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const records = await InterestRecord.find({ status: 'pending' })
      .populate('loanId', 'loanId totalLoanAmount')
      .populate('lenderId', 'name surname familyGroup')
      .limit(limit)
      .skip(skip)
      .sort({ endDate: 1 });

    const total = await InterestRecord.countDocuments({ status: 'pending' });

    res.status(200).json({
      records,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const recordInterestPayment = async (req, res) => {
  try {
    const { interestRecordId, amountPaid, paymentDate } = req.body;

    const interestRecord = await InterestRecord.findById(interestRecordId);
    if (!interestRecord) {
      return res.status(404).json({ message: 'Interest record not found' });
    }

    if (amountPaid > interestRecord.interestAmount) {
      return res.status(400).json({
        message: `Amount paid (₹${amountPaid}) exceeds interest amount (₹${interestRecord.interestAmount})`,
      });
    }

    // Create payment record
    const payment = new InterestPayment({
      loanId: interestRecord.loanId,
      lenderId: interestRecord.lenderId,
      interestRecordId,
      amountPaid,
      paymentDate: paymentDate || new Date(),
    });

    await payment.save();

    // If full amount paid, mark interest record as paid
    if (amountPaid === interestRecord.interestAmount) {
      interestRecord.status = 'paid';
      await interestRecord.save();
    }

    res.status(201).json({
      message: 'Interest payment recorded successfully',
      payment,
    });
  } catch (error) {
    console.error('Record interest payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getInterestPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const payments = await InterestPayment.find()
      .populate('loanId', 'loanId totalLoanAmount')
      .populate('lenderId', 'name surname')
      .limit(limit)
      .skip(skip)
      .sort({ paymentDate: -1 });

    const total = await InterestPayment.countDocuments();

    res.status(200).json({
      payments,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInterestRecordsByLoan = async (req, res) => {
  try {
    const { loanId } = req.params;

    const records = await InterestRecord.find({ loanId })
      .populate('lenderId', 'name surname')
      .sort({ startDate: 1 });

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  generateInterest,
  getPendingInterest,
  recordInterestPayment,
  getInterestPayments,
  getInterestRecordsByLoan,
};
