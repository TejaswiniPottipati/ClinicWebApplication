import type {
  Doctor,
  Gender,
  Medication,
  Message,
  Patient,
  PatientStatus,
  Visit,
} from '../common/types.js';

// Generated demo data: 2 doctors with 20 patients each. Loaded by the in-memory repositories;
// becomes the database seed later.

/** Every demo account (doctors and patients) uses this password. Stored only as a hash. */
export const DEMO_PASSWORD = 'Password123!';

export const doctors: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Anita Rao',
    email: 'physician@clinic.test',
    role: 'doctor',
    specialty: 'Physician',
  },
  {
    id: 'doc-2',
    name: 'Dr. Daniel Okafor',
    email: 'surgeon@clinic.test',
    role: 'doctor',
    specialty: 'Surgeon',
  },
];

const FIRST_NAMES = [
  'Aarav',
  'Maya',
  'Liam',
  'Sofia',
  'Noah',
  'Priya',
  'Ethan',
  'Zara',
  'Lucas',
  'Amara',
  'Mateo',
  'Hana',
  'Oliver',
  'Leila',
  'Kai',
  'Nora',
  'Arjun',
  'Chloe',
  'Diego',
  'Ines',
];

const LAST_NAMES = [
  'Sharma',
  'Johnson',
  'Chen',
  'Garcia',
  'Patel',
  'Nguyen',
  'Brown',
  'Kim',
  'Silva',
  'Müller',
  'Haddad',
  'Kowalski',
  'Tanaka',
  'Reyes',
  'Okeke',
  'Larsen',
  'Iyer',
  'Dubois',
  'Moreno',
  'Ali',
];

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const GENDERS: Gender[] = ['Female', 'Male', 'Female', 'Male', 'Other'];
const ALLERGIES = [
  'Penicillin',
  'Peanuts',
  'Latex',
  'Sulfa drugs',
  'Shellfish',
  'Aspirin',
];

interface CareProfile {
  conditions: string[];
  medications: Omit<Medication, 'startedOn'>[];
  visitReason: string;
  visitNotes: string;
}

const PHYSICIAN_PROFILES: CareProfile[] = [
  {
    conditions: ['Hypertension'],
    medications: [
      { name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily' },
    ],
    visitReason: 'Blood pressure review',
    visitNotes: 'BP 138/86. Continue current dose, reduce sodium intake.',
  },
  {
    conditions: ['Type 2 diabetes'],
    medications: [
      { name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily' },
    ],
    visitReason: 'HbA1c follow-up',
    visitNotes: 'HbA1c 7.2%. Reinforced diet plan; recheck in 3 months.',
  },
  {
    conditions: ['Asthma'],
    medications: [
      { name: 'Salbutamol inhaler', dosage: '100 mcg', frequency: 'As needed' },
    ],
    visitReason: 'Shortness of breath',
    visitNotes: 'Mild wheeze. Inhaler technique reviewed.',
  },
  {
    conditions: ['Hypothyroidism'],
    medications: [
      { name: 'Levothyroxine', dosage: '50 mcg', frequency: 'Once daily' },
    ],
    visitReason: 'Thyroid panel review',
    visitNotes: 'TSH within range. No change to dosage.',
  },
  {
    conditions: ['Hyperlipidemia', 'Hypertension'],
    medications: [
      {
        name: 'Atorvastatin',
        dosage: '20 mg',
        frequency: 'Once daily at night',
      },
      { name: 'Lisinopril', dosage: '10 mg', frequency: 'Once daily' },
    ],
    visitReason: 'Annual physical',
    visitNotes: 'LDL improved. Encouraged regular exercise.',
  },
];

const SURGEON_PROFILES: CareProfile[] = [
  {
    conditions: ['Post-op: laparoscopic appendectomy'],
    medications: [
      { name: 'Paracetamol', dosage: '1 g', frequency: 'Every 6 hours' },
    ],
    visitReason: 'Post-operative check',
    visitNotes: 'Incisions healing well. No signs of infection.',
  },
  {
    conditions: ['Inguinal hernia'],
    medications: [],
    visitReason: 'Surgical consultation',
    visitNotes: 'Discussed elective mesh repair. Pre-op labs ordered.',
  },
  {
    conditions: ['Gallstones (cholelithiasis)'],
    medications: [
      { name: 'Ursodiol', dosage: '300 mg', frequency: 'Twice daily' },
    ],
    visitReason: 'Abdominal pain evaluation',
    visitNotes: 'Ultrasound confirms gallstones. Cholecystectomy scheduled.',
  },
  {
    conditions: ['Post-op: knee arthroscopy'],
    medications: [
      { name: 'Ibuprofen', dosage: '400 mg', frequency: 'Three times daily' },
    ],
    visitReason: 'Wound review',
    visitNotes: 'Range of motion improving. Continue physiotherapy.',
  },
  {
    conditions: ['Lipoma, left shoulder'],
    medications: [],
    visitReason: 'Excision planning',
    visitNotes: 'Benign appearance. Excision under local anaesthetic planned.',
  },
];

const PHYSICIAN_STATUSES: PatientStatus[] = [
  'Stable',
  'Stable',
  'Follow-up',
  'Stable',
  'Critical',
];
const SURGEON_STATUSES: PatientStatus[] = [
  'Post-op',
  'Follow-up',
  'Stable',
  'Post-op',
  'Critical',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function buildPatient(
  doctor: Doctor,
  index: number,
  globalIndex: number,
): Patient {
  const surgeon = doctor.specialty === 'Surgeon';
  const profiles = surgeon ? SURGEON_PROFILES : PHYSICIAN_PROFILES;
  const statuses = surgeon ? SURGEON_STATUSES : PHYSICIAN_STATUSES;
  const profile = profiles[index % profiles.length];

  const first = FIRST_NAMES[(globalIndex * 7) % FIRST_NAMES.length];
  // Offset by doctor so the two patient lists never share a full name.
  const last =
    LAST_NAMES[
      (globalIndex * 3 + 1 + Math.floor(globalIndex / 20)) % LAST_NAMES.length
    ];
  const name = `${first} ${last}`;

  const birthYear = 1950 + ((globalIndex * 13) % 55);
  const lastVisit = isoDate(2026, 9 + (index % 2), 1 + ((index * 5) % 28));
  const previousVisit = isoDate(2026, 5 + (index % 3), 1 + ((index * 3) % 28));

  const visits: Visit[] = [
    { date: lastVisit, reason: profile.visitReason, notes: profile.visitNotes },
    {
      date: previousVisit,
      reason: surgeon ? 'Initial referral' : 'Routine check-up',
      notes: surgeon
        ? 'Referred by primary care. Imaging requested.'
        : 'Vitals normal. Routine bloodwork ordered.',
    },
  ];

  const hasAppointment = index % 4 !== 3;
  const nextAppointment = hasAppointment
    ? `${isoDate(2026, 10 + (index % 2), 1 + ((index * 7) % 28))}T${pad(9 + (index % 8))}:${index % 2 ? '30' : '00'}:00`
    : null;

  return {
    id: `P-${1001 + globalIndex}`,
    doctorId: doctor.id,
    name,
    email:
      `${first}.${last}`
        .normalize('NFD')
        .toLowerCase()
        .replace(/[^a-z.]/g, '') + '@mail.test',
    phone: `+1 (555) ${200 + globalIndex}-${1000 + globalIndex * 37}`,
    gender: GENDERS[globalIndex % GENDERS.length],
    dateOfBirth: isoDate(
      birthYear,
      1 + (globalIndex % 12),
      1 + ((globalIndex * 11) % 28),
    ),
    bloodType: BLOOD_TYPES[globalIndex % BLOOD_TYPES.length],
    status: statuses[index % statuses.length],
    conditions: profile.conditions,
    allergies:
      index % 3 === 0 ? [ALLERGIES[globalIndex % ALLERGIES.length]] : [],
    medications: profile.medications.map((m) => ({
      ...m,
      startedOn: previousVisit,
    })),
    visits,
    lastVisit,
    nextAppointment,
  };
}

export const patients: Patient[] = doctors.flatMap((doctor, d) =>
  Array.from({ length: 20 }, (_, i) => buildPatient(doctor, i, d * 20 + i)),
);

/** Each conversation starts with a welcome message from the patient's doctor. */
export const messages: Message[] = patients.map((patient) => {
  const doctor = doctors.find((d) => d.id === patient.doctorId)!;
  return {
    id: `msg-welcome-${patient.id}`,
    patientId: patient.id,
    doctorId: doctor.id,
    sender: 'doctor',
    body: `Hi ${patient.name.split(' ')[0]}, this is ${doctor.name}. You can message me here with any questions about your care.`,
    sentAt: '2026-10-01T09:00:00.000Z',
  };
});
