import { Router } from 'express';
import { saveScan, getMyScans, getScanById } from '../controllers/scanController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, saveScan);
router.get('/', authenticate, getMyScans);
router.get('/:id', authenticate, getScanById);

export default router;
