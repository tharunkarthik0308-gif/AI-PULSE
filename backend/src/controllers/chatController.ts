import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getMyChatRooms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const whereClause: any = {};
    if (req.user.role === 'PATIENT' && req.user.patientProfileId) {
      whereClause.patientId = req.user.patientProfileId;
    } else if (req.user.role === 'DOCTOR' && req.user.doctorProfileId) {
      whereClause.doctorId = req.user.doctorProfileId;
    } else {
      res.status(403).json({ success: false, message: 'Profile not found.' });
      return;
    }

    const rooms = await prisma.chatRoom.findMany({
      where: whereClause,
      include: {
        patient: { include: { user: { select: { id: true, name: true, email: true } } } },
        doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, rooms });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving chat rooms.', error: error.message });
  }
};

export const getRoomMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!room) {
      res.status(404).json({ success: false, message: 'Chat room not found.' });
      return;
    }

    // Permission check
    const isPatient = req.user?.role === 'PATIENT' && req.user.patientProfileId === room.patientId;
    const isDoctor = req.user?.role === 'DOCTOR' && req.user.doctorProfileId === room.doctorId;

    if (!isPatient && !isDoctor) {
      res.status(403).json({ success: false, message: 'Access denied to this chat room.' });
      return;
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatRoomId: roomId },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark messages sent by the other party as read
    await prisma.chatMessage.updateMany({
      where: {
        chatRoomId: roomId,
        senderId: { not: req.user!.userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ success: true, room, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error fetching chat messages.', error: error.message });
  }
};
