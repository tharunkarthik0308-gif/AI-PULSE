import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { createNotification } from '../services/notificationService.js';

export const uploadReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'Medical document file is required.' });
      return;
    }

    const { title, reportType = 'OTHER', notes, targetPatientId } = req.body;

    let patientId = '';
    if (req.user.role === 'PATIENT') {
      patientId = req.user.patientProfileId!;
    } else if (req.user.role === 'DOCTOR') {
      if (!targetPatientId) {
        res.status(400).json({ success: false, message: 'targetPatientId is required when a doctor uploads a report.' });
        return;
      }
      patientId = targetPatientId;
    }

    const report = await prisma.medicalReport.create({
      data: {
        patientId,
        uploadedById: req.user.userId,
        title: title || req.file.originalname,
        reportType,
        fileUrl: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        notes: notes || null,
      },
    });

    // Add to health timeline
    await prisma.healthTimelineEvent.create({
      data: {
        patientId,
        eventType: 'REPORT',
        title: `Medical Document: ${report.title}`,
        summary: `Type: ${reportType}. Uploaded by ${req.user.role === 'DOCTOR' ? 'Doctor' : 'Patient'}.`,
        referenceId: report.id,
      },
    });

    // If uploaded by doctor, notify patient
    if (req.user.role === 'DOCTOR') {
      const patient = await prisma.patientProfile.findUnique({
        where: { id: patientId },
        select: { userId: true },
      });
      if (patient) {
        await createNotification({
          userId: patient.userId,
          type: 'NEW_REPORT',
          title: 'New Medical Report Available',
          message: `Your doctor uploaded a report: ${report.title}.`,
          linkUrl: `/dashboard/reports`,
        });
      }
    }

    res.status(201).json({ success: true, message: 'Medical report uploaded successfully.', report });
  } catch (error: any) {
    console.error('Error uploading medical report:', error);
    res.status(500).json({ success: false, message: 'Error uploading report.', error: error.message });
  }
};

export const getMyReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
          reports: [],
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

    const reports = await prisma.medicalReport.findMany({
      where: { patientId: targetPatientId },
      orderBy: { reportDate: 'desc' },
    });

    let patientDetails: any = null;
    if (req.user?.role === 'DOCTOR' && targetPatientId) {
      patientDetails = await prisma.patientProfile.findUnique({
        where: { id: targetPatientId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }

    res.json({ success: true, reports, patient: patientDetails });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error fetching reports.', error: error.message });
  }
};

export const downloadReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const report = await prisma.medicalReport.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!report) {
      res.status(404).json({ success: false, message: 'Medical report not found.' });
      return;
    }

    // Access check: only patient themselves, or authorized doctor/admin
    const isPatient = req.user?.role === 'PATIENT' && req.user.patientProfileId === report.patientId;
    let isDoctorAuthorized = false;
    if (req.user?.role === 'DOCTOR') {
      if (report.uploadedById === req.user.userId) {
        isDoctorAuthorized = true;
      } else {
        const hasRelationship = await prisma.appointment.findFirst({
          where: {
            doctorId: req.user.doctorProfileId,
            patientId: report.patientId,
          },
        });
        if (hasRelationship) isDoctorAuthorized = true;
      }
    }
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isPatient && !isDoctorAuthorized && !isAdmin) {
      res.status(403).json({ success: false, message: 'Unauthorized to download this report.' });
      return;
    }

    const filename = path.basename(report.fileUrl);
    const filePath = path.resolve('./uploads', filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'File not found on storage server.' });
      return;
    }

    res.download(filePath, report.fileName);
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error downloading report.', error: error.message });
  }
};
