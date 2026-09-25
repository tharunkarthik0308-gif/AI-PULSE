import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/auth.js';
import prisma from '../config/db.js';

let ioInstance: SocketIOServer | null = null;

export const initSocket = (server: HttpServer, frontendUrl: string): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication error: Token required for socket connection'));
    }

    try {
      const payload = verifyToken(token);
      (socket as any).user = payload;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid socket token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    if (!user) return;

    // Join personal user room
    socket.join(`user:${user.userId}`);

    // If doctor, join doctor channel
    if (user.role === 'DOCTOR' && user.doctorProfileId) {
      socket.join(`doctor:${user.doctorProfileId}`);
    }

    // Join specific chat room
    socket.on('join_chat_room', (chatRoomId: string) => {
      socket.join(`chat:${chatRoomId}`);
    });

    socket.on('leave_chat_room', (chatRoomId: string) => {
      socket.leave(`chat:${chatRoomId}`);
    });

    // Send chat message
    socket.on('send_message', async (data: { chatRoomId: string; message: string }) => {
      try {
        const { chatRoomId, message } = data;
        if (!chatRoomId || !message || message.trim() === '') return;

        // Verify membership
        const room = await prisma.chatRoom.findUnique({
          where: { id: chatRoomId },
          include: { patient: true, doctor: true },
        });

        if (!room) return;

        const isAuthorized =
          (user.role === 'PATIENT' && room.patient.userId === user.userId) ||
          (user.role === 'DOCTOR' && room.doctor.userId === user.userId);

        if (!isAuthorized) return;

        const newMessage = await prisma.chatMessage.create({
          data: {
            chatRoomId,
            senderId: user.userId,
            senderRole: user.role,
            message: message.trim(),
          },
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        });

        // Broadcast to chat room
        io.to(`chat:${chatRoomId}`).emit('new_message', newMessage);

        // Notify recipient if they are not in chat room
        const recipientUserId = user.role === 'PATIENT' ? room.doctor.userId : room.patient.userId;
        io.to(`user:${recipientUserId}`).emit('chat_notification', {
          chatRoomId,
          senderName: user.name,
          message: message.slice(0, 80),
        });
      } catch (err) {
        console.error('Error handling socket message:', err);
      }
    });

    // WebRTC / Consultation room signaling
    socket.on('join_consultation', (roomId: string) => {
      socket.join(`consultation:${roomId}`);
      socket.to(`consultation:${roomId}`).emit('participant_joined', {
        userId: user.userId,
        name: user.name,
        role: user.role,
      });
    });

    socket.on('leave_consultation', (roomId: string) => {
      socket.leave(`consultation:${roomId}`);
      socket.to(`consultation:${roomId}`).emit('participant_left', {
        userId: user.userId,
        name: user.name,
      });
    });

    socket.on('consultation_signal', (data: { roomId: string; signal: any; targetId?: string }) => {
      if (data.targetId) {
        socket.to(`user:${data.targetId}`).emit('consultation_signal', {
          senderId: user.userId,
          signal: data.signal,
        });
      } else {
        socket.to(`consultation:${data.roomId}`).emit('consultation_signal', {
          senderId: user.userId,
          signal: data.signal,
        });
      }
    });

    socket.on('disconnect', () => {
      // Disconnect cleanup
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = (): SocketIOServer => {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return ioInstance;
};
