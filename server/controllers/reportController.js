import Loan from '../models/Loan.js';
import Borrower from '../models/Borrower.js';
import Lender from '../models/Lender.js';
import InterestRecord from '../models/InterestRecord.js';
import InterestPayment from '../models/InterestPayment.js';
import dayjs from 'dayjs';
import mongoose from 'mongoose';

const ACTIVE_STATUSES = ['PARTIALLY_FUNDED', 'FULLY_FUNDED', 'PENDING'];
const ACTIVE_LENDER_LOAN_MATCH = {
  lenders: {
    $elemMatch: {
      status: { $ne: 'closed' },
    },
  },
};

export const getCurrentLoans = async (req, res) => {
  try {
    const loans = await Loan.find({
      status: { $in: ACTIVE_STATUSES },
      ...ACTIVE_LENDER_LOAN_MATCH,
    })
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

    const match = {};
    if (borrowerId) {
      if (!mongoose.Types.ObjectId.isValid(borrowerId)) {
        return res.status(200).json({ success: true, data: [] });
      }
      match.borrowerId = new mongoose.Types.ObjectId(borrowerId);
    }

    const report = await Loan.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'borrowers',
          localField: 'borrowerId',
          foreignField: '_id',
          as: 'borrower',
        },
      },
      { $unwind: { path: '$borrower', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$borrowerId',
          borrower: { $first: '$borrower' },
          totalLoans: { $sum: 1 },
          totalAmount: { $sum: '$totalLoanAmount' },
          loans: {
            $push: {
              _id: '$_id',
              loanId: '$loanId',
              totalLoanAmount: '$totalLoanAmount',
              interestRateAnnual: '$interestRateAnnual',
              status: '$status',
              loanStatus: '$loanStatus',
              createdAt: '$createdAt',
            },
          },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    res.status(200).json({ success: true, data: report || [] });
  } catch (error) {
    console.error('Loans by borrower report error:', error);
    res.status(500).json({ success: false, data: [], message: error.message });
  }
};

export const getLoansByLender = async (req, res) => {
  try {
    const { lenderId } = req.query;

    const match = {};
    if (lenderId) {
      if (!mongoose.Types.ObjectId.isValid(lenderId)) {
        return res.status(200).json({ success: true, data: [] });
      }
      match['lenders.lenderId'] = new mongoose.Types.ObjectId(lenderId);
    }

    const report = await Loan.aggregate([
      { $match: match },
      { $unwind: { path: '$lenders', preserveNullAndEmptyArrays: false } },
      // If lenderId is specified, limit to that lender after unwind.
      ...(lenderId
        ? [{ $match: { 'lenders.lenderId': new mongoose.Types.ObjectId(lenderId) } }]
        : []),
      {
        $lookup: {
          from: 'lenders',
          localField: 'lenders.lenderId',
          foreignField: '_id',
          as: 'lender',
        },
      },
      { $unwind: { path: '$lender', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'borrowers',
          localField: 'borrowerId',
          foreignField: '_id',
          as: 'borrower',
        },
      },
      { $unwind: { path: '$borrower', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$lenders.lenderId',
          lender: { $first: '$lender' },
          totalContributed: { $sum: { $ifNull: ['$lenders.amountContributed', 0] } },
          loansCount: { $addToSet: '$_id' },
          loans: {
            $push: {
              _id: '$_id',
              loanId: '$loanId',
              borrower: '$borrower',
              amountContributed: '$lenders.amountContributed',
              annualInterestRate: '$interestRateAnnual',
              status: '$status',
              loanStatus: '$loanStatus',
              createdAt: '$createdAt',
            },
          },
        },
      },
      {
        $addFields: {
          loansTotal: { $size: '$loansCount' },
        },
      },
      { $project: { loansCount: 0 } },
      { $sort: { totalContributed: -1 } },
    ]);

    res.status(200).json({ success: true, data: report || [] });
  } catch (error) {
    console.error('Loans by lender report error:', error);
    res.status(500).json({ success: false, data: [], message: error.message });
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
    const [
      totalLoans,
      totalBorrowers,
      totalLenders,
      activeLoans,
      loanPortfolioAgg,
      pendingInterest,
      monthlyCollection,
    ] = await Promise.all([
      Loan.countDocuments(),
      Borrower.countDocuments(),
      Lender.countDocuments(),
      Loan.countDocuments(ACTIVE_LENDER_LOAN_MATCH),
      Loan.aggregate([
        { $match: ACTIVE_LENDER_LOAN_MATCH },
        {
          $group: {
            _id: null,
            loanPortfolio: { $sum: '$totalLoanAmount' },
          },
        },
      ]),
      InterestRecord.aggregate([
        {
          $match: { status: 'pending', lenderId: { $ne: null } },
        },
        {
          $group: {
            _id: null,
            totalPending: { $sum: '$interestAmount' },
          },
        },
      ]),
      InterestPayment.aggregate([
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$paymentDate',
              },
            },
            amount: { $sum: { $ifNull: ['$amountReceived', '$amountPaid'] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.status(200).json({
      stats: {
        totalLoans,
        totalBorrowers,
        totalLenders,
        activeLoans,
        loanPortfolio: loanPortfolioAgg[0]?.loanPortfolio ?? 0,
        totalLoanAmount: loanPortfolioAgg[0]?.loanPortfolio ?? 0,
        pendingInterest: pendingInterest[0]?.totalPending || 0,
      },
      monthlyCollection,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

// New required endpoint: GET /reports/dashboard
export const getDashboard = async (req, res) => getDashboardStats(req, res);

// New required endpoint: GET /reports/interest-summary
export const getInterestSummary = async (req, res) => {
  try {
    const lenderOnlyMatch = { lenderId: { $ne: null } };

    const [byStatus, totals, loanCounts] = await Promise.all([
      InterestRecord.aggregate([
        { $match: lenderOnlyMatch },
        {
          $group: {
            _id: '$status',
            totalInterestGenerated: { $sum: '$interestAmount' },
            totalReceived: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'paid'] },
                  { $ifNull: ['$amountReceived', '$interestAmount'] },
                  0,
                ],
              },
            },
            totalTds: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'paid'] },
                  { $ifNull: ['$tdsAmount', 0] },
                  0,
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      InterestRecord.aggregate([
        { $match: lenderOnlyMatch },
        {
          $group: {
            _id: null,
            totalInterestGenerated: { $sum: '$interestAmount' },
            totalPaidInterest: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, '$interestAmount', 0],
              },
            },
            totalPendingInterest: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, '$interestAmount', 0],
              },
            },
            totalReceived: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'paid'] },
                  { $ifNull: ['$amountReceived', '$interestAmount'] },
                  0,
                ],
              },
            },
            totalTds: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'paid'] },
                  { $ifNull: ['$tdsAmount', 0] },
                  0,
                ],
              },
            },
          },
        },
      ]),
      Loan.aggregate([
        {
          $group: {
            _id: null,
            activeLoans: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ['$status', ACTIVE_STATUSES] },
                      { $ne: ['$loanStatus', 'CLOSED'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            closedLoans: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ['$status', 'CLOSED'] }, { $eq: ['$loanStatus', 'CLOSED'] }] },
                  1,
                  0,
                ],
              },
            },
            totalLoans: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.status(200).json({
      totals: totals?.[0] || {
        totalInterestGenerated: 0,
        totalPaidInterest: 0,
        totalPendingInterest: 0,
        totalReceived: 0,
        totalTds: 0,
      },
      byStatus,
      loans: loanCounts?.[0] || { totalLoans: 0, activeLoans: 0, closedLoans: 0 },
    });
  } catch (error) {
    console.error('Interest summary error:', error);
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
  getDashboard,
  getInterestSummary,
};
