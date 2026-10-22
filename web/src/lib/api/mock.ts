import "server-only";
import type { PatientSummary, User } from "@/lib/types";
import type { ClinicApi } from "./index";
import { DEMO_PASSWORD, doctors, patients } from "./mock-data";

function toSummary(p: (typeof patients)[number]): PatientSummary {
  const { id, name, gender, dateOfBirth, status, conditions, lastVisit, nextAppointment } = p;
  return { id, name, gender, dateOfBirth, status, conditions, lastVisit, nextAppointment };
}

function findUser(email: string): User | undefined {
  const doctor = doctors.find((d) => d.email === email);
  if (doctor) return { id: doctor.id, name: doctor.name, email: doctor.email, role: "doctor" };
  const patient = patients.find((p) => p.email === email);
  if (patient) return { id: patient.id, name: patient.name, email: patient.email, role: "patient" };
}

export const mockApi: ClinicApi = {
  async login(email, password) {
    const user = findUser(email.toLowerCase());
    if (!user || password !== DEMO_PASSWORD) return null;
    return { user, accessToken: `mock-${user.id}` };
  },

  async listPatients(ctx, query = {}) {
    const q = query.q?.trim().toLowerCase();
    return patients
      .filter((p) => p.doctorId === ctx.userId)
      .filter((p) => !query.status || p.status === query.status)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.conditions.some((c) => c.toLowerCase().includes(q)),
      )
      .map(toSummary);
  },

  async getPatient(ctx, id) {
    // A doctor may only open records of patients assigned to them.
    return patients.find((p) => p.id === id && p.doctorId === ctx.userId) ?? null;
  },

  async getCareTeam(ctx) {
    const patient = patients.find((p) => p.id === ctx.userId);
    const doctor = patient && doctors.find((d) => d.id === patient.doctorId);
    if (!patient || !doctor) return null;
    return {
      patient: { id: patient.id, name: patient.name },
      doctor: { id: doctor.id, name: doctor.name, specialty: doctor.specialty },
    };
  },
};
