const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// In-memory admin (no DB needed for single admin)
let adminHash = null;

const initAdmin = async () => {
    const plainPassword = process.env.ADMIN_PASSWORD || 'Control@123';
    adminHash = await bcrypt.hash(plainPassword, 12);
};

initAdmin();

// @desc    Login admin
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Please provide username and password' });
        }

        const expectedUsername = process.env.ADMIN_USERNAME || 'control';
        if (username.toLowerCase() !== expectedUsername.toLowerCase()) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!adminHash) await initAdmin();
        const isMatch = await bcrypt.compare(password, adminHash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: 'admin', role: 'control', username: expectedUsername },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        res.json({
            success: true,
            token,
            user: { username: expectedUsername, role: 'control' },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = (req, res) => {
    res.json({ success: true, user: req.user });
};
