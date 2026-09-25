import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getMyDashboardData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'PATIENT') {
      res.status(403).json({ success: false, message: 'Only patients can access patient dashboard.' });
      return;
    }

    const patient = await prisma.patientProfile.findUnique({
      where: { userId: req.user.userId },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient profile not found.' });
      return;
    }

    // 1. Latest screening
    const latestScan = await prisma.scanReport.findFirst({
      where: { patientId: patient.id },
      orderBy: { timestamp: 'desc' },
    });

    // 2. Scan history (last 10)
    const scanHistory = await prisma.scanReport.findMany({
      where: { patientId: patient.id },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // 3. Upcoming appointment
    const today = new Date().toISOString().split('T')[0];
    const upcomingAppointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        appointmentDate: { gte: today },
        status: { in: ['CONFIRMED', 'IN_PROGRESS', 'PENDING'] },
      },
      include: {
        doctor: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    });

    // 4. Active medications & today's doses
    const activeMedications = await prisma.medication.findMany({
      where: { patientId: patient.id, isActive: true },
      include: {
        logs: {
          where: { scheduledDate: today },
        },
      },
    });

    // Calculate real mathematical adherence from past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const pastLogs = await prisma.medicationLog.findMany({
      where: {
        patientId: patient.id,
        scheduledDate: { gte: thirtyDaysAgoStr },
      },
    });

    let adherenceRate: number | null = null;
    if (pastLogs.length > 0) {
      const takenCount = pastLogs.filter((l) => l.status === 'TAKEN').length;
      adherenceRate = Math.round((takenCount / pastLogs.length) * 100);
    }

    // 5. Recent prescription
    const recentPrescription = await prisma.prescription.findFirst({
      where: { patientId: patient.id },
      include: {
        doctor: { include: { user: { select: { name: true } } } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 6. Recent reports
    const recentReports = await prisma.medicalReport.findMany({
      where: { patientId: patient.id },
      orderBy: { reportDate: 'desc' },
      take: 5,
    });

    // 7. Unread notifications count
    const unreadNotificationsCount = await prisma.notification.count({
      where: { userId: req.user.userId, isRead: false },
    });

    res.json({
      success: true,
      data: {
        profile: patient,
        latestScan,
        scanHistory,
        upcomingAppointment,
        activeMedications,
        adherenceRate,
        recentPrescription,
        recentReports,
        unreadNotificationsCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching patient dashboard data:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving dashboard data.', error: error.message });
  }
};

export const getPatientById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // Role-based authorization
    if (req.user.role === 'DOCTOR') {
      const hasRelationship = await prisma.appointment.findFirst({
        where: {
          doctorId: req.user.doctorProfileId,
          patientId: patientId,
        },
      });

      if (!hasRelationship) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not have an active clinical relationship with this patient.',
        });
        return;
      }
    } else if (req.user.role === 'PATIENT') {
      if (req.user.patientProfileId !== patientId) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }
    } else if (req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Unauthorized role.' });
      return;
    }

    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { name: true, email: true, createdAt: true } },
        scans: { orderBy: { timestamp: 'desc' }, take: 20 },
        appointments: {
          include: { doctor: { include: { user: { select: { name: true } } } } },
          orderBy: { appointmentDate: 'desc' },
        },
        prescriptions: {
          include: {
            items: true,
            doctor: { include: { user: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
        medications: {
          include: { logs: { orderBy: { scheduledDate: 'desc' }, take: 15 } },
        },
        medicalReports: { orderBy: { reportDate: 'desc' } },
        voiceTriageSessions: { orderBy: { createdAt: 'desc' }, take: 20 },
        doctorNotes: req.user?.role === 'DOCTOR'
          ? {
              where: { doctorId: req.user.doctorProfileId },
              orderBy: { createdAt: 'desc' },
            }
          : false, // Patients never get doctorNotes!
      },
    });

    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient profile not found.' });
      return;
    }

    // Calculate real mathematical adherence from past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const pastLogs = await prisma.medicationLog.findMany({
      where: {
        patientId: patient.id,
        scheduledDate: { gte: thirtyDaysAgoStr },
      },
    });

    let adherenceRate: number | null = null;
    let takenCount = 0;
    let skippedCount = 0;
    if (pastLogs.length > 0) {
      takenCount = pastLogs.filter((l) => l.status === 'TAKEN').length;
      skippedCount = pastLogs.filter((l) => l.status === 'SKIPPED').length;
      adherenceRate = Math.round((takenCount / pastLogs.length) * 100);
    }

    res.json({
      success: true,
      patient,
      adherence: {
        rate: adherenceRate,
        takenCount,
        skippedCount,
        totalLogs: pastLogs.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving patient details.', error: error.message });
  }
};
