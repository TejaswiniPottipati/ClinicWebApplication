import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/common/password.js';
import {
  toDate,
  toDbStatus,
  toLocalDateTime,
} from '../src/data/prisma/mappers.js';
import {
  DEMO_PASSWORD,
  doctors,
  messages,
  patients,
} from '../src/data/mock-data.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Loads the demo clinic (src/data/mock-data.ts) into the database. Safe to re-run: accounts and
// records are reset to the demo values, and conversations keep any messages sent since.
// Runs after `prisma migrate reset` / `migrate dev`, or on its own with `npm run db:seed`.

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await prisma.$transaction(async (tx) => {
    for (const d of doctors) {
      const user = { email: d.email, name: d.name, role: d.role, passwordHash };
      await tx.user.upsert({
        where: { id: d.id },
        create: { id: d.id, ...user },
        update: user,
      });
      await tx.doctor.upsert({
        where: { id: d.id },
        create: { id: d.id, specialty: d.specialty },
        update: { specialty: d.specialty },
      });
    }

    for (const p of patients) {
      const user = {
        email: p.email,
        name: p.name,
        role: 'patient' as const,
        passwordHash,
      };
      const record = {
        doctorId: p.doctorId,
        phone: p.phone,
        gender: p.gender,
        dateOfBirth: toDate(p.dateOfBirth),
        bloodType: p.bloodType,
        status: toDbStatus(p.status),
        lastVisit: toDate(p.lastVisit),
        nextAppointment: p.nextAppointment
          ? toLocalDateTime(p.nextAppointment)
          : null,
      };
      await tx.user.upsert({
        where: { id: p.id },
        create: { id: p.id, ...user },
        update: user,
      });
      await tx.patient.upsert({
        where: { id: p.id },
        create: { id: p.id, ...record },
        update: record,
      });
    }

    // Child records are replaced wholesale.
    const patientId = { in: patients.map((p) => p.id) };
    await tx.condition.deleteMany({ where: { patientId } });
    await tx.allergy.deleteMany({ where: { patientId } });
    await tx.medication.deleteMany({ where: { patientId } });
    await tx.visit.deleteMany({ where: { patientId } });

    await tx.condition.createMany({
      data: patients.flatMap((p) =>
        p.conditions.map((name) => ({ patientId: p.id, name })),
      ),
    });
    await tx.allergy.createMany({
      data: patients.flatMap((p) =>
        p.allergies.map((name) => ({ patientId: p.id, name })),
      ),
    });
    await tx.medication.createMany({
      data: patients.flatMap((p) =>
        p.medications.map((m) => ({
          patientId: p.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          startedOn: toDate(m.startedOn),
        })),
      ),
    });
    await tx.visit.createMany({
      data: patients.flatMap((p) =>
        p.visits.map((v) => ({
          patientId: p.id,
          date: toDate(v.date),
          reason: v.reason,
          notes: v.notes,
        })),
      ),
    });

    // Welcome messages; existing conversations are left alone.
    await tx.message.createMany({
      data: messages.map((m) => ({
        id: m.id,
        patientId: m.patientId,
        doctorId: m.doctorId,
        sender: m.sender,
        body: m.body,
        sentAt: new Date(m.sentAt),
      })),
      skipDuplicates: true,
    });
  });

  console.log(
    `Seeded ${doctors.length} doctors and ${patients.length} patients (password: ${DEMO_PASSWORD}).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
