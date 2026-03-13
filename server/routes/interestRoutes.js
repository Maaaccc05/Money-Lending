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

router.post(
  '/record-payment',
  [
    body('interestRecordId').isMongoId().withMessage('Invalid interest record ID'),
    body('amountPaid')
      .isNumeric()
      .withMessage('Valid amount is required')
      .toFloat(),
    body('paymentDate').optional().isISO8601(),
  ],
  handleValidationErrors,
  interestController.recordInterestPayment
);

router.get('/payments', interestController.getInterestPayments);

router.get('/:loanId', interestController.getInterestRecordsByLoan);

export default router;
