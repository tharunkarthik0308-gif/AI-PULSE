import crypto from 'crypto';
import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { createNotification } from '../services/notificationService.js';
import { recordAuditLog } from '../services/auditService.js';

export const createAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'PATIENT' || !req.user.patientProfileId) {
      res.status(403).json({ success: false, message: 'Only patients can request appointments.' });
      return;
    }

    const { doctorId, appointmentDate, startTime, endTime, type = 'VIDEO', reason } = req.body;

    if (!doctorId || !appointmentDate || !startTime || !endTime) {
      res.status(400).json({ success: false, message: 'doctorId, appointmentDate, startTime, and endTime are required.' });
      return;
    }

    // Check doctor exists
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Selected doctor was not found.' });
      return;
    }

    // Check conflict: Is the doctor already booked at this date and time?
    const existingBooking = await prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate,
        startTime,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    });

    if (existingBooking) {
      res.status(409).json({
        success: false,
        message: 'This time slot is already reserved. Please select another available time.',
      });
      return;
    }

    // Generate unique private room ID for video consultation
    const videoRoomId = `aipulse-room-${crypto.randomUUID()}`;

    const appointment = await prisma.appointment.create({
      data: {
        patientId: req.user.patientProfileId,
        doctorId,
        appointmentDate,
        startTime,
        endTime,
        type,
        reason: reason || null,
        status: 'PENDING',
        videoRoomId,
      },
      include: {
        doctor: { include: { user: { select: { name: true } } } },
      },
    });

    // Ensure chat room exists between patient and doctor
    let chatRoom = await prisma.chatRoom.findFirst({
      where: {
        patientId: req.user.patientProfileId,
        doctorId,
      },
    });

    if (!chatRoom) {
      chatRoom = await prisma.chatRoom.create({
        data: {
          patientId: req.user.patientProfileId,
          doctorId,
          appointmentId: appointment.id,
        },
      });
    }

    // Create health timeline event
    await prisma.healthTimelineEvent.create({
      data: {
        patientId: req.user.patientProfileId,
        eventType: 'APPOINTMENT',
        title: 'Appointment Requested',
        summary: `Requested ${type} consultation with ${doctor.user.name} on ${appointmentDate} at ${startTime}.`,
        referenceId: appointment.id,
      },
    });

    // Notify doctor
    await createNotification({
      userId: doctor.userId,
      type: 'APPOINTMENT_REMINDER',
      title: 'New Appointment Request',
      message: `${req.user.name} requested a ${type} consultation on ${appointmentDate} at ${startTime}.`,
      linkUrl: `/doctor/appointments`,
      metadata: { appointmentId: appointment.id, patientId: req.user.patientProfileId },
    });

    // Audit logging
    await recordAuditLog({
      userId: req.user.userId,
      action: 'CREATE_APPOINTMENT',
      resource: 'Appointment',
      resourceId: appointment.id,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      details: { doctorId, appointmentDate, startTime, type },
    });

    res.status(201).json({
      success: true,
      message: 'Appointment requested successfully.',
      appointment,
      chatRoomId: chatRoom.id,
    });
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ success: false, message: 'Server error scheduling appointment.', error: error.message });
  }
};

export const getMyAppointments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { status, date } = req.query;
    const whereClause: any = {
      isArchived: false,
    };

    if (req.user.role === 'PATIENT' && req.user.patientProfileId) {
      whereClause.patientId = req.user.patientProfileId;
    } else if (req.user.role === 'DOCTOR' && req.user.doctorProfileId) {
      whereClause.doctorId = req.user.doctorProfileId;
    } else {
      res.status(403).json({ success: false, message: 'User profile not linked.' });
      return;
    }

    if (status && typeof status === 'string') {
      whereClause.status = status;
    }
    if (date && typeof date === 'string') {
      whereClause.appointmentDate = date;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: { include: { user: { select: { name: true, email: true } } } },
        doctor: { include: { user: { select: { name: true, email: true } } } },
        prescriptions: true,
      },
      orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
    });

    res.json({ success: true, appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving appointments.', error: error.message });
  }
};

export const updateAppointmentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid appointment status.' });
      return;
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    // Permission check
    const isAuthorized =
      (req.user?.role === 'DOCTOR' && req.user.doctorProfileId === appointment.doctorId) ||
      (req.user?.role === 'PATIENT' && req.user.patientProfileId === appointment.patientId && status === 'CANCELLED');

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: 'Not authorized to modify this appointment.' });
      return;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status,
        notes: notes !== undefined ? notes : appointment.notes,
      },
    });

    // Notify patient about doctor's decision
    if (req.user?.role === 'DOCTOR') {
      await createNotification({
        userId: appointment.patient.userId,
        type: status === 'CONFIRMED' ? 'APPOINTMENT_CONFIRMED' : 'APPOINTMENT_REMINDER',
        title: `Appointment ${status}`,
        message: `Dr. ${appointment.doctor.user.name} has marked your appointment on ${appointment.appointmentDate} at ${appointment.startTime} as ${status}.`,
        linkUrl: `/dashboard/appointments`,
        metadata: { appointmentId: appointment.id, status },
      });
    }

    // Update health timeline
    await prisma.healthTimelineEvent.create({
      data: {
        patientId: appointment.patientId,
        eventType: 'APPOINTMENT',
        title: `Appointment ${status}`,
        summary: `Appointment with Dr. ${appointment.doctor.user.name} was ${status.toLowerCase()}.`,
        referenceId: appointment.id,
      },
    });

    if (req.user?.userId) {
      await recordAuditLog({
        userId: req.user.userId,
        action: `UPDATE_APPOINTMENT_${status}`,
        resource: 'Appointment',
        resourceId: appointment.id,
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
        details: { status, previousStatus: appointment.status },
      });
    }

    res.json({ success: true, message: `Appointment ${status.toLowerCase()}.`, appointment: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error updating appointment status.', error: error.message });
  }
};

export const getAppointmentRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: { select: { id: true, name: true, email: true } } } },
        doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    // Authorization check: Only this doctor or this patient can enter
    const isPatient = req.user?.role === 'PATIENT' && req.user.patientProfileId === appointment.patientId;
    const isDoctor = req.user?.role === 'DOCTOR' && req.user.doctorProfileId === appointment.doctorId;

    if (!isPatient && !isDoctor) {
      res.status(403).json({ success: false, message: 'Access denied. You are not a participant in this consultation.' });
      return;
    }

    if (appointment.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Cannot access consultation room for a cancelled appointment.' });
      return;
    }

    res.json({
      success: true,
      room: {
        appointmentId: appointment.id,
        videoRoomId: appointment.videoRoomId,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        type: appointment.type,
        reason: appointment.reason,
        patient: {
          id: appointment.patient.id,
          name: appointment.patient.user.name,
        },
        doctor: {
          id: appointment.doctor.id,
          name: appointment.doctor.user.name,
          specialty: appointment.doctor.specialty,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving room credentials.', error: error.message });
  }
};

export const startConsultation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        consultation: true,
      },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    const isPatient = req.user?.role === 'PATIENT' && req.user.patientProfileId === appointment.patientId;
    const isDoctor = req.user?.role === 'DOCTOR' && req.user.doctorProfileId === appointment.doctorId;

    if (!isPatient && !isDoctor) {
      res.status(403).json({ success: false, message: 'Access denied to this consultation.' });
      return;
    }

    if (appointment.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Cannot start consultation for a cancelled appointment.' });
      return;
    }

    let consultation = appointment.consultation;
    if (!consultation) {
      consultation = await prisma.consultation.create({
        data: {
          appointmentId: appointment.id,
          videoRoomId: appointment.videoRoomId,
          startTime: new Date(),
          status: 'ACTIVE',
        },
      });

      // Update appointment status to IN_PROGRESS upon active start
      if (['PENDING', 'CONFIRMED', 'SCHEDULED'].includes(appointment.status)) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: 'IN_PROGRESS' },
        });
      }

      // Add timeline event
      await prisma.healthTimelineEvent.create({
        data: {
          patientId: appointment.patientId,
          eventType: 'VIDEO_CONSULTATION',
          title: 'Video Consultation Started',
          summary: `Consultation session connected with Dr. ${appointment.doctor.user.name}.`,
          referenceId: consultation.id,
        },
      });
    }

    if (req.user?.userId) {
      await recordAuditLog({
        userId: req.user.userId,
        action: 'START_CONSULTATION',
        resource: 'Consultation',
        resourceId: consultation.id,
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
        details: { appointmentId: appointment.id, videoRoomId: appointment.videoRoomId },
      });
    }

    res.json({ success: true, consultation });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error initiating consultation.', error: error.message });
  }
};

export const endConsultation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { durationSeconds = 0, doctorNotesSummary } = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        consultation: true,
      },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    const isPatient = req.user?.role === 'PATIENT' && req.user.patientProfileId === appointment.patientId;
    const isDoctor = req.user?.role === 'DOCTOR' && req.user.doctorProfileId === appointment.doctorId;

    if (!isPatient && !isDoctor) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    let consultation = appointment.consultation;
    const computedDuration = consultation
      ? Math.max(Number(durationSeconds) || 0, Math.round((Date.now() - new Date(consultation.startTime).getTime()) / 1000))
      : Number(durationSeconds) || 0;

    if (consultation) {
      consultation = await prisma.consultation.update({
        where: { id: consultation.id },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
          durationSeconds: computedDuration,
          doctorNotesSummary: doctorNotesSummary || consultation.doctorNotesSummary,
        },
      });
    } else {
      consultation = await prisma.consultation.create({
        data: {
          appointmentId: appointment.id,
          videoRoomId: appointment.videoRoomId,
          status: 'COMPLETED',
          endTime: new Date(),
          durationSeconds: computedDuration,
          doctorNotesSummary: doctorNotesSummary || null,
        },
      });
    }

    // Mark appointment completed
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'COMPLETED' },
    });

    // Record health timeline event
    await prisma.healthTimelineEvent.create({
      data: {
        patientId: appointment.patientId,
        eventType: 'VIDEO_CONSULTATION',
        title: 'Video Consultation Completed',
        summary: `Video consultation with Dr. ${appointment.doctor.user.name} concluded (${Math.round(computedDuration / 60)} min).`,
        referenceId: consultation.id,
      },
    });

    if (req.user?.userId) {
      await recordAuditLog({
        userId: req.user.userId,
        action: 'END_CONSULTATION',
        resource: 'Consultation',
        resourceId: consultation.id,
        ipAddress: req.ip || req.socket.remoteAddress || undefined,
        details: { appointmentId: appointment.id, durationSeconds: computedDuration },
      });
    }

    res.json({ success: true, message: 'Consultation ended successfully.', consultation });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error ending consultation.', error: error.message });
  }
};

export const getConsultationSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check appointment first to verify participant authorization
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        consultation: true,
        patient: { include: { user: { select: { name: true, email: true } } } },
        doctor: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found.' });
      return;
    }

    // P0 Security Verification: Authorization must verify the requesting user is one of:
    // 1. The patient associated with the appointment
    // 2. The doctor associated with the appointment
    // 3. An authorized ADMIN role
    const isPatient = req.user?.role === 'PATIENT' && req.user.patientProfileId === appointment.patientId;
    const isDoctor = req.user?.role === 'DOCTOR' && req.user.doctorProfileId === appointment.doctorId;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isPatient && !isDoctor && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You are not an authorized participant in this consultation session.',
      });
      return;
    }

    if (!appointment.consultation) {
      res.status(404).json({ success: false, message: 'Consultation record not found.' });
      return;
    }

    res.json({
      success: true,
      consultation: {
        ...appointment.consultation,
        appointment: {
          id: appointment.id,
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          type: appointment.type,
          reason: appointment.reason,
          patient: appointment.patient,
          doctor: appointment.doctor,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving consultation session.', error: error.message });
  }
};

export const removeAppointmentRecord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    if (req.user.role !== 'DOCTOR' || !req.user.doctorProfileId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only authenticated doctors can remove appointment records.',
      });
      return;
    }

    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment || appointment.doctorId !== req.user.doctorProfileId) {
      res.status(404).json({
        success: false,
        message: 'Appointment not found or does not belong to this doctor.',
      });
      return;
    }

    // Soft-delete / archive appointment so all related consultations, prescriptions, reports, and clinical history remain intact
    await prisma.appointment.update({
      where: { id },
      data: { isArchived: true },
    });

    await recordAuditLog({
      userId: req.user.userId,
      action: 'REMOVE_APPOINTMENT_RECORD',
      resource: 'Appointment',
      resourceId: appointment.id,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      details: {
        doctorId: req.user.doctorProfileId,
        patientId: appointment.patientId,
        appointmentDate: appointment.appointmentDate,
      },
    });

    res.json({
      success: true,
      message: 'Appointment record removed from doctor appointment history successfully.',
    });
  } catch (error: any) {
    console.error('Error removing appointment record:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing appointment record.',
      error: error.message,
    });
  }
};
