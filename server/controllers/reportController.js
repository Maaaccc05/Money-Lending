const Loan = require('../models/Loan');
const Borrower = require('../models/Borrower');
const Lender = require('../models/Lender');
const InterestRecord = require('../models/InterestRecord');
const dayjs = require('dayjs');

// @desc    Current loans report
// @route   GET /api/reports/current-loans
exports.getCurrentLoans = async (req, res) => {
    try {
        const loans = await Loan.find({ status: 'active' })
            .populate('borrowerId', 'name surname familyGroup')
            .populate('lenders.lenderId', 'name surname familyGroup')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: loans.length, data: loans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Loans by borrower report
// @route   GET /api/reports/loans-by-borrower
exports.getLoansByBorrower = async (req, res) => {
    try {
        const loans = await Loan.find()
            .populate('borrowerId', 'name surname familyGroup')
            .populate('lenders.lenderId', 'name surname')
            .sort({ createdAt: -1 });

        // Group by borrower
        const grouped = {};
        loans.forEach(loan => {
            if (!loan.borrowerId) return;
            const key = loan.borrowerId._id.toString();
            if (!grouped[key]) {
                grouped[key] = {
                    borrower: loan.borrowerId,
                    loans: [],
                    totalAmount: 0,
                    activeLoans: 0,
                };
            }
            grouped[key].loans.push(loan);
            grouped[key].totalAmount += loan.totalLoanAmount;
            if (loan.status === 'active') grouped[key].activeLoans += 1;
        });

        res.json({ success: true, data: Object.values(grouped) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Loans by lender report
// @route   GET /api/reports/loans-by-lender
exports.getLoansByLender = async (req, res) => {
    try {
        const loans = await Loan.find()
            .populate('borrowerId', 'name surname familyGroup')
            .populate('lenders.lenderId', 'name surname familyGroup');

        const grouped = {};
        loans.forEach(loan => {
            loan.lenders.forEach(lenderEntry => {
                if (!lenderEntry.lenderId) return;
                const key = lenderEntry.lenderId._id.toString();
                if (!grouped[key]) {
                    grouped[key] = {
                        lender: lenderEntry.lenderId,
                        contributions: [],
                        totalContributed: 0,
                    };
                }
                grouped[key].contributions.push({
                    loanId: loan.loanId,
                    loanDbId: loan._id,
                    borrower: loan.borrowerId,
                    amountContributed: lenderEntry.amountContributed,
                    lenderInterestRate: lenderEntry.lenderInterestRate,
                    status: loan.status,
                    disbursementDate: loan.disbursementDate,
                });
                grouped[key].totalContributed += lenderEntry.amountContributed;
            });
        });

        res.json({ success: true, data: Object.values(grouped) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Loans by borrower family group
// @route   GET /api/reports/family-group
exports.getFamilyGroupReport = async (req, res) => {
    try {
        const { type } = req.query; // 'borrower' or 'lender'

        if (type === 'lender') {
            const loans = await Loan.find()
                .populate('lenders.lenderId', 'name surname familyGroup');

            const grouped = {};
            loans.forEach(loan => {
                loan.lenders.forEach(lenderEntry => {
                    if (!lenderEntry.lenderId) return;
                    const group = lenderEntry.lenderId.familyGroup || 'Ungrouped';
                    if (!grouped[group]) grouped[group] = { familyGroup: group, totalContributed: 0, lenders: new Set() };
                    grouped[group].totalContributed += lenderEntry.amountContributed;
                    grouped[group].lenders.add(lenderEntry.lenderId._id.toString());
                });
            });

            const result = Object.values(grouped).map(g => ({ ...g, lenderCount: g.lenders.size, lenders: undefined }));
            return res.json({ success: true, data: result });
        }

        // Default: borrower family groups
        const loans = await Loan.find()
            .populate('borrowerId', 'name surname familyGroup');

        const grouped = {};
        loans.forEach(loan => {
            if (!loan.borrowerId) return;
            const group = loan.borrowerId.familyGroup || 'Ungrouped';
            if (!grouped[group]) grouped[group] = { familyGroup: group, totalAmount: 0, loanCount: 0, activeLoans: 0 };
            grouped[group].totalAmount += loan.totalLoanAmount;
            grouped[group].loanCount += 1;
            if (loan.status === 'active') grouped[group].activeLoans += 1;
        });

        res.json({ success: true, data: Object.values(grouped) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Pending interest report
// @route   GET /api/reports/pending-interest
exports.getPendingInterestReport = async (req, res) => {
    try {
        const records = await InterestRecord.find({ status: 'pending' })
            .populate({
                path: 'loanId',
                select: 'loanId totalLoanAmount borrowerId',
                populate: { path: 'borrowerId', select: 'name surname' },
            })
            .populate('lenderId', 'name surname')
            .sort({ endDate: 1 });

        const totalPending = records.reduce((sum, r) => sum + r.interestAmount, 0);

        res.json({ success: true, count: records.length, totalPending, data: records });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
