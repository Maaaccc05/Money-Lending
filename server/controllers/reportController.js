import Loan from '../models/Loan.js';
import InterestRecord from '../models/InterestRecord.js';
import InterestPayment from '../models/InterestPayment.js';
import dayjs from 'dayjs';

export const getCurrentLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ status: { $in: ['PARTIALLY_FUNDED', 'FULLY_FUNDED', 'PENDING'] } })
      .populate('borrowerId', 'name surname')
      .populate('lenders.lenderId', 'name surname familyGroup')
      .sort({ createdAt: -1 });

    const loansWithInterest = await Promise.all(
      loans.map(async (loan) => {
        const pendingInterest = await InterestRecord.aggregate([
          {
            $match: {
              loanId: loan._id,
              status: 'pending',
              lenderId: { $ne: null },
            },
          },
          {
            $group: {
              _id: null,
              totalPending: { $sum: '$interestAmount' },
            },
          },
        ]);

        return {
          ...loan.toObject(),
          totalPendingInterest: pendingInterest[0]?.totalPending || 0,
        };
      })
    );

    res.status(200).json(loansWithInterest);
  } catch (error) {
    console.error('Get current loans error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getLoansByBorrower = async (req, res) => {
  try {
    const { borrowerId } = req.query;

    let query = {};
    if (borrowerId) {
      query.borrowerId = borrowerId;
    }

    const report = await Loan.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$borrowerId',
          totalLoans: { $sum: 1 },
          totalAmount: { $sum: '$totalLoanAmount' },
          loans: { $push: '$$ROOT' },
        },
      },
      {
        $lookup: {
          from: 'borrowers',
          localField: '_id',
          foreignField: '_id',
          as: 'borrowerDetails',
        },
      },
    ]);

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLoansByLender = async (req, res) => {
  try {
    const { lenderId } = req.query;

    const loans = await Loan.find({ 'lenders.lenderId': lenderId })
      .populate('borrowerId', 'name surname')
      .populate('lenders.lenderId', 'name surname familyGroup');

    const report = loans.map((loan) => {
      const lenderData = loan.lenders.find((l) => l.lenderId._id.toString() === lenderId);
      return {
        loanId: loan.loanId,
        borrower: loan.borrowerId,
        amountContributed: lenderData?.amountContributed,
        interestRate: lenderData?.lenderInterestRate,
        status: loan.status,
      };
    });

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLoansByFamilyGroup = async (req, res) => {
  try {
    const { familyGroup } = req.query;

    if (!familyGroup) {
      return res.status(400).json({ message: 'Family group is required' });
    }

    const loans = await Loan.aggregate([
      {
        $lookup: {
          from: 'lenders',
          localField: 'lenders.lenderId',
          foreignField: '_id',
          as: 'lenderDetails',
        },
      },
      {
        $match: {
          'lenderDetails.familyGroup': new RegExp(familyGroup, 'i'),
        },
      },
    ]);

    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingInterestReport = async (req, res) => {
  try {
    const report = await InterestRecord.aggregate([
      {
        $match: { status: 'pending', lenderId: { $ne: null } },
      },
      {
        $group: {
          _id: '$lenderId',
          totalPending: { $sum: '$interestAmount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'lenders',
          localField: '_id',
          foreignField: '_id',
          as: 'lenderDetails',
        },
      },
    ]);

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const totalBorrowers = await Loan.distinct('borrowerId');
    const totalLenders = await Loan.distinct('lenders.lenderId');
    const activeLoans = await Loan.countDocuments({ status: { $in: ['PARTIALLY_FUNDED', 'FULLY_FUNDED', 'PENDING'] } });
    const closedLoans = await Loan.countDocuments({ status: 'CLOSED' });

    const loanAmounts = await Loan.aggregate([
      {
        $group: {
          _id: null,
          totalLoanAmount: { $sum: '$totalLoanAmount' },
        },
      },
    ]);

    const pendingInterest = await InterestRecord.aggregate([
      {
        $match: { status: 'pending', lenderId: { $ne: null } },
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$interestAmount' },
        },
      },
    ]);

    const collectedInterest = await InterestPayment.aggregate([
      {
        $group: {
          _id: null,
          totalCollected: { $sum: '$amountPaid' },
        },
      },
    ]);

    const monthlyCollection = await InterestPayment.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$paymentDate',
            },
          },
          amount: { $sum: '$amountPaid' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      stats: {
        totalBorrowers: totalBorrowers.length,
        totalLenders: totalLenders.length,
        activeLoans,
        closedLoans,
        totalLoanAmount: loanAmounts[0]?.totalLoanAmount || 0,
        pendingInterest: pendingInterest[0]?.totalPending || 0,
        collectedInterest: collectedInterest[0]?.totalCollected || 0,
      },
      monthlyCollection,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

export default {
  getCurrentLoans,
  getLoansByBorrower,
  getLoansByLender,
  getLoansByFamilyGroup,
  getPendingInterestReport,
  getDashboardStats,
};
