const express = require('express');
const router = express.Router();
const { createLoan, addLenderToLoan, getLoans, getLoan, getLoansByBorrower, getLoansByLender, updateLoan } = require('../controllers/loanController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getLoans).post(createLoan);
router.get('/borrower/:borrowerId', getLoansByBorrower);
router.get('/lender/:lenderId', getLoansByLender);
router.route('/:id').get(getLoan).put(updateLoan);
router.post('/:id/add-lender', addLenderToLoan);

module.exports = router;
