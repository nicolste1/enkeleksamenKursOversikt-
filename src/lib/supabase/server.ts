// Server-side Supabase client. Create a fresh one per request (never share across
// requests) so each render reads the caller's own cookies. Next 16: cookies() is async.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll was called from a Server Component, where cookies are read-only.
            // Safe to ignore: the proxy refreshes the session and writes cookies there.
          }
        },
      },
    },
  );
}
