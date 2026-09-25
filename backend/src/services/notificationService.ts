import prisma from '../config/db.js';
import { getIO } from './socketService.js';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  metadata?: any;
}

export const createNotification = async (params: CreateNotificationParams) => {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });

  // Broadcast real-time to the target user via Socket.io room
  try {
    const io = getIO();
    if (io) {
      io.to(`user:${params.userId}`).emit('notification', notification);
    }
  } catch (error) {
    // Socket might not be initialized during certain background tasks
  }

  return notification;
};
