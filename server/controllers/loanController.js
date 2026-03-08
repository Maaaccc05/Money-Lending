const Loan = require('../models/Loan');

// @desc    Create loan
// @route   POST /api/loans
exports.createLoan = async (req, res) => {
    try {
        const loan = await Loan.create(req.body);
        await loan.populate('borrowerId lenders.lenderId');
        res.status(201).json({ success: true, data: loan });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add lender to existing loan
// @route   POST /api/loans/:id/add-lender
exports.addLenderToLoan = async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id);
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
        if (loan.status !== 'active') {
            return res.status(400).json({ success: false, message: 'Cannot add lender to non-active loan' });
        }

        loan.lenders.push(req.body);
        loan.totalLoanAmount = loan.lenders.reduce((sum, l) => sum + l.amountContributed, 0);
        await loan.save();
        await loan.populate('borrowerId lenders.lenderId');

        res.json({ success: true, data: loan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all loans
// @route   GET /api/loans
exports.getLoans = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = status ? { status } : {};
        const loans = await Loan.find(filter)
            .populate('borrowerId', 'name surname familyGroup')
            .populate('lenders.lenderId', 'name surname familyGroup')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: loans.length, data: loans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single loan
// @route   GET /api/loans/:id
exports.getLoan = async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id)
            .populate('borrowerId')
            .populate('lenders.lenderId');
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
        res.json({ success: true, data: loan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get loans by borrower
// @route   GET /api/loans/borrower/:borrowerId
exports.getLoansByBorrower = async (req, res) => {
    try {
        const loans = await Loan.find({ borrowerId: req.params.borrowerId })
            .populate('borrowerId', 'name surname')
            .populate('lenders.lenderId', 'name surname')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: loans.length, data: loans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get loans by lender
// @route   GET /api/loans/lender/:lenderId
exports.getLoansByLender = async (req, res) => {
    try {
        const loans = await Loan.find({ 'lenders.lenderId': req.params.lenderId })
            .populate('borrowerId', 'name surname')
            .populate('lenders.lenderId', 'name surname')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: loans.length, data: loans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update loan status
// @route   PUT /api/loans/:id
exports.updateLoan = async (req, res) => {
    try {
        const loan = await Loan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('borrowerId')
            .populate('lenders.lenderId');
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
        res.json({ success: true, data: loan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
