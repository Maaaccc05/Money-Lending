import Loan from '../models/Loan.js';
import Borrower from '../models/Borrower.js';
import Lender from '../models/Lender.js';
import InterestRecord from '../models/InterestRecord.js';
import { calculateSimpleInterestDaily } from '../services/interestCalculator.js';
import { generateDueInterestForLoan } from '../services/interestAutoGenerator.js';

const fullName = (person) => {
  if (!person) return '';
  const parts = [person.name, person.surname].filter(Boolean);
  return parts.join(' ').trim();
};

const toInterestView = ({ record, loan }) => {
  const startDate = record.periodStart || record.startDate;
  const endDate = record.periodEnd || record.endDate;
  const days = record.days ?? record.daysCount;

  const borrowerInterestCalc = calculateSimpleInterestDaily({
    principal: loan.totalLoanAmount,
    annualRatePct: loan.interestRateAnnual,
    periodStart: startDate,
    periodEnd: endDate,
  });

  const isBorrowerRecord = !record.lenderId;
  const lenderInterest = isBorrowerRecord ? 0 : record.interestAmount;
  const borrowerInterest = isBorrowerRecord ? record.interestAmount : borrowerInterestCalc.interestAmount;

  return {
    _id: record._id,
    loanId: loan.loanId,
    borrowerName: fullName(loan.borrowerId),
    lenderName: isBorrowerRecord ? '' : fullName(record.lenderId),
    principal: record.principal ?? record.principalAmount,
    borrowerInterest,
    lenderInterest,
    rate: isBorrowerRecord ? loan.interestRateAnnual : (record.lenderRate ?? record.interestRate),
    days,
    startDate,
    endDate,
    status: record.status,
    // backward compat
    interestAmount: record.interestAmount,
  };
};

// Helper: compute status from funded vs total
const computeFundingStatus = (funded, total) => {
  if (funded <= 0) return 'PENDING';
  if (funded >= total) return 'FULLY_FUNDED';
  return 'PARTIALLY_FUNDED';
};

export const createLoan = async (req, res) => {
  try {
    const {
      borrowerId,
      totalLoanAmount,
      disbursementDate,
      interestRateAnnual,
      interestPeriodMonths,
      lenders,
    } = req.body;

    // Validate borrower exists
    const borrower = await Borrower.findById(borrowerId);
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }

    if (!lenders || lenders.length === 0) {
      return res.status(400).json({ message: 'At least one lender is required' });
    }

    // Validate lenders exist
    let fundedAmount = 0;
    const validatedLenders = [];

    for (const lenderData of lenders) {
      const lender = await Lender.findById(lenderData.lenderId);
      if (!lender) {
        return res.status(404).json({ message: `Lender with ID ${lenderData.lenderId} not found` });
      }
      if (!lenderData.amountContributed || lenderData.amountContributed <= 0) {
        return res.status(400).json({ message: 'Each lender must have an amount greater than 0' });
      }

      fundedAmount += parseFloat(lenderData.amountContributed);
      validatedLenders.push({
        lenderId: lenderData.lenderId,
        amountContributed: parseFloat(lenderData.amountContributed),
        lenderInterestRate: parseFloat(lenderData.lenderInterestRate),
        moneyReceivedDate: lenderData.moneyReceivedDate,
        interestStartDate: lenderData.moneyReceivedDate, // always equal moneyReceivedDate
      });
    }

    const remainingAmount = Math.max(0, parseFloat(totalLoanAmount) - fundedAmount);
    const status = computeFundingStatus(fundedAmount, parseFloat(totalLoanAmount));

    const loan = new Loan({
      borrowerId,
      totalLoanAmount: parseFloat(totalLoanAmount),
      fundedAmount,
      remainingAmount,
      disbursementDate,
      interestRateAnnual: parseFloat(interestRateAnnual),
      interestPeriodMonths: parseInt(interestPeriodMonths),
      status,
      lenders: validatedLenders,
    });

    await loan.save();

    // Catch-up generation for loans created with past disbursement dates.
    // Fire-and-forget so loan creation stays responsive.
    generateDueInterestForLoan({ loan: loan.toObject(), asOf: new Date() })
      .catch((err) => console.error('[createLoan] auto interest generation failed:', err));

    res.status(201).json({
      message: 'Loan created successfully',
      loan: await loan.populate('borrowerId lenders.lenderId'),
    });
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const addLenderToLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { lenderId, amountContributed, lenderInterestRate, moneyReceivedDate } = req.body;

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.status === 'CLOSED') {
      return res.status(400).json({ message: 'Cannot add lender to a closed loan' });
    }

    const lender = await Lender.findById(lenderId);
    if (!lender) {
      return res.status(404).json({ message: 'Lender not found' });
    }

    // Allow same lender to contribute multiple times (different dates/amounts)
    loan.lenders.push({
      lenderId,
      amountContributed: parseFloat(amountContributed),
      lenderInterestRate: parseFloat(lenderInterestRate),
      moneyReceivedDate,
      interestStartDate: moneyReceivedDate, // always equal moneyReceivedDate
    });

    // Recalculate funded/remaining
    loan.fundedAmount = loan.lenders.reduce((sum, l) => sum + l.amountContributed, 0);
    loan.remainingAmount = Math.max(0, loan.totalLoanAmount - loan.fundedAmount);
    loan.status = computeFundingStatus(loan.fundedAmount, loan.totalLoanAmount);

    await loan.save();

    res.status(200).json({
      message: 'Lender added to loan successfully',
      loan: await loan.populate('borrowerId lenders.lenderId'),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLoans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || null;

    let query = {};
    if (status) {
      query.status = status;
    }

    const loans = await Loan.find(query)
      .populate('borrowerId', 'name surname')
      .populate('lenders.lenderId', 'name surname familyGroup')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Loan.countDocuments(query);

    res.status(200).json({
      loans,
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

export const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('borrowerId')
      .populate('lenders.lenderId');

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    res.status(200).json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLoanByLoanId = async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = await Loan.findOne({ loanId })
      .populate({
        path: 'borrowerId',
        select: '-aadhaarNumber',
      })
      .populate({
        path: 'lenders.lenderId',
        select: 'name surname familyGroup bankName bankAccountNumber ifscCode branch address',
      });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Fetch associated interest records
    const interestRecords = await InterestRecord.find({ loanId: loan._id })
      .populate('lenderId', 'name surname familyGroup')
      .sort({ periodStart: 1, startDate: 1 });

    res.status(200).json({
      loan,
      interestRecords: interestRecords.map((r) => toInterestView({ record: r, loan })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLoansByBorrower = async (req, res) => {
  try {
    const { borrowerId } = req.params;

    const loans = await Loan.find({ borrowerId })
      .populate('borrowerId', 'name surname')
      .populate('lenders.lenderId', 'name surname familyGroup')
      .sort({ createdAt: -1 });

    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLoansByLender = async (req, res) => {
  try {
    const { lenderId } = req.params;

    const loans = await Loan.find({ 'lenders.lenderId': lenderId })
      .populate('borrowerId', 'name surname')
      .populate('lenders.lenderId', 'name surname familyGroup')
      .sort({ createdAt: -1 });

    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLoanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'PARTIALLY_FUNDED', 'FULLY_FUNDED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const loan = await Loan.findByIdAndUpdate(id, { status }, { new: true })
      .populate('borrowerId')
      .populate('lenders.lenderId');

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    res.status(200).json({
      message: 'Loan status updated successfully',
      loan,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  createLoan,
  addLenderToLoan,
  getLoans,
  getLoanById,
  getLoanByLoanId,
  getLoansByBorrower,
  getLoansByLender,
  updateLoanStatus,
};
