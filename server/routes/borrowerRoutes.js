import { Router } from 'express';
import { body, param } from 'express-validator';
import borrowerController from '../controllers/borrowerController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import handleValidationErrors from '../middleware/validationMiddleware.js';

const router = Router();

// Protect all routes with authentication
router.use(authMiddleware);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('surname').trim().notEmpty().withMessage('Surname is required'),
    body('dob').isISO8601().withMessage('Valid date of birth is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('panNumber')
      .trim()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
      .withMessage('Valid PAN number is required'),
    body('aadhaarNumber')
      .trim()
      .matches(/^[0-9]{12}$/)
      .withMessage('Valid 12-digit Aadhaar number is required'),
    body('bankAccountNumber').trim().notEmpty().withMessage('Bank account number is required'),
    body('ifscCode').trim().notEmpty().withMessage('IFSC code is required'),
    body('bankName').trim().notEmpty().withMessage('Bank name is required'),
    body('branch').trim().notEmpty().withMessage('Branch is required'),
  ],
  handleValidationErrors,
  borrowerController.createBorrower
);

router.get('/', borrowerController.getBorrowers);

router.get('/search', borrowerController.searchBorrowers);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid borrower ID')],
  handleValidationErrors,
  borrowerController.getBorrowerById
);

router.put(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid borrower ID')],
  handleValidationErrors,
  borrowerController.updateBorrower
);

export default router;
