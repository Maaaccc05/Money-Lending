import { Router } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/authController.js';
import handleValidationErrors from '../middleware/validationMiddleware.js';

const router = Router();

router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidationErrors,
  authController.login
);

router.post('/initialize', authController.initializeAdmin);

export default router;
