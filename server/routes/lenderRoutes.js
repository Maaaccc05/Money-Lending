import { Router } from 'express';
import { body, param } from 'express-validator';
import lenderController from '../controllers/lenderController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import handleValidationErrors from '../middleware/validationMiddleware.js';

const router = Router();

// Protect all routes with authentication
router.use(authMiddleware);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('surname').optional({ checkFalsy: true }).trim(),
    body('familyGroup').optional({ checkFalsy: true }).trim(),
    body('dob').optional({ checkFalsy: true }).isISO8601().withMessage('Valid date of birth required if provided'),
    body('address').optional({ checkFalsy: true }).trim(),
    body('panNumber')
      .optional({ checkFalsy: true })
      .trim()
      .toUpperCase()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
      .withMessage('PAN must be in format: ABCDE1234F'),
    body('aadhaarNumber')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[0-9]{12}$/)
      .withMessage('Aadhaar must be exactly 12 digits'),
    body('bankAccountNumber').optional({ checkFalsy: true }).trim(),
    body('ifscCode').optional({ checkFalsy: true }).trim(),
    body('bankName').optional({ checkFalsy: true }).trim(),
    body('branch').optional({ checkFalsy: true }).trim(),
  ],
  handleValidationErrors,
  lenderController.createLender
);

router.get('/', lenderController.getLenders);

router.get('/search', lenderController.searchLenders);

router.get('/family-group', lenderController.getLendersByFamilyGroup);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid lender ID')],
  handleValidationErrors,
  lenderController.getLenderById
);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid lender ID'),
    body('name').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Name cannot be empty'),
    body('surname').optional({ checkFalsy: true }).trim(),
    body('familyGroup').optional({ checkFalsy: true }).trim(),
    body('dob').optional({ checkFalsy: true }).isISO8601().withMessage('Valid date of birth required if provided'),
    body('address').optional({ checkFalsy: true }).trim(),
    body('panNumber')
      .optional({ checkFalsy: true })
      .trim()
      .toUpperCase()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
      .withMessage('PAN must be in format: ABCDE1234F'),
    body('aadhaarNumber')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[0-9]{12}$/)
      .withMessage('Aadhaar must be exactly 12 digits'),
    body('bankAccountNumber').optional({ checkFalsy: true }).trim(),
    body('ifscCode').optional({ checkFalsy: true }).trim(),
    body('bankName').optional({ checkFalsy: true }).trim(),
    body('branch').optional({ checkFalsy: true }).trim(),
  ],
  handleValidationErrors,
  lenderController.updateLender
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid lender ID')],
  handleValidationErrors,
  lenderController.deleteLender
);

export default router;
