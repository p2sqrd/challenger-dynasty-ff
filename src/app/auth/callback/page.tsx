"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Magic-link landing page. Primary sign-in is the 6-digit code on /login
 * (works on any device); this page is the fallback for anyone who clicks the
 * link in the email instead. `@supabase/ssr` uses the PKCE flow, so the link
 * comes back as `?code=…` and we exchange it for a session — this only works
 * in the same browser that requested it (the code verifier lives there), so a
 * failure here just points people back to the code form. We also read the
 * older implicit `#access_token` hash for safety.
 */
export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fail = (message: string) => {
      if (!cancelled) setError(message);
    };

    (async () => {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      // An error can come back on either the query or the hash.
      const errorDescription =
        query.get("error_description") || hash.get("error_description");
      if (errorDescription) return fail(errorDescription);

      const supabase = createClient();

      // PKCE flow (what @supabase/ssr actually uses): exchange the code.
      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return fail(error.message);
        window.location.replace("/");
        return;
      }

      // Implicit flow fallback: tokens carried in the URL hash.
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) return fail(error.message);
        window.location.replace("/");
        return;
      }

      fail("This sign-in link is invalid or has expired.");
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
          <p className="text-sm text-muted">
            The most reliable way in is the 6-digit code — request one and enter
            it on the sign-in page.
          </p>
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
