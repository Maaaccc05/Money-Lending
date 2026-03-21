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
    body('familyGroup').trim().notEmpty().withMessage('Family group is required'),
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

router.get('/grouped', borrowerController.getGroupedBorrowers);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid borrower ID')],
  handleValidationErrors,
  borrowerController.getBorrowerById
);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid borrower ID'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('surname').optional().trim().notEmpty().withMessage('Surname cannot be empty'),
    body('familyGroup').optional().trim().notEmpty().withMessage('Family group cannot be empty'),
    body('dob').optional().isISO8601().withMessage('Valid date of birth is required'),
    body('address').optional().trim().notEmpty().withMessage('Address cannot be empty'),
    body('panNumber')
      .optional()
      .trim()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
      .withMessage('Valid PAN number is required'),
    body('aadhaarNumber')
      .optional()
      .trim()
      .matches(/^[0-9]{12}$/)
      .withMessage('Valid 12-digit Aadhaar number is required'),
    body('bankAccountNumber').optional().trim().notEmpty().withMessage('Bank account number cannot be empty'),
    body('ifscCode').optional().trim().notEmpty().withMessage('IFSC code cannot be empty'),
    body('bankName').optional().trim().notEmpty().withMessage('Bank name cannot be empty'),
    body('branch').optional().trim().notEmpty().withMessage('Branch cannot be empty'),
  ],
  handleValidationErrors,
  borrowerController.updateBorrower
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid borrower ID')],
  handleValidationErrors,
  borrowerController.deleteBorrower
);

export default router;
