import { Router } from 'express';
import { param, query } from 'express-validator';
import interestController from '../controllers/interestController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import handleValidationErrors from '../middleware/validationMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get(
  '/:id/details',
  [param('id').isMongoId().withMessage('Invalid interest record ID')],
  handleValidationErrors,
  interestController.getInterestRecordDetails
);

router.get(
  '/:id/csv',
  [
    param('id').isMongoId().withMessage('Invalid interest record ID'),
    query('lenderId').optional().isMongoId().withMessage('Invalid lender ID'),
  ],
  handleValidationErrors,
  interestController.downloadInterestRecordCsv
);

export default router;
