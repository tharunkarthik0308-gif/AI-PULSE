import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { generateHealthSummary } from '../services/aiService.js';
import { recordAuditLog } from '../services/auditService.js';

export const getHealthAnalysis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { timeRange = '30', patientId } = req.query;

    let targetPatientId = '';
    const isDoctor = req.user?.role === 'DOCTOR';

    if (req.user?.role === 'PATIENT') {
      targetPatientId = req.user.patientProfileId!;
    } else if (isDoctor) {
      if (!patientId) {
        res.json({
          success: true,
          requiresPatientSelection: true,
          data: {
            timeRange: `${timeRange} days`,
            totalScans: 0,
            scans: [],
            riskDistribution: {},
            stressDistribution: {},
            aiSummary: null,
          },
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

    const patient = await prisma.patientProfile.findUnique({
      where: { id: targetPatientId },
      include: { user: { select: { name: true } } },
    });

    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient record not found.' });
      return;
    }

    // Determine cutoff date
    let dateFilter: any = {};
    const days = parseInt(timeRange as string, 10);
    if (!isNaN(days) && days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      dateFilter = { gte: cutoff };
    }

    // Query REAL stored scans
    const scans = await prisma.scanReport.findMany({
      where: {
        patientId: targetPatientId,
        ...(dateFilter.gte ? { timestamp: dateFilter } : {}),
      },
      orderBy: { timestamp: 'asc' },
    });

    // Query active medications & adherence
    const activeMeds = await prisma.medication.findMany({
      where: { patientId: targetPatientId, isActive: true },
    });

    const pastLogs = await prisma.medicationLog.findMany({
      where: { patientId: targetPatientId },
    });
    const adherenceRate =
      pastLogs.length > 0
        ? Math.round((pastLogs.filter((l) => l.status === 'TAKEN').length / pastLogs.length) * 100)
        : undefined;

    // AI Health summary generation based strictly on real data
    const audience = isDoctor ? 'DOCTOR' : 'PATIENT';
    const preferredLang = patient.preferredLanguage || 'en';

    const aiSummary = await generateHealthSummary(
      {
        patientName: patient.user.name,
        recentScans: scans.map((s) => ({
          timestamp: s.timestamp,
          estimatedHeartRate: s.estimatedHeartRate,
          stressLevel: s.stressLevel,
          riskLevel: s.riskLevel,
          confidence: s.confidence,
          signalQuality: s.signalQuality,
        })),
        activeMedications: activeMeds.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
        })),
        medicationAdherenceRate: adherenceRate,
      },
      audience,
      preferredLang
    );

    // Compute distribution counts strictly from real scans
    const riskDistribution = {
      NORMAL: scans.filter((s) => s.riskLevel === 'NORMAL').length,
      EVALUATE: scans.filter((s) => s.riskLevel === 'EVALUATE').length,
      ATTENTION: scans.filter((s) => s.riskLevel === 'ATTENTION').length,
      HIGH_RISK: scans.filter((s) => s.riskLevel === 'HIGH_RISK').length,
    };

    const stressDistribution = {
      LOW: scans.filter((s) => s.stressLevel === 'LOW').length,
      MODERATE: scans.filter((s) => s.stressLevel === 'MODERATE').length,
      ELEVATED: scans.filter((s) => s.stressLevel === 'ELEVATED').length,
      HIGH: scans.filter((s) => s.stressLevel === 'HIGH').length,
    };

    if (req.user?.userId) {
      recordAuditLog({
        userId: req.user.userId,
        action: 'REQUEST_AI_ANALYSIS',
        resource: 'HEALTH_ANALYSIS',
        resourceId: targetPatientId,
        ipAddress: req.ip,
        details: { timeRange, scanCount: scans.length },
      });
    }

    res.json({
      success: true,
      patient: isDoctor ? patient : undefined,
      data: {
        totalScans: scans.length,
        scans,
        riskDistribution,
        stressDistribution,
        aiSummary,
      },
    });
  } catch (error: any) {
    console.error('Health analysis error:', error);
    res.status(500).json({ success: false, message: 'Error generating health analysis.', error: error.message });
  }
};
