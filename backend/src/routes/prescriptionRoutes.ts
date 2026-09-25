import { Router } from 'express';
import {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
} from '../controllers/prescriptionController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, requireRole('DOCTOR'), createPrescription);
router.get('/', authenticate, getPrescriptions);
router.get('/:id', authenticate, getPrescriptionById);

export default router;
