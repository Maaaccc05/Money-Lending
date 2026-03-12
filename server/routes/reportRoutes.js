import { Router } from 'express';
import reportController from '../controllers/reportController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

// Protect all routes with authentication
router.use(authMiddleware);

router.get('/dashboard-stats', reportController.getDashboardStats);

router.get('/current-loans', reportController.getCurrentLoans);

router.get('/loans-by-borrower', reportController.getLoansByBorrower);

router.get('/loans-by-lender', reportController.getLoansByLender);

router.get('/loans-by-family-group', reportController.getLoansByFamilyGroup);

router.get('/pending-interest', reportController.getPendingInterestReport);

export default router;
