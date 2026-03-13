import { Router } from 'express';
import { body, param } from 'express-validator';
import loanController from '../controllers/loanController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import handleValidationErrors from '../middleware/validationMiddleware.js';

const router = Router();

// Protect all routes with authentication
router.use(authMiddleware);

router.post(
  '/',
  [
    body('borrowerId').isMongoId().withMessage('Valid borrower ID is required'),
    body('totalLoanAmount')
      .isNumeric()
      .withMessage('Valid loan amount is required')
      .toFloat(),
    body('disbursementDate').isISO8601().withMessage('Valid disbursement date is required'),
    body('interestRateAnnual')
      .isNumeric()
      .withMessage('Valid interest rate is required')
      .toFloat(),
    body('interestPeriodMonths')
      .isIn(['1', '3', '6', 1, 3, 6])
      .withMessage('Interest period must be 1, 3, or 6 months'),
    body('lenders')
      .isArray({ min: 1 })
      .withMessage('At least one lender is required'),
  ],
  handleValidationErrors,
  loanController.createLoan
);

router.get('/', loanController.getLoans);

router.get('/details/:loanId', loanController.getLoanByLoanId);

router.get('/borrower/:borrowerId', loanController.getLoansByBorrower);

router.get('/lender/:lenderId', loanController.getLoansByLender);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid loan ID')],
  handleValidationErrors,
  loanController.getLoanById
);

// PUT route to add a new lender contribution to an existing loan
router.put(
  '/:loanId/add-lender',
  [
    param('loanId').isMongoId().withMessage('Invalid loan ID'),
    body('lenderId').isMongoId().withMessage('Valid lender ID is required'),
    body('amountContributed')
      .isNumeric()
      .withMessage('Valid amount is required')
      .toFloat(),
    body('lenderInterestRate')
      .isNumeric()
      .withMessage('Valid interest rate is required')
      .toFloat(),
    body('moneyReceivedDate').isISO8601().withMessage('Valid money received date is required'),
  ],
  handleValidationErrors,
  loanController.addLenderToLoan
);

// Legacy POST add-lender (keep for backwards compat)
router.post(
  '/:id/add-lender',
  [
    param('id').isMongoId().withMessage('Invalid loan ID'),
    body('lenderId').isMongoId().withMessage('Valid lender ID is required'),
    body('amountContributed')
      .isNumeric()
      .withMessage('Valid amount is required')
      .toFloat(),
    body('lenderInterestRate')
      .isNumeric()
      .withMessage('Valid interest rate is required')
      .toFloat(),
    body('moneyReceivedDate').isISO8601().withMessage('Valid money received date is required'),
  ],
  handleValidationErrors,
  loanController.addLenderToLoan
);

router.put(
  '/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid loan ID'),
    body('status')
      .isIn(['PENDING', 'PARTIALLY_FUNDED', 'FULLY_FUNDED', 'CLOSED'])
      .withMessage('Invalid status'),
  ],
  handleValidationErrors,
  loanController.updateLoanStatus
);

export default router;
