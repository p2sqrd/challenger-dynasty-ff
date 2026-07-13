"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Magic-link landing page (implicit flow). Supabase's default email link
 * verifies server-side and redirects here with the session tokens in the URL
 * hash (#access_token=…&refresh_token=…). We read them, persist the session
 * (into cookies, so server components see it), and send the user in. Because
 * the tokens are minted at click time and carried in the link itself, this
 * works from any device or email client — no browser-side secret required.
 */
export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fail = (message: string) => {
      if (!cancelled) setError(message);
    };

    (async () => {
      const params = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const errorDescription = params.get("error_description");

      if (errorDescription) return fail(errorDescription);
      if (!accessToken || !refreshToken) {
        return fail("This sign-in link is invalid or has expired.");
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) return fail(error.message);

      // Hard navigation so the server picks up the freshly set auth cookie.
      window.location.replace("/");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      {error ? (
        <>
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-8 w-1.5 rounded-sm bg-brand" />
            <h1 className="nameplate-type text-2xl leading-none text-ink">
              Challenger Dynasty
            </h1>
          </div>
          <p className="text-sm text-rejected">{error}</p>
          <a href="/login" className="text-sm text-brand hover:underline">
            Back to sign in
          </a>
        </>
      ) : (
        <p className="text-sm text-muted">Signing you in…</p>
      )}
    </main>
  );
}
