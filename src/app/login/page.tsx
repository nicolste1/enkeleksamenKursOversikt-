import { redirect } from "next/navigation";

import { LoginButton } from "@/components/auth/LoginButton";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ feil?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const { feil } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Enkeleksamen arbeidsflyt
          </h1>
          <p className="text-muted-foreground text-sm">
            Logg inn med jobbkontoen din for å fortsette.
          </p>
        </div>

        {feil ? (
          <p className="text-destructive text-sm">
            Innloggingen gikk ikke gjennom. Bruk en @enkeleksamen.no-konto og prøv igjen.
          </p>
        ) : null}

        <LoginButton />
      </div>
    </div>
  );
}
