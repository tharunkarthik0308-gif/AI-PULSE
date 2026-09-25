import { Router } from 'express';
import { evaluateTriage, getMyTriageHistory } from '../controllers/triageController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/evaluate', authenticate, evaluateTriage);
router.get('/history', authenticate, getMyTriageHistory);

export default router;
