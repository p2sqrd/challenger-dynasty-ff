"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

interface Step {
  title: string;
  body: string;
  image?: string;
}

const STEPS: Step[] = [
  {
    title: "Welcome to Challenger Dynasty",
    body: "Your league's home base — keepers, trades, budgets, player auctions, and a healthy amount of trash talk. Here's the quick tour.",
  },
  {
    title: "Keepers",
    body: "Pick the players you're carrying into the auction before the deadline. The budget tower fills up as you add them, and you can keep editing right until the deadline locks everyone in.",
    image: "/onboarding/keepers.png",
  },
  {
    title: "Budget & Trades",
    body: "Every manager's auction budget and each trade that's moved it, all in one place. Trades run through the commissioner, who settles the cash here.",
    image: "/onboarding/budget.png",
  },
  {
    title: "Fire Sale",
    body: "Put one of your players on the block — private sealed bids or a live public auction. The $125/$275 rule caps every bid automatically, and you have the final say on the winner.",
    image: "/onboarding/fire-sale.png",
  },
  {
    title: "Trash Talk & the 🔔",
    body: "Post the worst trade offers you've been sent to the wall of shame. And the bell up top keeps you posted on deadlines, new Fire Sales, and fresh trash talk.",
    image: "/onboarding/trash-talk.png",
  },
];

// true on the client, false during SSR — lets us portal only after hydration
// (no setState-in-effect).
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function OnboardingLauncher({ autoOpen }: { autoOpen: boolean }) {
  const mounted = useMounted();
  const [open, setOpen] = useState(autoOpen);
  const [step, setStep] = useState(0);

  function launch() {
    setStep(0);
    setOpen(true);
  }

  function finish() {
    setOpen(false);
    fetch("/api/onboarding/complete", { method: "POST" }).catch(() => {});
  }

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={finish}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-line bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {s.image && (
          <div className="border-b border-line bg-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.image}
              alt=""
              className="max-h-72 w-full object-cover object-top"
            />
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="nameplate-type text-xl text-ink">{s.title}</h2>
            <button onClick={finish} className="text-sm text-muted hover:text-ink">
              Skip
            </button>
          </div>
          <p className="mt-2 text-sm text-muted">{s.body}</p>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === step ? "bg-brand" : "bg-line"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep((v) => v - 1)}
                  className="rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-2"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => (last ? finish() : setStep((v) => v + 1))}
                className="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-[var(--color-brand-ink)]"
              >
                {last ? "Got it" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={launch}
        aria-label="How this works"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-sm text-muted transition-colors hover:text-ink"
      >
        ?
      </button>
      {open && mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
