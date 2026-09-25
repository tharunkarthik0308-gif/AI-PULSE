import { Router } from 'express';
import { getMyChatRooms, getRoomMessages } from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/rooms', authenticate, getMyChatRooms);
router.get('/rooms/:roomId/messages', authenticate, getRoomMessages);

export default router;
