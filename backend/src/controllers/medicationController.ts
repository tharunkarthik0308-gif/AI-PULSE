import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getMedications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { patientId } = req.query;

    let targetPatientId = '';
    if (req.user?.role === 'PATIENT') {
      targetPatientId = req.user.patientProfileId!;
    } else if (req.user?.role === 'DOCTOR') {
      if (!patientId) {
        res.json({
          success: true,
          requiresPatientSelection: true,
          medications: [],
          adherence: null,
        });
        return;
      }
      targetPatientId = String(patientId);

      // Verify clinical relationship (appointment between doctor and patient)
      const hasRelationship = await prisma.appointment.findFirst({
        where: {
          doctorId: req.user.doctorProfileId,
          patientId: targetPatientId,
        },
      });

      if (!hasRelationship) {
        res.status(403).json({ success: false, message: 'Access denied. You do not have an active clinical relationship with this patient.' });
        return;
      }
    } else {
      res.status(400).json({ success: false, message: 'Invalid patient query.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const medications = await prisma.medication.findMany({
      where: { patientId: targetPatientId },
      include: {
        logs: {
          where: { scheduledDate: today },
          orderBy: { scheduledTime: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate real adherence for past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const allPastLogs = await prisma.medicationLog.findMany({
      where: {
        patientId: targetPatientId,
        scheduledDate: { gte: thirtyDaysAgoStr },
      },
    });

    let adherenceRate: number | null = null;
    let takenCount = 0;
    let skippedCount = 0;
    let totalLogs = allPastLogs.length;

    if (totalLogs > 0) {
      takenCount = allPastLogs.filter((l) => l.status === 'TAKEN').length;
      skippedCount = allPastLogs.filter((l) => l.status === 'SKIPPED').length;
      adherenceRate = Math.round((takenCount / totalLogs) * 100);
    }

    let patientDetails: any = null;
    if (req.user?.role === 'DOCTOR' && targetPatientId) {
      patientDetails = await prisma.patientProfile.findUnique({
        where: { id: targetPatientId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }

    res.json({
      success: true,
      medications,
      patient: patientDetails,
      adherence: {
        rate: adherenceRate,
        takenCount,
        skippedCount,
        totalLogs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving medications.', error: error.message });
  }
};

export const createMedication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'PATIENT' || !req.user.patientProfileId) {
      res.status(403).json({ success: false, message: 'Patients can record self-managed medications.' });
      return;
    }

    const { name, dosage, frequency, timesOfDay, startDate, endDate, instructions } = req.body;

    if (!name || !dosage || !frequency) {
      res.status(400).json({ success: false, message: 'name, dosage, and frequency are required.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const times = Array.isArray(timesOfDay) ? timesOfDay : ['09:00'];

    const medication = await prisma.medication.create({
      data: {
        patientId: req.user.patientProfileId,
        name,
        dosage,
        frequency,
        timesOfDay: JSON.stringify(times),
        startDate: startDate || today,
        endDate: endDate || null,
        instructions: instructions || null,
        isActive: true,
      },
    });

    // Create health timeline event
    await prisma.healthTimelineEvent.create({
      data: {
        patientId: req.user.patientProfileId,
        eventType: 'MEDICATION_LOG',
        title: `Medication Added: ${name}`,
        summary: `Schedule: ${dosage} (${frequency}).`,
        referenceId: medication.id,
      },
    });

    res.status(201).json({ success: true, message: 'Medication added.', medication });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error adding medication.', error: error.message });
  }
};

export const logDose = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'PATIENT' || !req.user.patientProfileId) {
      res.status(403).json({ success: false, message: 'Patient access required to log dose.' });
      return;
    }

    const { medicationId, scheduledDate, scheduledTime, status, notes } = req.body;

    if (!medicationId || !status || !['TAKEN', 'SKIPPED'].includes(status)) {
      res.status(400).json({ success: false, message: 'medicationId and valid status (TAKEN/SKIPPED) are required.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const dateStr = scheduledDate || today;
    const timeStr = scheduledTime || new Date().toTimeString().substring(0, 5);

    // Upsert or create dose log
    const log = await prisma.medicationLog.create({
      data: {
        medicationId,
        patientId: req.user.patientProfileId,
        scheduledDate: dateStr,
        scheduledTime: timeStr,
        status,
        takenAt: status === 'TAKEN' ? new Date() : null,
        notes: notes || null,
      },
      include: {
        medication: true,
      },
    });

    // Create timeline event if taken
    if (status === 'TAKEN') {
      await prisma.healthTimelineEvent.create({
        data: {
          patientId: req.user.patientProfileId,
          eventType: 'MEDICATION_LOG',
          title: `Dose Taken: ${log.medication.name}`,
          summary: `Dose of ${log.medication.dosage} recorded at ${timeStr}.`,
          referenceId: log.id,
        },
      });
    }

    res.json({ success: true, message: `Dose marked as ${status.toLowerCase()}.`, log });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error recording medication log.', error: error.message });
  }
};
