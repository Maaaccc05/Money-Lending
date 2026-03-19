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

// Update loan details (amount, disbursement date, borrower rate, period)
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid loan ID'),
    body('totalLoanAmount').optional().isNumeric().withMessage('Valid loan amount is required').toFloat(),
    body('disbursementDate').optional().isISO8601().withMessage('Valid disbursement date is required'),
    body('interestRateAnnual').optional().isNumeric().withMessage('Valid interest rate is required').toFloat(),
    body('interestPeriodMonths')
      .optional()
      .isIn(['1', '3', '6', 1, 3, 6])
      .withMessage('Interest period must be 1, 3, or 6 months'),
  ],
  handleValidationErrors,
  loanController.updateLoan
);

// Update a lender contribution entry inside a loan
router.put(
  '/:loanId/lenders/:lenderEntryId',
  [
    param('loanId').isMongoId().withMessage('Invalid loan ID'),
    param('lenderEntryId').isMongoId().withMessage('Invalid lender contribution ID'),
    body('amountContributed').optional().isNumeric().withMessage('Valid amount is required').toFloat(),
    body('moneyReceivedDate').optional().isISO8601().withMessage('Valid money received date is required'),
  ],
  handleValidationErrors,
  loanController.updateLenderContribution
);

// Remove a lender contribution entry from a loan
router.delete(
  '/:loanId/lenders/:lenderEntryId',
  [
    param('loanId').isMongoId().withMessage('Invalid loan ID'),
    param('lenderEntryId').isMongoId().withMessage('Invalid lender contribution ID'),
  ],
  handleValidationErrors,
  loanController.removeLenderContribution
);

// Settle/close a lender contribution entry inside a loan
router.patch(
  '/:loanId/lenders/:lenderEntryId/close',
  [
    param('loanId').isMongoId().withMessage('Invalid loan ID'),
    param('lenderEntryId').isMongoId().withMessage('Invalid lender contribution ID'),
  ],
  handleValidationErrors,
  loanController.closeLenderContribution
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

// Close loan (stop interest generation)
router.patch(
  '/:id/close',
  [param('id').isMongoId().withMessage('Invalid loan ID')],
  handleValidationErrors,
  loanController.closeLoan
);

// Delete loan and related interest records
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid loan ID')],
  handleValidationErrors,
  loanController.deleteLoan
);

export default router;
