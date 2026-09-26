import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getDoctorDashboardData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'DOCTOR') {
      res.status(403).json({ success: false, message: 'Only doctors can access clinical command center.' });
      return;
    }

    const doctor = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.userId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor profile not found.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // 1. Today's appointments
    const todaysAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        appointmentDate: today,
      },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // 2. Pending appointment requests
    const pendingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: 'PENDING',
      },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    // 3. High-risk screening alerts
    // Scans where riskLevel is HIGH_RISK or ATTENTION for patients who have appointments or consultations with this doctor
    const highRiskScans = await prisma.scanReport.findMany({
      where: {
        riskLevel: { in: ['HIGH_RISK', 'ATTENTION'] },
        patient: {
          appointments: {
            some: { doctorId: doctor.id },
          },
        },
      },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // 4. Total unique patients who had or have appointments with this doctor
    const uniquePatientAppointments = await prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      select: { patientId: true },
      distinct: ['patientId'],
    });
    const totalPatientsCount = uniquePatientAppointments.length;

    // 5. Recent scans across authorized patients
    const recentPatientScans = await prisma.scanReport.findMany({
      where: {
        patient: {
          appointments: {
            some: { doctorId: doctor.id },
          },
        },
      },
      include: {
        patient: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // 6. Patient queue (patients with confirmed appointments today or upcoming)
    const patientQueue = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: 'CONFIRMED',
        appointmentDate: { gte: today },
      },
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true } },
            scans: { orderBy: { timestamp: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
      take: 15,
    });

    res.json({
      success: true,
      data: {
        doctor,
        stats: {
          totalPatients: totalPatientsCount,
          todayAppointmentsCount: todaysAppointments.length,
          pendingRequestsCount: pendingAppointments.length,
          highRiskAlertsCount: highRiskScans.length,
        },
        todaysAppointments,
        pendingAppointments,
        highRiskScans,
        recentPatientScans,
        patientQueue,
      },
    });
  } catch (error: any) {
    console.error('Doctor dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving doctor command center.', error: error.message });
  }
};

export const listDoctors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { specialty, language, search } = req.query;

    const whereClause: any = { isVerified: true };
    if (specialty && typeof specialty === 'string') {
      whereClause.specialty = { contains: specialty };
    }
    if (language && typeof language === 'string') {
      whereClause.languagesSpoken = { contains: language };
    }

    const doctors = await prisma.doctorProfile.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true } },
        availabilities: { where: { isActive: true } },
      },
      orderBy: { experienceYears: 'desc' },
    });

    res.json({ success: true, doctors });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving doctor directory.', error: error.message });
  }
};

export const getDoctorById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        availabilities: { where: { isActive: true } },
      },
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found.' });
      return;
    }

    res.json({ success: true, doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving doctor profile.', error: error.message });
  }
};

export const setDoctorAvailability = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'DOCTOR' || !req.user.doctorProfileId) {
      res.status(403).json({ success: false, message: 'Only authorized doctors can configure availability.' });
      return;
    }

    const { availabilities } = req.body; // Array of { dayOfWeek, startTime, endTime, slotDurationMinutes, isActive }

    if (!Array.isArray(availabilities)) {
      res.status(400).json({ success: false, message: 'availabilities array is required.' });
      return;
    }

    // Replace existing regular availability
    await prisma.doctorAvailability.deleteMany({
      where: { doctorId: req.user.doctorProfileId },
    });

    const created = await Promise.all(
      availabilities.map((a: any) =>
        prisma.doctorAvailability.create({
          data: {
            doctorId: req.user!.doctorProfileId!,
            dayOfWeek: a.dayOfWeek !== undefined ? Number(a.dayOfWeek) : null,
            specificDate: a.specificDate || null,
            startTime: a.startTime || '09:00',
            endTime: a.endTime || '17:00',
            slotDurationMinutes: Number(a.slotDurationMinutes) || 30,
            isActive: a.isActive !== false,
          },
        })
      )
    );

    res.json({ success: true, message: 'Availability updated successfully.', availabilities: created });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error setting availability.', error: error.message });
  }
};

export const removePatientFromActiveCare = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'DOCTOR' || !req.user.doctorProfileId) {
      res.status(403).json({
        success: false,
        message: 'Only authorized doctors can remove patients from active care.',
      });
      return;
    }

    const { patientId } = req.params;
    const doctorId = req.user.doctorProfileId;

    const relationship = await prisma.doctorPatient.findUnique({
      where: {
        doctorId_patientId: {
          doctorId,
          patientId,
        },
      },
    });

    if (!relationship) {
      res.status(404).json({
        success: false,
        message: 'Patient is not in your active care list.',
      });
      return;
    }

    await prisma.doctorPatient.update({
      where: {
        doctorId_patientId: {
          doctorId,
          patientId,
        },
      },
      data: {
        isActive: false,
      },
    });

    res.json({
      success: true,
      message: 'Patient removed from active care.',
    });
  } catch (error: any) {
    console.error('Error removing patient from active care:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing patient from active care.',
      error: error.message,
    });
  }
};

export const getDoctorPatients = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'DOCTOR' || !req.user.doctorProfileId) {
      res.status(403).json({ success: false, message: 'Only authorized doctors can view their patient directory.' });
      return;
    }

    const { search } = req.query;
    const doctorId = req.user.doctorProfileId;

    // Retrieve unique patient IDs who have had or have appointments with this specific doctor
    // Retrieve only patients currently in this doctor's active care list
    const activeDoctorPatients = await prisma.doctorPatient.findMany({
      where: {
        doctorId,
        isActive: true,
      },
      select: {
        patientId: true,
      },
    });

    const patientIds = activeDoctorPatients.map((relationship) => relationship.patientId);

    const whereClause: any = {
      id: { in: patientIds },
    };

    if (search && typeof search === 'string' && search.trim()) {
      whereClause.user = {
        name: { contains: search.trim() },
      };
    }

    const patientProfiles = await prisma.patientProfile.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        scans: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        appointments: {
          where: { doctorId },
          orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const patients = patientProfiles.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user.name,
      email: p.user.email,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      phone: p.phone,
      bloodGroup: p.bloodGroup,
      allergies: p.allergies,
      medicalConditions: p.medicalConditions,
      latestScan: p.scans[0] || null,
      lastAppointment: p.appointments[0] || null,
      createdAt: p.user.createdAt,
    }));

    res.json({ success: true, patients, total: patients.length });
  }

  catch (error: any) {
    console.error('Error fetching doctor patient directory:', error);
    res.status(500).json({ success: false, message: 'Error fetching patient directory.', error: error.message });
  }
};
