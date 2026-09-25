import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { createNotification } from '../services/notificationService.js';
import { recordAuditLog } from '../services/auditService.js';

export const createPrescription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'DOCTOR' || !req.user.doctorProfileId) {
      res.status(403).json({ success: false, message: 'Only authorized doctors can issue prescriptions.' });
      return;
    }

    const {
      patientId,
      appointmentId,
      clinicalNotes,
      diagnosisContext,
      followUpDate,
      items, // Array of { medicationName, dosage, frequency, durationDays, instructions }
    } = req.body;

    if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'patientId and at least one medication item are required.' });
      return;
    }

    // Verify clinical relationship (appointment between doctor and patient)
    const hasRelationship = await prisma.appointment.findFirst({
      where: {
        doctorId: req.user.doctorProfileId,
        patientId,
      },
    });

    if (!hasRelationship) {
      res.status(403).json({ success: false, message: 'Access denied. You do not have an active clinical relationship with this patient.' });
      return;
    }

    // Create prescription
    const prescription = await prisma.prescription.create({
      data: {
        doctorId: req.user.doctorProfileId,
        patientId,
        appointmentId: appointmentId || null,
        clinicalNotes: clinicalNotes || null,
        diagnosisContext: diagnosisContext || null,
        followUpDate: followUpDate || null,
        items: {
          create: items.map((item: any) => ({
            medicationName: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            durationDays: Number(item.durationDays) || 7,
            instructions: item.instructions || null,
          })),
        },
      },
      include: {
        items: true,
        doctor: { include: { user: { select: { name: true } } } },
      },
    });

    // Auto-create active patient medications from this prescription for adherence tracking
    const today = new Date().toISOString().split('T')[0];
    for (const item of items) {
      const timesArray = item.frequency.toLowerCase().includes('twice')
        ? ['08:00', '20:00']
        : item.frequency.toLowerCase().includes('thrice')
        ? ['08:00', '14:00', '20:00']
        : ['09:00'];

      await prisma.medication.create({
        data: {
          patientId,
          name: item.medicationName,
          dosage: item.dosage,
          frequency: item.frequency,
          timesOfDay: JSON.stringify(timesArray),
          startDate: today,
          instructions: item.instructions || null,
          isActive: true,
        },
      });
    }

    // Health timeline event
    await prisma.healthTimelineEvent.create({
      data: {
        patientId,
        eventType: 'PRESCRIPTION',
        title: 'E-Prescription Issued',
        summary: `Prescribed ${items.length} medication(s) by Dr. ${req.user.name}.`,
        referenceId: prescription.id,
      },
    });

    // Notify patient
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      select: { userId: true },
    });
    if (patient) {
      await createNotification({
        userId: patient.userId,
        type: 'NEW_PRESCRIPTION',
        title: 'New Prescription Issued',
        message: `Dr. ${req.user.name} has issued an electronic prescription for you.`,
        linkUrl: `/dashboard/prescriptions/${prescription.id}`,
      });
    }

    // Audit logging
    await recordAuditLog({
      userId: req.user.userId,
      action: 'ISSUE_PRESCRIPTION',
      resource: 'Prescription',
      resourceId: prescription.id,
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      details: {
        patientId,
        itemCount: items.length,
        medications: items.map((i: any) => i.medicationName),
      },
    });

    res.status(201).json({ success: true, message: 'Prescription issued successfully.', prescription });
  } catch (error: any) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ success: false, message: 'Error issuing prescription.', error: error.message });
  }
};

export const getPrescriptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { patientId } = req.query;

    let targetPatientId = '';
    let patientData: any = null;

    if (req.user?.role === 'PATIENT') {
      targetPatientId = req.user.patientProfileId!;
    } else if (req.user?.role === 'DOCTOR') {
      if (!patientId) {
        res.json({
          success: true,
          requiresPatientSelection: true,
          prescriptions: [],
        });
        return;
      }
      targetPatientId = String(patientId);

      // Verify patient exists
      const patient = await prisma.patientProfile.findUnique({
        where: { id: targetPatientId },
        include: {
          user: { select: { name: true, email: true } },
        },
      });

      if (!patient) {
        res.status(404).json({ success: false, message: 'Patient profile not found.' });
        return;
      }

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

      patientData = patient;
    } else {
      res.status(400).json({ success: false, message: 'Valid patient identifier is required.' });
      return;
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { patientId: targetPatientId },
      include: {
        items: true,
        doctor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        appointment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      prescriptions,
      ...(patientData ? { patient: patientData } : {}),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving prescriptions.', error: error.message });
  }
};

export const getPrescriptionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        items: true,
        patient: { include: { user: { select: { name: true, email: true } } } },
        doctor: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    if (!prescription) {
      res.status(404).json({ success: false, message: 'Prescription not found.' });
      return;
    }

    // Access check: only patient themselves, or authorized doctor/admin
    const isPatient = req.user?.role === 'PATIENT' && req.user.patientProfileId === prescription.patientId;
    let isDoctorAuthorized = false;
    if (req.user?.role === 'DOCTOR') {
      if (prescription.doctorId === req.user.doctorProfileId) {
        isDoctorAuthorized = true;
      } else {
        const hasRelationship = await prisma.appointment.findFirst({
          where: {
            doctorId: req.user.doctorProfileId,
            patientId: prescription.patientId,
          },
        });
        if (hasRelationship) isDoctorAuthorized = true;
      }
    }
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isPatient && !isDoctorAuthorized && !isAdmin) {
      res.status(403).json({ success: false, message: 'Access denied to this prescription.' });
      return;
    }

    res.json({ success: true, prescription });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving prescription.', error: error.message });
  }
};
