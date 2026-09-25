import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean() {
  console.log('[MedCore Database] Cleaning all records to ensure a completely pristine state...');
  await prisma.auditLog.deleteMany();
  await prisma.voiceTriageSession.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.screeningMeasurement.deleteMany();
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
  console.log('[MedCore Database] All tables are completely empty and ready for authentic user interactions.');
}

clean()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
