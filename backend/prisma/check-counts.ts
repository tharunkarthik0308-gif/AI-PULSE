import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('=== MEDCORE DATABASE RECORD AUDIT ===');
  const userCount = await prisma.user.count();
  const patientCount = await prisma.patientProfile.count();
  const doctorCount = await prisma.doctorProfile.count();
  const scanCount = await prisma.scanReport.count();
  const apptCount = await prisma.appointment.count();
  const consultCount = await prisma.consultation.count();
  const rxCount = await prisma.prescription.count();
  const noteCount = await prisma.doctorNote.count();
  const triageCount = await prisma.voiceTriageSession.count();
  const timelineCount = await prisma.healthTimelineEvent.count();
  const auditCount = await prisma.auditLog.count();

  console.log(`Users:                  ${userCount}`);
  console.log(`Patients:               ${patientCount}`);
  console.log(`Doctors:                ${doctorCount}`);
  console.log(`Contactless Scans:      ${scanCount}`);
  console.log(`Appointments:           ${apptCount}`);
  console.log(`Consultations:          ${consultCount}`);
  console.log(`E-Prescriptions:        ${rxCount}`);
  console.log(`Doctor Notes:           ${noteCount}`);
  console.log(`Voice Triage Sessions:  ${triageCount}`);
  console.log(`Health Timeline Events: ${timelineCount}`);
  console.log(`Audit Logs:             ${auditCount}`);

  console.log('\n--- Recent Audit Log Entries ---');
  const recentLogs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10,
  });
  for (const log of recentLogs) {
    console.log(`[${log.timestamp.toISOString()}] Action: ${log.action.padEnd(25)} Resource: ${log.resource.padEnd(20)} ID: ${log.resourceId}`);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
