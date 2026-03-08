const Lender = require('../models/Lender');

// @desc    Create lender
// @route   POST /api/lenders
exports.createLender = async (req, res) => {
    try {
        const lender = await Lender.create(req.body);
        res.status(201).json({ success: true, data: lender });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all lenders
// @route   GET /api/lenders
exports.getLenders = async (req, res) => {
    try {
        const lenders = await Lender.find().sort({ createdAt: -1 });
        res.json({ success: true, count: lenders.length, data: lenders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Search lenders
// @route   GET /api/lenders/search
exports.searchLenders = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, data: [] });

        const regex = new RegExp(q, 'i');
        const lenders = await Lender.find({
            $or: [{ name: regex }, { surname: regex }, { familyGroup: regex }, { panNumber: regex }],
        }).limit(20);

        res.json({ success: true, data: lenders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update lender
// @route   PUT /api/lenders/:id
exports.updateLender = async (req, res) => {
    try {
        const lender = await Lender.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!lender) return res.status(404).json({ success: false, message: 'Lender not found' });
        res.json({ success: true, data: lender });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single lender
// @route   GET /api/lenders/:id
exports.getLender = async (req, res) => {
    try {
        const lender = await Lender.findById(req.params.id);
        if (!lender) return res.status(404).json({ success: false, message: 'Lender not found' });
        res.json({ success: true, data: lender });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
