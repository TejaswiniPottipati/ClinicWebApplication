import type {
  Call,
  Doctor,
  ImagingModality,
  Medication,
  Message,
  Patient,
  PatientStatus,
} from '../../common/types.js';
import {
  ImagingModality as DbImagingModality,
  PatientStatus as DbPatientStatus,
  type Prisma,
} from '../../generated/prisma/client.js';

// Conversions between database rows and the API's domain types (common/types.ts).

/** `@db.Date` columns ↔ "YYYY-MM-DD". Prisma reads and writes them as UTC midnight. */
export const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);
export const fromDate = (d: Date) => d.toISOString().slice(0, 10);

/** `@db.Timestamp` (no time zone) ↔ "YYYY-MM-DDTHH:mm:ss" clinic-local time. Stored as if UTC. */
export const toLocalDateTime = (s: string) => new Date(`${s}Z`);
export const fromLocalDateTime = (d: Date) => d.toISOString().slice(0, 19);

const optionalIso = (d: Date | null) => (d ? d.toISOString() : undefined);

// Postgres enum labels can contain "-", Prisma enum names can't; the schema maps between them.
const STATUS_TO_DB: Record<PatientStatus, DbPatientStatus> = {
  Stable: DbPatientStatus.Stable,
  'Follow-up': DbPatientStatus.FollowUp,
  Critical: DbPatientStatus.Critical,
  'Post-op': DbPatientStatus.PostOp,
};
const STATUS_FROM_DB = Object.fromEntries(
  Object.entries(STATUS_TO_DB).map(([api, db]) => [db, api]),
) as Record<DbPatientStatus, PatientStatus>;

export const toDbStatus = (s: PatientStatus) => STATUS_TO_DB[s];

const MODALITY_TO_DB: Record<ImagingModality, DbImagingModality> = {
  'X-ray': DbImagingModality.XRay,
  CT: DbImagingModality.CT,
  MRI: DbImagingModality.MRI,
  Ultrasound: DbImagingModality.Ultrasound,
};
const MODALITY_FROM_DB = Object.fromEntries(
  Object.entries(MODALITY_TO_DB).map(([api, db]) => [db, api]),
) as Record<DbImagingModality, ImagingModality>;

export const toDbModality = (m: ImagingModality) => MODALITY_TO_DB[m];

// ---- Doctors & patients ------------------------------------------------------------

export const doctorInclude = { user: true } satisfies Prisma.DoctorInclude;

export function toDoctor(
  row: Prisma.DoctorGetPayload<{ include: typeof doctorInclude }>,
): Doctor {
  return {
    id: row.id,
    name: row.user.name,
    email: row.user.email,
    role: 'doctor',
    specialty: row.specialty,
  };
}

export const medicationInclude = {
  prescribedBy: { select: { id: true, user: { select: { name: true } } } },
} satisfies Prisma.MedicationInclude;

/** Active first, newest started first; then history, most recently stopped first. */
export const medicationOrder = [
  { status: 'asc' }, // enum order: active, discontinued
  { endedOn: 'desc' },
  { startedOn: 'desc' },
  { createdAt: 'desc' },
  { id: 'asc' },
] satisfies Prisma.MedicationOrderByWithRelationInput[];

export function toMedication(
  row: Prisma.MedicationGetPayload<{ include: typeof medicationInclude }>,
): Medication {
  return {
    id: row.id,
    name: row.name,
    dosage: row.dosage,
    frequency: row.frequency,
    route: row.route,
    instructions: row.instructions,
    status: row.status,
    startedOn: fromDate(row.startedOn),
    endedOn: row.endedOn ? fromDate(row.endedOn) : null,
    prescribedBy: { id: row.prescribedBy.id, name: row.prescribedBy.user.name },
  };
}

export const patientInclude = {
  // Not the whole user row: that would load the password hash with every record.
  user: { select: { name: true, email: true } },
  conditions: { orderBy: { id: 'asc' } },
  allergies: { orderBy: { id: 'asc' } },
  medications: { include: medicationInclude, orderBy: medicationOrder },
  labResults: { orderBy: [{ collectedOn: 'desc' }, { id: 'asc' }] },
  imagingReports: { orderBy: [{ performedOn: 'desc' }, { id: 'asc' }] },
  visits: { orderBy: { date: 'desc' } },
} satisfies Prisma.PatientInclude;

export function toPatient(
  row: Prisma.PatientGetPayload<{ include: typeof patientInclude }>,
): Patient {
  return {
    id: row.id,
    doctorId: row.doctorId,
    name: row.user.name,
    email: row.user.email,
    phone: row.phone,
    gender: row.gender,
    dateOfBirth: fromDate(row.dateOfBirth),
    bloodType: row.bloodType,
    address: row.address,
    preferredLanguage: row.preferredLanguage,
    emergencyContact: row.emergencyContactName
      ? {
          name: row.emergencyContactName,
          relationship: row.emergencyContactRelationship ?? '',
          phone: row.emergencyContactPhone ?? '',
        }
      : null,
    status: STATUS_FROM_DB[row.status],
    conditions: row.conditions.map((c) => c.name),
    allergies: row.allergies.map((a) => a.name),
    medications: row.medications.map(toMedication),
    labResults: row.labResults.map((r) => ({
      id: r.id,
      collectedOn: fromDate(r.collectedOn),
      test: r.test,
      value: r.value,
      unit: r.unit,
      referenceRange: r.referenceRange,
      flag: r.flag,
    })),
    imagingReports: row.imagingReports.map((r) => ({
      id: r.id,
      performedOn: fromDate(r.performedOn),
      modality: MODALITY_FROM_DB[r.modality],
      study: r.study,
      findings: r.findings,
      impression: r.impression,
      reportedBy: r.reportedBy,
    })),
    visits: row.visits.map((v) => ({
      date: fromDate(v.date),
      reason: v.reason,
      notes: v.notes,
    })),
    lastVisit: fromDate(row.lastVisit),
    nextAppointment: row.nextAppointment
      ? fromLocalDateTime(row.nextAppointment)
      : null,
  };
}

// ---- Calls & messages ---------------------------------------------------------------

const nameOnly = { select: { user: { select: { name: true } } } } as const;

export const callInclude = {
  doctor: nameOnly,
  patient: nameOnly,
} satisfies Prisma.CallInclude;

export function toCall(
  row: Prisma.CallGetPayload<{ include: typeof callInclude }>,
): Call {
  return {
    id: row.id,
    doctorId: row.doctorId,
    patientId: row.patientId,
    doctorName: row.doctor.user.name,
    patientName: row.patient.user.name,
    kind: row.kind,
    status: row.status,
    endReason: row.endReason ?? undefined,
    createdAt: row.createdAt.toISOString(),
    answeredAt: optionalIso(row.answeredAt),
    endedAt: optionalIso(row.endedAt),
  };
}

export const messageInclude = { call: true } satisfies Prisma.MessageInclude;

export function toMessage(
  row: Prisma.MessageGetPayload<{ include: typeof messageInclude }>,
): Message {
  const message: Message = {
    id: row.id,
    patientId: row.patientId,
    doctorId: row.doctorId,
    sender: row.sender,
    body: row.body,
    sentAt: row.sentAt.toISOString(),
  };
  if (row.call) {
    message.call = {
      id: row.call.id,
      kind: row.call.kind,
      endReason: row.call.endReason ?? undefined,
      answeredAt: optionalIso(row.call.answeredAt),
      endedAt: optionalIso(row.call.endedAt),
    };
  }
  return message;
}
