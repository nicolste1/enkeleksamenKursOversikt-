// OAuth callback: exchange the authorization code for a session cookie, then
// send the user on to where they were headed (default the app root).
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow a same-origin relative path, or `next` could be an open redirect
  // (e.g. `@evil.com/`, `//evil.com`). Anything else falls back to the app root.
  const nextParam = searchParams.get("next");
  const next =
    nextParam &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//") &&
    !nextParam.startsWith("/\\")
      ? nextParam
      : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing code or exchange failed (e.g. domain restriction rejected the user).
  return NextResponse.redirect(`${origin}/login?feil=auth`);
}
