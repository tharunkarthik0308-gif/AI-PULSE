import { Router } from 'express';
import authRoutes from './authRoutes.js';
import patientRoutes from './patientRoutes.js';
import doctorRoutes from './doctorRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import scanRoutes from './scanRoutes.js';
import reportRoutes from './reportRoutes.js';
import noteRoutes from './noteRoutes.js';
import prescriptionRoutes from './prescriptionRoutes.js';
import medicationRoutes from './medicationRoutes.js';
import timelineRoutes from './timelineRoutes.js';
import triageRoutes from './triageRoutes.js';
import aiRoutes from './aiRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import chatRoutes from './chatRoutes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/patients', patientRoutes);
apiRouter.use('/doctors', doctorRoutes);
apiRouter.use('/appointments', appointmentRoutes);
apiRouter.use('/scans', scanRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/notes', noteRoutes);
apiRouter.use('/prescriptions', prescriptionRoutes);
apiRouter.use('/medications', medicationRoutes);
apiRouter.use('/timeline', timelineRoutes);
apiRouter.use('/triage', triageRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/chat', chatRoutes);

export default apiRouter;
