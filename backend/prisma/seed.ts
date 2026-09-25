import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[MedCore Seed] Seeding clinical accounts and baseline records...');

  // Clean existing records if any
  await prisma.chatMessage.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.healthTimelineEvent.deleteMany();
  await prisma.medicationLog.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.doctorNote.deleteMany();
  await prisma.medicalReport.deleteMany();
  await prisma.scanReport.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.user.deleteMany();

  const doctorPassword = await bcrypt.hash('Doctor123!', 10);
  const patientPassword = await bcrypt.hash('Patient123!', 10);

  // 1. Create Doctor 1: Dr. Sarah Jenkins
  const docUser1 = await prisma.user.create({
    data: {
      email: 'doctor@medcore.com',
      password: doctorPassword,
      name: 'Dr. Sarah Jenkins, MD',
      role: 'DOCTOR',
    },
  });

  const docProfile1 = await prisma.doctorProfile.create({
    data: {
      userId: docUser1.id,
      specialty: 'Cardiology & Internal Medicine',
      qualification: 'MD, FACC - Harvard Medical School',
      experienceYears: 12,
      clinicHospital: 'Boston Cardiovascular & Telehealth Institute',
      languagesSpoken: 'English, French',
      consultationModes: 'VIDEO,CHAT',
      consultationFee: 75,
      bio: 'Board-certified cardiologist specializing in preventive cardiovascular wellness, digital hemodynamics, and remote telemedicine consultation.',
    },
  });

  // Doctor 1 Availability (Mon-Fri 09:00 - 17:00)
  for (let day = 1; day <= 5; day++) {
    await prisma.doctorAvailability.create({
      data: {
        doctorId: docProfile1.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        isActive: true,
      },
    });
  }

  // 2. Create Doctor 2: Dr. Rajesh Sharma
  const docUser2 = await prisma.user.create({
    data: {
      email: 'doctor.rajesh@medcore.com',
      password: doctorPassword,
      name: 'Dr. Rajesh Sharma, MBBS, MD',
      role: 'DOCTOR',
    },
  });

  const docProfile2 = await prisma.doctorProfile.create({
    data: {
      userId: docUser2.id,
      specialty: 'General Medicine & Preventive Health',
      qualification: 'MBBS, MD - AIIMS New Delhi',
      experienceYears: 9,
      clinicHospital: 'MedCore Health Center',
      languagesSpoken: 'English, Hindi, Tamil',
      consultationModes: 'VIDEO,CHAT',
      consultationFee: 45,
      bio: 'Senior consultant in preventive clinical care and evidence-based telemedicine for chronic conditions.',
    },
  });

  for (let day = 1; day <= 6; day++) {
    await prisma.doctorAvailability.create({
      data: {
        doctorId: docProfile2.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '18:00',
        slotDurationMinutes: 30,
        isActive: true,
      },
    });
  }

  // 3. Create Patient: Alex Mercer
  const patientUser = await prisma.user.create({
    data: {
      email: 'patient@medcore.com',
      password: patientPassword,
      name: 'Alex Mercer',
      role: 'PATIENT',
    },
  });

  const patientProfile = await prisma.patientProfile.create({
    data: {
      userId: patientUser.id,
      dateOfBirth: '1990-05-14',
      gender: 'Male',
      phone: '+1 (555) 234-5678',
      emergencyContact: '+1 (555) 987-6543',
      bloodGroup: 'O+',
      preferredLanguage: 'en',
      allergies: 'Penicillin',
      medicalConditions: 'Mild seasonal allergies',
    },
  });

  // Patient timeline initialization
  await prisma.healthTimelineEvent.create({
    data: {
      patientId: patientProfile.id,
      eventType: 'REPORT',
      title: 'Profile Created',
      summary: 'Patient onboarding completed. Digital health record initialized.',
    },
  });

  // Create an active medication for patient
  const today = new Date().toISOString().split('T')[0];
  const med = await prisma.medication.create({
    data: {
      patientId: patientProfile.id,
      name: 'CoQ10 Cardiovascular Support',
      dosage: '100mg',
      frequency: 'Once daily with morning meal',
      timesOfDay: JSON.stringify(['08:30']),
      startDate: today,
      instructions: 'Take with a glass of water after breakfast.',
      isActive: true,
    },
  });

  // Log today's dose as TAKEN so adherence has a real starting point
  const log = await prisma.medicationLog.create({
    data: {
      medicationId: med.id,
      patientId: patientProfile.id,
      scheduledDate: today,
      scheduledTime: '08:30',
      status: 'TAKEN',
      takenAt: new Date(),
      notes: 'Taken with breakfast',
    },
  });

  await prisma.healthTimelineEvent.create({
    data: {
      patientId: patientProfile.id,
      eventType: 'MEDICATION_LOG',
      title: 'Dose Taken: CoQ10 100mg',
      summary: 'Patient confirmed scheduled morning dose.',
      referenceId: log.id,
    },
  });

  // Welcome notification
  await prisma.notification.create({
    data: {
      userId: patientUser.id,
      type: 'SYSTEM',
      title: 'Welcome to MedCore',
      message: 'Your account is ready. Begin with a contactless webcam screening to establish your baseline.',
      linkUrl: '/dashboard/scan',
    },
  });

  console.log('[MedCore Seed] Seed completed successfully!');
  console.log('--- Clinical Demo Credentials ---');
  console.log('Doctor 1: doctor@medcore.com / Doctor123!');
  console.log('Doctor 2: doctor.rajesh@medcore.com / Doctor123!');
  console.log('Patient:  patient@medcore.com / Patient123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
