import { Router } from 'express';
import {
  getDoctorDashboardData,
  getDoctorPatients,
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

export default router;
