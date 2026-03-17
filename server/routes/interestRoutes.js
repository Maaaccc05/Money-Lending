import { Router } from 'express';
import { body, param } from 'express-validator';
import interestController from '../controllers/interestController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import handleValidationErrors from '../middleware/validationMiddleware.js';

const router = Router();

// Protect all routes with authentication
router.use(authMiddleware);

router.post(
  '/generate/:loanId',
  [
    param('loanId').isMongoId().withMessage('Invalid loan ID'),
    body('endDate').optional().isISO8601().withMessage('Valid end date is required (ISO8601)'),
    body('startDate').optional().isISO8601().withMessage('Valid start date is required (ISO8601)'),
  ],
  handleValidationErrors,
  interestController.generateInterest
);

router.get('/pending', interestController.getPendingInterest);

// Paginated list of interest records
router.get('/', interestController.getAllInterestRecords);

router.post(
  '/record-payment',
  [
    body('interestRecordId').isMongoId().withMessage('Invalid interest record ID'),
    // Preferred: amountReceived. Backward compatible: amountPaid.
    body('amountReceived').optional().isNumeric().withMessage('Valid amountReceived is required').toFloat(),
    body('amountPaid').optional().isNumeric().withMessage('Valid amountPaid is required').toFloat(),
    body('paymentDate').optional().isISO8601(),
  ],
  handleValidationErrors,
  interestController.recordInterestPayment
);

// Fetch/generate receipt for a specific interest record
router.get(
  '/receipt/:id',
  [param('id').isMongoId().withMessage('Invalid interest record ID')],
  handleValidationErrors,
  interestController.getInterestReceipt
);

router.get('/payments', interestController.getInterestPayments);

router.get('/:loanId', interestController.getInterestRecordsByLoan);

export default router;
