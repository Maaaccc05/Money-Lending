const express = require('express');
const router = express.Router();
const { createBorrower, getBorrowers, searchBorrowers, updateBorrower, getBorrower } = require('../controllers/borrowerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/search', searchBorrowers);
router.route('/').get(getBorrowers).post(createBorrower);
router.route('/:id').get(getBorrower).put(updateBorrower);

module.exports = router;
