import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getHealthTimeline = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { patientId } = req.query;

    let targetPatientId = '';
    const isDoctor = req.user?.role === 'DOCTOR';

    if (req.user?.role === 'PATIENT') {
      targetPatientId = req.user.patientProfileId!;
    } else if (isDoctor) {
      if (!patientId) {
        res.json({
          success: true,
          requiresPatientSelection: true,
          events: [],
        });
        return;
      }
      targetPatientId = String(patientId);

      // Verify clinical relationship (appointment between doctor and patient)
      const hasRelationship = await prisma.appointment.findFirst({
        where: {
          doctorId: req.user!.doctorProfileId!,
          patientId: targetPatientId,
        },
      });

      if (!hasRelationship) {
        res.status(403).json({ success: false, message: 'Access denied. You do not have an active clinical relationship with this patient.' });
        return;
      }
    } else {
      res.status(400).json({ success: false, message: 'Valid patient identifier is required.' });
      return;
    }

    const whereClause: any = {
      patientId: targetPatientId,
    };

    // If patient is requesting, hide doctor-only private notes
    if (!isDoctor) {
      whereClause.isDoctorOnly = false;
    }

    const events = await prisma.healthTimelineEvent.findMany({
      where: whereClause,
      orderBy: { eventDate: 'desc' },
      take: 50,
    });

    let patientDetails: any = null;
    if (isDoctor && targetPatientId) {
      patientDetails = await prisma.patientProfile.findUnique({
        where: { id: targetPatientId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }

    res.json({ success: true, events, patient: patientDetails });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving health timeline.', error: error.message });
  }
};
