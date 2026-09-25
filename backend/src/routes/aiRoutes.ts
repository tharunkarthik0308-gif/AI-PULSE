import { Router } from 'express';
import { getHealthAnalysis } from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/analysis', authenticate, getHealthAnalysis);

export default router;
