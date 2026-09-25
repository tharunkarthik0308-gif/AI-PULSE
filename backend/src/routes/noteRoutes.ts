import { Router } from 'express';
import { createDoctorNote, getDoctorNotesForPatient } from '../controllers/noteController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Only DOCTOR role can access these routes
router.post('/', authenticate, requireRole('DOCTOR'), createDoctorNote);
router.get('/patient/:patientId', authenticate, requireRole('DOCTOR'), getDoctorNotesForPatient);

export default router;
