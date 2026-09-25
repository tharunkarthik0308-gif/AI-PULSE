import { Router } from 'express';
import { getMedications, createMedication, logDose } from '../controllers/medicationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getMedications);
router.post('/', authenticate, createMedication);
router.post('/log', authenticate, logDose);

export default router;
