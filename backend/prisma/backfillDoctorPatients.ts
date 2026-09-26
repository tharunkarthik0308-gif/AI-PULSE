import prisma from '../src/config/db.js';

async function main() {
  const relationships = await prisma.appointment.findMany({
    select: {
      doctorId: true,
      patientId: true,
    },
    distinct: ['doctorId', 'patientId'],
  });

  console.log(`Found ${relationships.length} doctor-patient relationships.`);

  for (const relationship of relationships) {
    await prisma.doctorPatient.upsert({
      where: {
        doctorId_patientId: {
          doctorId: relationship.doctorId,
          patientId: relationship.patientId,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        doctorId: relationship.doctorId,
        patientId: relationship.patientId,
        isActive: true,
      },
    });
  }

  console.log('Doctor-patient relationships backfilled successfully.');
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });