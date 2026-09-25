import { Router } from 'express';
import {
  createAppointment,
  getMyAppointments,
  updateAppointmentStatus,
  getAppointmentRoom,
  startConsultation,
  endConsultation,
  getConsultationSession,
} from '../controllers/appointmentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, createAppointment);
router.get('/', authenticate, getMyAppointments);
router.patch('/:id/status', authenticate, updateAppointmentStatus);
router.get('/:id/room', authenticate, getAppointmentRoom);
router.post('/:id/consultation/start', authenticate, startConsultation);
router.post('/:id/consultation/end', authenticate, endConsultation);
router.get('/:id/consultation', authenticate, getConsultationSession);

export default router;
