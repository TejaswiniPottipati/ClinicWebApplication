import type {
  Doctor,
  Gender,
  ImagingReport,
  LabFlag,
  LabResult,
  Medication,
  MedicationRoute,
  Message,
  Patient,
  PatientStatus,
  Visit,
} from '../common/types.js';

// Generated demo data: 2 doctors with 20 patients each. Seeds the database (prisma/seed.ts)
// and backs the in-memory repositories used by tests (memory/).

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

const STREETS = [
  'Maple Avenue',
  'Oak Street',
  'Cedar Lane',
  'Elm Drive',
  'Birch Road',
  'Willow Court',
  'Pine Street',
];
const CITIES = [
  'Springfield, IL 62704',
  'Riverside, CA 92501',
  'Madison, WI 53703',
  'Salem, OR 97301',
  'Franklin, TN 37064',
];
const LANGUAGES = [
  'English',
  'English',
  'Spanish',
  'Hindi',
  'English',
  'Mandarin',
  'Arabic',
  'French',
];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend'];
const RADIOLOGISTS = ['Dr. Helen Park', 'Dr. Samuel Brooks'];

type Prescription = Pick<
  Medication,
  'name' | 'dosage' | 'frequency' | 'route' | 'instructions'
>;

interface LabSeries {
  test: string;
  unit: string;
  referenceRange: string;
  /** Results at the previous and the last visit. */
  values: [string, string];
  flags: [LabFlag, LabFlag];
}

interface CareProfile {
  conditions: string[];
  medications: Prescription[];
  /** Stopped at the previous visit; shown as medication history. */
  pastMedications: Prescription[];
  labs: LabSeries[];
  imaging: Omit<ImagingReport, 'id' | 'performedOn' | 'reportedBy'>[];
  visitReason: string;
  visitNotes: string;
}

const rx = (
  name: string,
  dosage: string,
  frequency: string,
  route: MedicationRoute = 'Oral',
  instructions: string | null = null,
): Prescription => ({ name, dosage, frequency, route, instructions });

const hemoglobin = (a: string, b: string): LabSeries => ({
  test: 'Hemoglobin',
  unit: 'g/dL',
  referenceRange: '12.0–17.5',
  values: [a, b],
  flags: ['normal', 'normal'],
});

const PHYSICIAN_PROFILES: CareProfile[] = [
  {
    conditions: ['Hypertension'],
    medications: [rx('Amlodipine', '5 mg', 'Once daily')],
    pastMedications: [rx('Hydrochlorothiazide', '12.5 mg', 'Once daily')],
    labs: [
      {
        test: 'Sodium',
        unit: 'mmol/L',
        referenceRange: '135–145',
        values: ['139', '141'],
        flags: ['normal', 'normal'],
      },
      {
        test: 'Potassium',
        unit: 'mmol/L',
        referenceRange: '3.5–5.1',
        values: ['3.2', '4.2'],
        flags: ['low', 'normal'],
      },
      {
        test: 'Creatinine',
        unit: 'mg/dL',
        referenceRange: '0.6–1.3',
        values: ['1.0', '1.1'],
        flags: ['normal', 'normal'],
      },
    ],
    imaging: [],
    visitReason: 'Blood pressure review',
    visitNotes: 'BP 138/86. Continue current dose, reduce sodium intake.',
  },
  {
    conditions: ['Type 2 diabetes'],
    medications: [
      rx('Metformin', '500 mg', 'Twice daily', 'Oral', 'Take with meals.'),
    ],
    pastMedications: [rx('Glipizide', '5 mg', 'Once daily')],
    labs: [
      {
        test: 'HbA1c',
        unit: '%',
        referenceRange: '< 5.7',
        values: ['7.8', '7.2'],
        flags: ['high', 'high'],
      },
      {
        test: 'Fasting glucose',
        unit: 'mg/dL',
        referenceRange: '70–99',
        values: ['152', '131'],
        flags: ['high', 'high'],
      },
      {
        test: 'eGFR',
        unit: 'mL/min/1.73m²',
        referenceRange: '> 60',
        values: ['88', '85'],
        flags: ['normal', 'normal'],
      },
    ],
    imaging: [],
    visitReason: 'HbA1c follow-up',
    visitNotes: 'HbA1c 7.2%. Reinforced diet plan; recheck in 3 months.',
  },
  {
    conditions: ['Asthma'],
    medications: [
      rx(
        'Salbutamol inhaler',
        '100 mcg',
        'As needed',
        'Inhaled',
        '2 puffs for wheeze; no more than 8 puffs a day.',
      ),
    ],
    pastMedications: [rx('Montelukast', '10 mg', 'Once daily at night')],
    labs: [
      {
        test: 'Eosinophils',
        unit: '×10⁹/L',
        referenceRange: '0.0–0.5',
        values: ['0.7', '0.4'],
        flags: ['high', 'normal'],
      },
      hemoglobin('13.8', '14.1'),
    ],
    imaging: [
      {
        modality: 'X-ray',
        study: 'Chest, PA and lateral',
        findings:
          'Lungs are clear. No consolidation, effusion or pneumothorax. Heart size normal.',
        impression: 'No acute cardiopulmonary abnormality.',
      },
    ],
    visitReason: 'Shortness of breath',
    visitNotes: 'Mild wheeze. Inhaler technique reviewed.',
  },
  {
    conditions: ['Hypothyroidism'],
    medications: [
      rx(
        'Levothyroxine',
        '50 mcg',
        'Once daily',
        'Oral',
        'On an empty stomach, 30 minutes before breakfast.',
      ),
    ],
    pastMedications: [rx('Levothyroxine', '25 mcg', 'Once daily')],
    labs: [
      {
        test: 'TSH',
        unit: 'mIU/L',
        referenceRange: '0.4–4.0',
        values: ['6.8', '2.1'],
        flags: ['high', 'normal'],
      },
      {
        test: 'Free T4',
        unit: 'ng/dL',
        referenceRange: '0.8–1.8',
        values: ['0.7', '1.2'],
        flags: ['low', 'normal'],
      },
    ],
    imaging: [
      {
        modality: 'Ultrasound',
        study: 'Thyroid',
        findings:
          'Mildly heterogeneous echotexture of both lobes. No discrete nodules.',
        impression: 'Consistent with chronic thyroiditis. No nodules.',
      },
    ],
    visitReason: 'Thyroid panel review',
    visitNotes: 'TSH within range. No change to dosage.',
  },
  {
    conditions: ['Hyperlipidemia', 'Hypertension'],
    medications: [
      rx('Atorvastatin', '20 mg', 'Once daily at night'),
      rx('Lisinopril', '10 mg', 'Once daily'),
    ],
    pastMedications: [rx('Simvastatin', '20 mg', 'Once daily at night')],
    labs: [
      {
        test: 'LDL cholesterol',
        unit: 'mg/dL',
        referenceRange: '< 100',
        values: ['162', '118'],
        flags: ['high', 'high'],
      },
      {
        test: 'HDL cholesterol',
        unit: 'mg/dL',
        referenceRange: '> 40',
        values: ['44', '48'],
        flags: ['normal', 'normal'],
      },
      {
        test: 'ALT',
        unit: 'U/L',
        referenceRange: '7–56',
        values: ['31', '34'],
        flags: ['normal', 'normal'],
      },
    ],
    imaging: [],
    visitReason: 'Annual physical',
    visitNotes: 'LDL improved. Encouraged regular exercise.',
  },
];

const SURGEON_PROFILES: CareProfile[] = [
  {
    conditions: ['Post-op: laparoscopic appendectomy'],
    medications: [
      rx('Paracetamol', '1 g', 'Every 6 hours', 'Oral', 'Maximum 4 g a day.'),
    ],
    pastMedications: [rx('Ceftriaxone', '1 g', 'Once daily', 'Intravenous')],
    labs: [
      {
        test: 'White blood cells',
        unit: '×10⁹/L',
        referenceRange: '4.0–11.0',
        values: ['15.2', '8.1'],
        flags: ['high', 'normal'],
      },
      {
        test: 'C-reactive protein',
        unit: 'mg/L',
        referenceRange: '< 10',
        values: ['86', '12'],
        flags: ['critical', 'high'],
      },
      hemoglobin('13.1', '12.6'),
    ],
    imaging: [
      {
        modality: 'CT',
        study: 'Abdomen and pelvis with contrast',
        findings:
          'Dilated, thick-walled appendix (11 mm) with periappendiceal fat stranding. No abscess or free air.',
        impression: 'Acute uncomplicated appendicitis.',
      },
    ],
    visitReason: 'Post-operative check',
    visitNotes: 'Incisions healing well. No signs of infection.',
  },
  {
    conditions: ['Inguinal hernia'],
    medications: [],
    pastMedications: [rx('Ibuprofen', '400 mg', 'As needed')],
    labs: [
      hemoglobin('14.2', '14.0'),
      {
        test: 'Platelets',
        unit: '×10⁹/L',
        referenceRange: '150–400',
        values: ['256', '248'],
        flags: ['normal', 'normal'],
      },
      {
        test: 'INR',
        unit: '',
        referenceRange: '0.8–1.2',
        values: ['1.0', '1.0'],
        flags: ['normal', 'normal'],
      },
    ],
    imaging: [
      {
        modality: 'Ultrasound',
        study: 'Right groin',
        findings:
          'Fat-containing hernia through the right deep inguinal ring on Valsalva, fully reducible.',
        impression: 'Right indirect inguinal hernia, reducible.',
      },
    ],
    visitReason: 'Surgical consultation',
    visitNotes: 'Discussed elective mesh repair. Pre-op labs ordered.',
  },
  {
    conditions: ['Gallstones (cholelithiasis)'],
    medications: [rx('Ursodiol', '300 mg', 'Twice daily')],
    pastMedications: [
      rx('Hyoscine butylbromide', '10 mg', 'Three times daily as needed'),
    ],
    labs: [
      {
        test: 'ALT',
        unit: 'U/L',
        referenceRange: '7–56',
        values: ['88', '52'],
        flags: ['high', 'normal'],
      },
      {
        test: 'Alkaline phosphatase',
        unit: 'U/L',
        referenceRange: '44–147',
        values: ['210', '160'],
        flags: ['high', 'high'],
      },
      {
        test: 'Total bilirubin',
        unit: 'mg/dL',
        referenceRange: '0.1–1.2',
        values: ['1.9', '1.1'],
        flags: ['high', 'normal'],
      },
    ],
    imaging: [
      {
        modality: 'Ultrasound',
        study: 'Abdomen, right upper quadrant',
        findings:
          'Multiple mobile gallstones, the largest 14 mm. Gallbladder wall 3 mm. Common bile duct 4 mm.',
        impression: 'Cholelithiasis without cholecystitis.',
      },
    ],
    visitReason: 'Abdominal pain evaluation',
    visitNotes: 'Ultrasound confirms gallstones. Cholecystectomy scheduled.',
  },
  {
    conditions: ['Post-op: knee arthroscopy'],
    medications: [
      rx('Ibuprofen', '400 mg', 'Three times daily', 'Oral', 'Take with food.'),
    ],
    pastMedications: [rx('Enoxaparin', '40 mg', 'Once daily', 'Subcutaneous')],
    labs: [
      {
        test: 'C-reactive protein',
        unit: 'mg/L',
        referenceRange: '< 10',
        values: ['24', '6'],
        flags: ['high', 'normal'],
      },
      hemoglobin('13.9', '13.5'),
    ],
    imaging: [
      {
        modality: 'MRI',
        study: 'Left knee',
        findings:
          'Complex tear of the posterior horn of the medial meniscus. ACL and PCL intact. Small joint effusion.',
        impression: 'Medial meniscal tear; arthroscopy recommended.',
      },
    ],
    visitReason: 'Wound review',
    visitNotes: 'Range of motion improving. Continue physiotherapy.',
  },
  {
    conditions: ['Lipoma, left shoulder'],
    medications: [],
    pastMedications: [],
    labs: [hemoglobin('14.6', '14.4')],
    imaging: [
      {
        modality: 'Ultrasound',
        study: 'Left shoulder, soft tissue',
        findings:
          'Well-circumscribed, compressible hyperechoic lesion (4.2 cm) in the subcutaneous fat. No internal vascularity.',
        impression: 'Features consistent with a simple lipoma.',
      },
    ],
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

  const id = `P-${1001 + globalIndex}`;
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
  const firstPrescribed = isoDate(
    2025,
    1 + (index % 12),
    1 + ((index * 2) % 28),
  );

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

  const prescribedBy = { id: doctor.id, name: doctor.name };
  const medications: Medication[] = [
    ...profile.medications.map((m) => ({
      ...m,
      status: 'active' as const,
      startedOn: previousVisit,
      endedOn: null,
    })),
    ...profile.pastMedications.map((m) => ({
      ...m,
      status: 'discontinued' as const,
      startedOn: firstPrescribed,
      endedOn: previousVisit,
    })),
  ].map((m, i) => ({ id: `med-${id}-${i + 1}`, ...m, prescribedBy }));

  const labResults: LabResult[] = [lastVisit, previousVisit]
    .flatMap((collectedOn, visit) =>
      profile.labs.map((lab) => ({
        collectedOn,
        test: lab.test,
        // values/flags are [previous, last]; this list is newest first.
        value: lab.values[1 - visit],
        flag: lab.flags[1 - visit],
        unit: lab.unit,
        referenceRange: lab.referenceRange,
      })),
    )
    .map((r, i) => ({ id: `lab-${id}-${i + 1}`, ...r }));

  const imagingReports: ImagingReport[] = profile.imaging.map((report, i) => ({
    id: `img-${id}-${i + 1}`,
    performedOn: previousVisit,
    ...report,
    reportedBy: RADIOLOGISTS[globalIndex % RADIOLOGISTS.length],
  }));

  return {
    id,
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
    address: `${100 + globalIndex * 17} ${STREETS[globalIndex % STREETS.length]}, ${CITIES[globalIndex % CITIES.length]}`,
    preferredLanguage: LANGUAGES[globalIndex % LANGUAGES.length],
    // Not every patient has given one.
    emergencyContact:
      index % 6 === 5
        ? null
        : {
            name: `${FIRST_NAMES[(globalIndex * 7 + 5) % FIRST_NAMES.length]} ${last}`,
            relationship: RELATIONSHIPS[globalIndex % RELATIONSHIPS.length],
            phone: `+1 (555) ${300 + globalIndex}-${2000 + globalIndex * 41}`,
          },
    status: statuses[index % statuses.length],
    conditions: profile.conditions,
    allergies:
      index % 3 === 0 ? [ALLERGIES[globalIndex % ALLERGIES.length]] : [],
    medications,
    labResults,
    imagingReports,
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
