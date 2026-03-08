const express = require('express');
const router = express.Router();
const { getCurrentLoans, getLoansByBorrower, getLoansByLender, getFamilyGroupReport, getPendingInterestReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/current-loans', getCurrentLoans);
router.get('/loans-by-borrower', getLoansByBorrower);
router.get('/loans-by-lender', getLoansByLender);
router.get('/family-group', getFamilyGroupReport);
router.get('/pending-interest', getPendingInterestReport);

module.exports = router;
