import { Router } from 'express';
import { uploadReport, getMyReports, downloadReport } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.post('/upload', authenticate, upload.single('file'), uploadReport);
router.get('/', authenticate, getMyReports);
router.get('/:id/download', authenticate, downloadReport);

export default router;
