const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

// Dates are stored without a zone; treat them as clinic-local and format in UTC so they don't shift.
function parse(iso: string) {
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : `${iso}Z`);
}

export function formatDate(iso: string) {
  return dateFmt.format(parse(iso));
}

export function formatDateTime(iso: string) {
  return dateTimeFmt.format(parse(iso));
}

export function ageFrom(dateOfBirth: string, now = new Date()) {
  const dob = parse(dateOfBirth);
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

/** Chat timestamps: full ISO datetimes, shown in the viewer's own time zone. */
export function formatMessageTime(iso: string, now = new Date()) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === now.toDateString();
  return d.toLocaleString("en-US", {
    ...(sameDay ? {} : { month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "4:05" or "1:02:09". */
export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function initials(name: string) {
  return name
    .replace(/^Dr\.\s*/, "")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
