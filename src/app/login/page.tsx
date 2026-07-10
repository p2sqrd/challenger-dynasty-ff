"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-8 w-1.5 rounded-sm bg-brand" />
        <div>
          <h1 className="nameplate-type text-2xl leading-none text-ink">
            Challenger Dynasty
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Sign in with the email your commissioner has on file.
          </p>
        </div>
      </div>

      {status === "sent" ? (
        <div className="flex items-center gap-2 rounded-md border border-line bg-surface p-4 text-sm text-approved">
          <span className="inline-block h-2 w-2 rounded-full bg-approved" />
          Check your inbox for a magic link.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-md bg-brand px-3 py-2.5 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {status === "error" && (
            <p className="text-sm text-rejected">{errorMessage}</p>
          )}
        </form>
      )}
    </main>
  );
}
