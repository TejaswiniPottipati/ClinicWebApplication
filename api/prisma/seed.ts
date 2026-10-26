import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/common/password.js';
import {
  toDate,
  toDbModality,
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
// records are reset to the demo values; messages and prescriptions added since are kept.
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
        address: p.address,
        preferredLanguage: p.preferredLanguage,
        emergencyContactName: p.emergencyContact?.name ?? null,
        emergencyContactRelationship: p.emergencyContact?.relationship ?? null,
        emergencyContactPhone: p.emergencyContact?.phone ?? null,
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

    // Conditions, allergies and visits are replaced wholesale.
    const patientId = { in: patients.map((p) => p.id) };
    await tx.condition.deleteMany({ where: { patientId } });
    await tx.allergy.deleteMany({ where: { patientId } });
    await tx.visit.deleteMany({ where: { patientId } });

    // Medications, labs and imaging: only the demo rows (by id), so new prescriptions survive.
    const meds = patients.flatMap((p) => p.medications.map((m) => ({ p, m })));
    const labs = patients.flatMap((p) => p.labResults.map((r) => ({ p, r })));
    const imaging = patients.flatMap((p) =>
      p.imagingReports.map((r) => ({ p, r })),
    );
    const ids = (rows: { id: string }[]) => ({ in: rows.map((r) => r.id) });
    await tx.medication.deleteMany({
      where: { id: ids(meds.map((x) => x.m)) },
    });
    await tx.labResult.deleteMany({ where: { id: ids(labs.map((x) => x.r)) } });
    await tx.imagingReport.deleteMany({
      where: { id: ids(imaging.map((x) => x.r)) },
    });

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
      data: meds.map(({ p, m }) => ({
        id: m.id,
        patientId: p.id,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route,
        instructions: m.instructions,
        status: m.status,
        startedOn: toDate(m.startedOn),
        endedOn: m.endedOn ? toDate(m.endedOn) : null,
        prescribedById: m.prescribedBy.id,
      })),
    });
    await tx.labResult.createMany({
      data: labs.map(({ p, r }) => ({
        id: r.id,
        patientId: p.id,
        collectedOn: toDate(r.collectedOn),
        test: r.test,
        value: r.value,
        unit: r.unit,
        referenceRange: r.referenceRange,
        flag: r.flag,
      })),
    });
    await tx.imagingReport.createMany({
      data: imaging.map(({ p, r }) => ({
        id: r.id,
        patientId: p.id,
        performedOn: toDate(r.performedOn),
        modality: toDbModality(r.modality),
        study: r.study,
        findings: r.findings,
        impression: r.impression,
        reportedBy: r.reportedBy,
      })),
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
