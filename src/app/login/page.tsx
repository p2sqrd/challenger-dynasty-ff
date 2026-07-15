"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setStatus("idle");
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setStatus("idle");
      setErrorMessage(error.message);
      return;
    }
    // Session is now in cookies; hard-navigate so the server sees it.
    window.location.replace("/");
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
            {step === "email"
              ? "Sign in with the email your commissioner has on file."
              : `Enter the 6-digit code we sent to ${email}.`}
          </p>
        </div>
      </div>

      {step === "email" ? (
        <form onSubmit={requestCode} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "working"}
            className="rounded-md bg-brand px-3 py-2.5 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
          >
            {status === "working" ? "Sending…" : "Send login code"}
          </button>
          {errorMessage && (
            <p className="text-sm text-rejected">{errorMessage}</p>
          )}
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="tabular rounded-md border border-line bg-surface px-3 py-2.5 text-center text-lg tracking-[0.4em] text-ink placeholder:tracking-normal placeholder:text-muted focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "working" || code.length < 6}
            className="rounded-md bg-brand px-3 py-2.5 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
          >
            {status === "working" ? "Verifying…" : "Verify & sign in"}
          </button>
          {errorMessage && (
            <p className="text-sm text-rejected">{errorMessage}</p>
          )}
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setErrorMessage("");
            }}
            className="text-center text-xs text-muted hover:text-ink"
          >
            Use a different email
          </button>
        </form>
      )}
    </main>
  );
}
