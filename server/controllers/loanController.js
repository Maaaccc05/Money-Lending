import Loan from '../models/Loan.js';
import Borrower from '../models/Borrower.js';
import Lender from '../models/Lender.js';
import InterestRecord from '../models/InterestRecord.js';

export const createLoan = async (req, res) => {
  try {
    const { borrowerId, totalLoanAmount, disbursementDate, interestRateAnnual, interestPeriodMonths, lenders } = req.body;

    // Validate borrower exists
    const borrower = await Borrower.findById(borrowerId);
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }

    // Validate lenders exist and calculate total
    let totalContributed = 0;
    const validatedLenders = [];

    for (const lenderData of lenders) {
      const lender = await Lender.findById(lenderData.lenderId);
      if (!lender) {
        return res.status(404).json({ message: `Lender with ID ${lenderData.lenderId} not found` });
      }

      totalContributed += lenderData.amountContributed;
      validatedLenders.push({
        lenderId: lenderData.lenderId,
        amountContributed: lenderData.amountContributed,
        lenderInterestRate: lenderData.lenderInterestRate,
        moneyReceivedDate: lenderData.moneyReceivedDate,
      });
    }

    // Verify total contributed matches loan amount
    if (totalContributed !== totalLoanAmount) {
      return res.status(400).json({
        message: `Total contributed amount (₹${totalContributed}) does not match loan amount (₹${totalLoanAmount})`,
      });
    }

    const loan = new Loan({
      borrowerId,
      totalLoanAmount,
      disbursementDate,
      interestRateAnnual,
      interestPeriodMonths,
      lenders: validatedLenders,
    });

    await loan.save();

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

    const lender = await Lender.findById(lenderId);
    if (!lender) {
      return res.status(404).json({ message: 'Lender not found' });
    }

    // Check if lender already exists in loan
    if (loan.lenders.some((l) => l.lenderId.toString() === lenderId)) {
      return res.status(400).json({ message: 'Lender already added to this loan' });
    }

    loan.lenders.push({
      lenderId,
      amountContributed,
      lenderInterestRate,
      moneyReceivedDate,
    });

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
        select: '-aadhaarNumber', // expose everything except aadhaar
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
      .sort({ startDate: 1 });

    res.status(200).json({ loan, interestRecords });
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

    if (!['active', 'closed'].includes(status)) {
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
