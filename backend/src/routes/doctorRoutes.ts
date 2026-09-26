import { Router } from 'express';
import {
  getDoctorDashboardData,
  getDoctorPatients,
  removePatientFromActiveCare,
  listDoctors,
  getDoctorById,
  setDoctorAvailability,
} from '../controllers/doctorController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticate, getDoctorDashboardData);
router.get('/patients', authenticate, getDoctorPatients);
router.get('/', listDoctors);
router.get('/:id', getDoctorById);
router.post('/availability', authenticate, setDoctorAvailability);
router.delete('/patients/:patientId/active-care', authenticate, removePatientFromActiveCare);

export default router;
