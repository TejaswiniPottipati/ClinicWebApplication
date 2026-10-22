import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIES, decrypt } from "@/lib/session";
import type { Role } from "@/lib/types";

// Optimistic redirects only. Real authorization happens in the Data Access Layer (lib/dal.ts).
const AREAS: { role: Role; prefix: string; login: string; home: string }[] = [
  { role: "patient", prefix: "/portal", login: "/portal/login", home: "/portal" },
  { role: "doctor", prefix: "/patients", login: "/login", home: "/patients" },
];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const area = AREAS.find((a) => path === a.login || path.startsWith(a.prefix));
  if (!area) return NextResponse.next();

  const session = await decrypt(req.cookies.get(SESSION_COOKIES[area.role])?.value, area.role);

  if (path === area.login) {
    return session ? NextResponse.redirect(new URL(area.home, req.nextUrl)) : NextResponse.next();
  }
  if (!session) return NextResponse.redirect(new URL(area.login, req.nextUrl));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};
