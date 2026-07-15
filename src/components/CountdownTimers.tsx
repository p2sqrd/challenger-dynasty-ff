"use client";

import { useSyncExternalStore } from "react";

interface Timer {
  label: string;
  /** ISO 8601 string with offset, or null when the date is still TBD. */
  target: string | null;
}

// A single shared 1s clock, read through useSyncExternalStore so the ticking
// current-time stays lint-clean (no setState-in-effect, no impure Date.now in
// render) and SSR renders a stable placeholder until the client hydrates.
let currentNow = Date.now();
function subscribe(callback: () => void) {
  const id = setInterval(() => {
    currentNow = Date.now();
    callback();
  }, 1000);
  return () => clearInterval(id);
}
function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => currentNow,
    () => null
  );
}

function diffParts(target: number, now: number) {
  const ms = Math.max(0, target - now);
  const totalSeconds = Math.floor(ms / 1000);
  return {
    done: ms === 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function Cell({ value, unit }: { value: number | null; unit: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="tabular text-4xl font-semibold leading-none text-ink sm:text-5xl">
        {value === null ? "––" : String(value).padStart(2, "0")}
      </span>
      <span className="mt-1.5 text-[10px] uppercase tracking-widest text-muted">
        {unit}
      </span>
    </div>
  );
}

function TimerCard({ timer, now }: { timer: Timer; now: number | null }) {
  const targetMs = timer.target ? new Date(timer.target).getTime() : null;
  const valid = targetMs !== null && !Number.isNaN(targetMs);
  const parts = valid && now !== null ? diffParts(targetMs, now) : null;

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-3 w-1 rounded-sm bg-brand" />
        <span className="nameplate-type text-sm text-ink">{timer.label}</span>
      </div>

      {!valid ? (
        <div className="mt-5 flex h-[62px] items-center">
          <span className="nameplate-type text-3xl text-muted sm:text-4xl">
            TBD
          </span>
        </div>
      ) : parts?.done ? (
        <div className="mt-5 flex h-[62px] items-center">
          <span className="nameplate-type text-3xl text-gold sm:text-4xl">
            It&apos;s here
          </span>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-4 gap-3 sm:gap-4">
          <Cell value={parts ? parts.days : null} unit="days" />
          <Cell value={parts ? parts.hours : null} unit="hrs" />
          <Cell value={parts ? parts.minutes : null} unit="min" />
          <Cell value={parts ? parts.seconds : null} unit="sec" />
        </div>
      )}

      <div className="mt-4 text-xs text-muted">
        {valid
          ? new Date(timer.target!).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "Date to be announced"}
      </div>
    </div>
  );
}

export function CountdownTimers({ timers }: { timers: Timer[] }) {
  const now = useNow();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {timers.map((t) => (
        <TimerCard key={t.label} timer={t} now={now} />
      ))}
    </div>
  );
}
