const Borrower = require('../models/Borrower');

// @desc    Create borrower
// @route   POST /api/borrowers
exports.createBorrower = async (req, res) => {
    try {
        const borrower = await Borrower.create(req.body);
        res.status(201).json({ success: true, data: borrower });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all borrowers
// @route   GET /api/borrowers
exports.getBorrowers = async (req, res) => {
    try {
        const borrowers = await Borrower.find().sort({ createdAt: -1 });
        res.json({ success: true, count: borrowers.length, data: borrowers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Search borrowers
// @route   GET /api/borrowers/search
exports.searchBorrowers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, data: [] });

        const regex = new RegExp(q, 'i');
        const borrowers = await Borrower.find({
            $or: [{ name: regex }, { surname: regex }, { familyGroup: regex }, { panNumber: regex }],
        }).limit(20);

        res.json({ success: true, data: borrowers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update borrower
// @route   PUT /api/borrowers/:id
exports.updateBorrower = async (req, res) => {
    try {
        const borrower = await Borrower.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!borrower) return res.status(404).json({ success: false, message: 'Borrower not found' });
        res.json({ success: true, data: borrower });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single borrower
// @route   GET /api/borrowers/:id
exports.getBorrower = async (req, res) => {
    try {
        const borrower = await Borrower.findById(req.params.id);
        if (!borrower) return res.status(404).json({ success: false, message: 'Borrower not found' });
        res.json({ success: true, data: borrower });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
