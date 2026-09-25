import { Response } from 'express';
import prisma from '../config/db.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      name,
      role = 'PATIENT',
      // Patient profile inputs
      dateOfBirth,
      gender,
      phone,
      bloodGroup,
      preferredLanguage = 'en',
      allergies,
      medicalConditions,
      // Doctor profile inputs
      specialty,
      qualification,
      experienceYears,
      clinicHospital,
      consultationFee,
      languagesSpoken,
      bio,
    } = req.body;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'Full legal name is required.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
      return;
    }

    // 2. Validate role
    if (role && role !== 'PATIENT' && role !== 'DOCTOR' && role !== 'ADMIN') {
      res.status(400).json({ success: false, message: 'Invalid registration role specified.' });
      return;
    }

    const userRole = role === 'DOCTOR' ? 'DOCTOR' : (role === 'ADMIN' ? 'ADMIN' : 'PATIENT');

    // 3. Email uniqueness check (Backend level)
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please sign in instead.',
      });
      return;
    }

    const hashedPassword = await hashPassword(password);

    // 4. Atomic creation of user and role profile
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: name.trim(),
          role: userRole,
        },
      });

      let patientProfileId: string | undefined;
      let doctorProfileId: string | undefined;

      if (userRole === 'PATIENT') {
        const patient = await tx.patientProfile.create({
          data: {
            userId: user.id,
            dateOfBirth: dateOfBirth?.trim() || null,
            gender: gender?.trim() || null,
            phone: phone?.trim() || null,
            bloodGroup: bloodGroup?.trim() || null,
            preferredLanguage: preferredLanguage?.trim() || 'en',
            allergies: allergies?.trim() || null,
            medicalConditions: medicalConditions?.trim() || null,
          },
        });
        patientProfileId = patient.id;
      } else if (userRole === 'DOCTOR') {
        const expNum =
          experienceYears !== undefined && experienceYears !== null && experienceYears !== ''
            ? Number(experienceYears)
            : null;
        const feeNum =
          consultationFee !== undefined && consultationFee !== null && consultationFee !== ''
            ? Number(consultationFee)
            : 0;

        const doctor = await tx.doctorProfile.create({
          data: {
            userId: user.id,
            specialty: specialty?.trim() || null,
            qualification: qualification?.trim() || null,
            experienceYears: Number.isNaN(expNum) ? null : expNum,
            clinicHospital: clinicHospital?.trim() || null,
            consultationFee: Number.isNaN(feeNum) ? 0 : feeNum,
            languagesSpoken: languagesSpoken?.trim() || 'English',
            bio: bio?.trim() || null,
          },
        });
        doctorProfileId = doctor.id;
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_REGISTERED',
          resource: 'USER',
          resourceId: user.id,
          ipAddress: req.ip || req.socket?.remoteAddress || null,
          details: JSON.stringify({ role: user.role, email: user.email }),
        },
      });

      return { user, patientProfileId, doctorProfileId };
    });

    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
      patientProfileId: result.patientProfileId,
      doctorProfileId: result.doctorProfileId,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        patientProfileId: result.patientProfileId,
        doctorProfileId: result.doctorProfileId,
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please sign in instead.',
      });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration could not be completed. Please try again later.',
    });
  }
};

export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      patientProfileId: user.patientProfile?.id,
      doctorProfileId: user.doctorProfile?.id,
    });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        patientProfileId: user.patientProfile?.id,
        doctorProfileId: user.doctorProfile?.id,
        preferredLanguage: user.patientProfile?.preferredLanguage || 'en',
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.', error: error.message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        patientProfile: user.patientProfile,
        doctorProfile: user.doctorProfile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving user session.', error: error.message });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const { name, ...profileFields } = req.body;

    if (name) {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { name: name.trim() },
      });
    }

    if (req.user.role === 'PATIENT') {
      const updated = await prisma.patientProfile.update({
        where: { userId: req.user.userId },
        data: profileFields,
      });
      res.json({ success: true, message: 'Patient profile updated.', profile: updated });
    } else if (req.user.role === 'DOCTOR') {
      const updated = await prisma.doctorProfile.update({
        where: { userId: req.user.userId },
        data: profileFields,
      });
      res.json({ success: true, message: 'Doctor profile updated.', profile: updated });
    } else {
      res.json({ success: true, message: 'Profile updated.' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error updating profile.', error: error.message });
  }
};
