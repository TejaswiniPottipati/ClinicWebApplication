-- Medication history, lab results, imaging reports and demographics.

-- Until now medications only held seed data (prescribing did not exist), and its integer ids
-- become text ids. Clear it; `npm run db:seed` loads the demo medications again.
DELETE FROM "medications";

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('active', 'discontinued');

-- CreateEnum
CREATE TYPE "MedicationRoute" AS ENUM ('Oral', 'Inhaled', 'Topical', 'Sublingual', 'Subcutaneous', 'Intramuscular', 'Intravenous');

-- CreateEnum
CREATE TYPE "LabFlag" AS ENUM ('normal', 'low', 'high', 'critical');

-- CreateEnum
CREATE TYPE "ImagingModality" AS ENUM ('X-ray', 'CT', 'MRI', 'Ultrasound');

-- DropIndex
DROP INDEX "medications_patient_id_idx";

-- AlterTable
ALTER TABLE "medications" DROP CONSTRAINT "medications_pkey",
ADD COLUMN     "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ended_on" DATE,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "prescribed_by_id" TEXT NOT NULL,
ADD COLUMN     "route" "MedicationRoute" NOT NULL,
ADD COLUMN     "status" "MedicationStatus" NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "medications_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "medications_id_seq";

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "address" TEXT,
ADD COLUMN     "emergency_contact_name" TEXT,
ADD COLUMN     "emergency_contact_phone" TEXT,
ADD COLUMN     "emergency_contact_relationship" TEXT,
ADD COLUMN     "preferred_language" TEXT;

-- CreateTable
CREATE TABLE "lab_results" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "collected_on" DATE NOT NULL,
    "test" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "reference_range" TEXT NOT NULL,
    "flag" "LabFlag" NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imaging_reports" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "performed_on" DATE NOT NULL,
    "modality" "ImagingModality" NOT NULL,
    "study" TEXT NOT NULL,
    "findings" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "reported_by" TEXT NOT NULL,

    CONSTRAINT "imaging_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lab_results_patient_id_collected_on_idx" ON "lab_results"("patient_id", "collected_on");

-- CreateIndex
CREATE INDEX "imaging_reports_patient_id_performed_on_idx" ON "imaging_reports"("patient_id", "performed_on");

-- CreateIndex
CREATE INDEX "medications_patient_id_status_idx" ON "medications"("patient_id", "status");

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_prescribed_by_id_fkey" FOREIGN KEY ("prescribed_by_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imaging_reports" ADD CONSTRAINT "imaging_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

