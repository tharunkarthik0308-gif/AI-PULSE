import { Router } from 'express';
import { getMyDashboardData, getPatientById } from '../controllers/patientController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticate, getMyDashboardData);
router.get('/:patientId', authenticate, getPatientById);

export default router;
