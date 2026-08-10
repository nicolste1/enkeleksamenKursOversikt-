// Session refresh on every matched request. Next 16 renamed the `middleware`
// convention to `proxy` (node runtime); this is the Supabase SSR refresh pattern
// ported to it. Keep it minimal: do not run logic between createServerClient and
// getUser(), or you risk hard-to-debug random logouts.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refreshes the auth token and writes it back via setAll when needed.
  try {
    await supabase.auth.getUser();
  } catch {
    // Supabase unreachable — don't 500 every request; proceed without a refresh.
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and image files. Route protection
    // itself lives in the (app) layout, not here.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
