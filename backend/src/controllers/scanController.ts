import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { validateAndClassifyScan } from '../services/rppgService.js';
import { createNotification } from '../services/notificationService.js';
import { recordAuditLog } from '../services/auditService.js';

const MEDICAL_DISCLAIMER =
  'AI-Pulse contactless screening is an AI-assisted investigational tool designed for general wellness and preliminary screening. It does not provide medical diagnoses or replace consultation with a qualified medical professional.';

export const saveScan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'PATIENT' || !req.user.patientProfileId) {
      res.status(403).json({ success: false, message: 'Only registered patients can submit contactless screenings.' });
      return;
    }

    const {
      estimatedHeartRate,
      stressLevel,
      riskLevel,
      faceQuality,
      signalQuality,
      confidence,
      scanDuration,
      algorithmVersion,
      waveformData,
    } = req.body;

    if (!estimatedHeartRate || isNaN(Number(estimatedHeartRate))) {
      res.status(400).json({ success: false, message: 'Valid estimated heart rate is required.' });
      return;
    }

    // Strict validation and clinical screening bounds check
    const classified = validateAndClassifyScan({
      estimatedHeartRate: Number(estimatedHeartRate),
      stressLevel,
      riskLevel,
      faceQuality: Number(faceQuality) || 80,
      signalQuality: Number(signalQuality) || 80,
      confidence: Number(confidence) || 75,
      scanDuration: Number(scanDuration) || 15,
      algorithmVersion,
      waveformData: typeof waveformData === 'string' ? waveformData : JSON.stringify(waveformData || []),
    });

    // Save real scan record to DB
    const scan = await prisma.scanReport.create({
      data: {
        patientId: req.user.patientProfileId,
        estimatedHeartRate: classified.estimatedHeartRate,
        stressLevel: classified.stressLevel,
        riskLevel: classified.riskLevel,
        faceQuality: classified.faceQuality,
        signalQuality: classified.signalQuality,
        confidence: classified.confidence,
        scanDuration: classified.scanDuration,
        algorithmVersion: classified.algorithmVersion,
        waveformData: classified.waveformData,
      },
    });

    // Add entry to Health Timeline
    await prisma.healthTimelineEvent.create({
      data: {
        patientId: req.user.patientProfileId,
        eventType: 'FACE_SCAN',
        title: 'Contactless Face Screening',
        summary: `Estimated HR: ${classified.estimatedHeartRate} BPM (${classified.riskLevel} pattern, ${classified.confidence}% confidence).`,
        referenceId: scan.id,
      },
    });

    // Audit logging
    await recordAuditLog({
      userId: req.user.userId,
      action: 'SAVE_SCREENING',
      resource: 'ScanReport',
      resourceId: scan.id,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      details: {
        estimatedHeartRate: classified.estimatedHeartRate,
        riskLevel: classified.riskLevel,
        confidence: classified.confidence,
        signalQuality: classified.signalQuality,
      },
    });

    // Smart Alert: If high-risk screening pattern detected, alert authorized doctors & patient
    if (classified.riskLevel === 'HIGH_RISK' || classified.riskLevel === 'ATTENTION') {
      // 1. Notify patient
      await createNotification({
        userId: req.user.userId,
        type: 'HIGH_RISK_SCREENING',
        title: 'Screening Pattern Notice',
        message:
          'High-risk screening pattern detected — professional review recommended. Please consider booking a consultation.',
        linkUrl: `/dashboard/appointments`,
        metadata: { scanId: scan.id, estimatedHR: classified.estimatedHeartRate, riskLevel: classified.riskLevel },
      });

      // 2. Notify doctors who have appointments with this patient
      const patientAppointments = await prisma.appointment.findMany({
        where: { patientId: req.user.patientProfileId },
        include: { doctor: { select: { userId: true } } },
      });

      for (const appt of patientAppointments) {
        await createNotification({
          userId: appt.doctor.userId,
          type: 'HIGH_RISK_SCREENING',
          title: 'Patient Screening Alert',
          message: `Elevated screening pattern detected for ${req.user.name} (Estimated HR: ${classified.estimatedHeartRate} BPM).`,
          linkUrl: `/doctor/patients/${req.user.patientProfileId}`,
          metadata: { patientId: req.user.patientProfileId, scanId: scan.id },
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Screening saved successfully.',
      scan,
      disclaimer: MEDICAL_DISCLAIMER,
    });
  } catch (error: any) {
    console.error('Save scan error:', error);
    res.status(500).json({ success: false, message: 'Server error saving scan.', error: error.message });
  }
};

export const getMyScans = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.patientProfileId) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const { limit = '30' } = req.query;
    const scans = await prisma.scanReport.findMany({
      where: { patientId: req.user.patientProfileId },
      orderBy: { timestamp: 'desc' },
      take: Math.min(100, parseInt(limit as string, 10)),
    });

    res.json({
      success: true,
      scans,
      disclaimer: MEDICAL_DISCLAIMER,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving scans.', error: error.message });
  }
};

export const getScanById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const scan = await prisma.scanReport.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!scan) {
      res.status(404).json({ success: false, message: 'Scan report not found.' });
      return;
    }

    // Authorization check
    if (
      req.user?.role === 'PATIENT' &&
      req.user.patientProfileId !== scan.patientId
    ) {
      res.status(403).json({ success: false, message: 'Access denied to this scan record.' });
      return;
    }

    res.json({
      success: true,
      scan,
      disclaimer: MEDICAL_DISCLAIMER,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving scan detail.', error: error.message });
  }
};
