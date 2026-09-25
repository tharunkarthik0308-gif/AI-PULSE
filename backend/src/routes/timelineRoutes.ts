import { Router } from 'express';
import { getHealthTimeline } from '../controllers/timelineController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getHealthTimeline);

export default router;
