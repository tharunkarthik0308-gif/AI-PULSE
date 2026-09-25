import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { recordAuditLog } from '../services/auditService.js';

export const createDoctorNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'DOCTOR' || !req.user.doctorProfileId) {
      res.status(403).json({ success: false, message: 'Only licensed doctors can author clinical notes.' });
      return;
    }

    const { patientId, appointmentId, title, content, isPrivate = true } = req.body;

    if (!patientId || !title || !content) {
      res.status(400).json({ success: false, message: 'patientId, title, and content are required.' });
      return;
    }

    const note = await prisma.doctorNote.create({
      data: {
        doctorId: req.user.doctorProfileId,
        patientId,
        appointmentId: appointmentId || null,
        title,
        content,
        isPrivate: isPrivate !== false,
      },
    });

    // Add note event to timeline (marked isDoctorOnly = true)
    await prisma.healthTimelineEvent.create({
      data: {
        patientId,
        eventType: 'DOCTOR_NOTE',
        title: `Clinical Note: ${title}`,
        summary: `Physician consultation review entry recorded.`,
        referenceId: note.id,
        isDoctorOnly: true, // Hidden from patient view
      },
    });

    // Audit logging
    await recordAuditLog({
      userId: req.user.userId,
      action: 'CREATE_CLINICAL_NOTE',
      resource: 'DoctorNote',
      resourceId: note.id,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      details: { patientId, isPrivate: note.isPrivate, title: note.title },
    });

    res.status(201).json({ success: true, message: 'Clinical note created.', note });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error saving note.', error: error.message });
  }
};

export const getDoctorNotesForPatient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'DOCTOR') {
      res.status(403).json({ success: false, message: 'Doctor access required.' });
      return;
    }

    const { patientId } = req.params;
    const notes = await prisma.doctorNote.findMany({
      where: {
        patientId,
        doctorId: req.user.doctorProfileId,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, notes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving notes.', error: error.message });
  }
};
