const express = require('express');
const router = express.Router();
const { generateInterest, getPendingInterest, receiveInterestPayment, getPaymentsByLoan, getInterestByLoan } = require('../controllers/interestController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/generate/:loanId', generateInterest);
router.get('/pending', getPendingInterest);
router.post('/receive', receiveInterestPayment);
router.get('/loan/:loanId', getInterestByLoan);
router.get('/payments/:loanId', getPaymentsByLoan);

module.exports = router;
