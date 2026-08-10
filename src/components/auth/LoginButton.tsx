"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser redirects to Google; only reset on error.
    if (error) setLoading(false);
  }

  return (
    <Button onClick={signIn} disabled={loading} size="lg">
      {loading ? "Sender deg til Google …" : "Logg inn med Google"}
    </Button>
  );
}
