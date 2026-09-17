import { cookies } from "next/headers";
import { SITZUNGS_COOKIE } from "@/lib/sitzung";

export const dynamic = "force-dynamic";

/** Abmelden per Link; löscht das Sitzungs-Cookie. */
export async function GET(request: Request) {
  (await cookies()).delete(SITZUNGS_COOKIE);
  return Response.redirect(new URL("/login", request.url), 302);
}
