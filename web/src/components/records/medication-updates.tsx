"use client";

import { useRouter } from "next/navigation";
import { useRealtimeEvent } from "@/components/realtime/realtime-provider";

/** Re-renders the page when the doctor changes a prescription, or after missed events. */
export function MedicationUpdates() {
  const router = useRouter();
  useRealtimeEvent((event) => {
    if (event.type === "medication" || event.type === "reconnected") router.refresh();
  });
  return null;
}
