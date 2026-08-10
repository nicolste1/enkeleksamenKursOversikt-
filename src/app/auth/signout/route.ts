// Sign out server-side so the auth cookies are actually cleared, then redirect to
// login. Posted to by the LogoutButton form.
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Best-effort CSRF guard: ignore explicit cross-site form posts so a third-party
  // page can't force-log-out the user. Same-origin/none/absent all proceed.
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 so the browser follows with a GET.
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
