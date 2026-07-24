"use client";

import { useState } from "react";

const EXAMPLES = [
  "How's my roster looking at RB?",
  "Who are the best keeper-value guys on my team?",
  "Should I be buying or selling this year?",
  "Explain our tradeback rule.",
];

export function AssistantChat() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    const query = q.trim();
    if (!query || loading) return;
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — try again.");
      } else {
        setAnswer(data.answer ?? "");
      }
    } catch {
      setError("Couldn't reach the assistant — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              ask(question);
            }
          }}
          rows={3}
          maxLength={1000}
          placeholder="Ask about your roster, trades, waivers, or the rules…"
          className="w-full resize-y rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={loading || question.trim().length === 0}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
          >
            {loading ? "Thinking…" : "Ask"}
          </button>
          <span className="text-xs text-muted">⌘/Ctrl + Enter to send</span>
        </div>
      </form>

      {/* Privacy signposting — keeper prices/budgets/picks never reach the AI. */}
      <p className="mt-3 text-xs text-muted">
        Advice here is general and doesn&apos;t factor in keeper prices,
        budgets, or anyone&apos;s keeper picks — those stay private.
      </p>
      <details className="mt-1 text-xs text-muted">
        <summary className="cursor-pointer select-none text-brand hover:underline">
          Why can&apos;t it see keeper prices?
        </summary>
        <p className="mt-1.5 max-w-prose">
          Keeper selections are sealed until the deadline — not even
          commissioners can see them early. To keep that promise, the assistant
          is never given keeper prices, budgets, or picks, so nothing private
          can leak. For price-aware keeper math, use the{" "}
          <span className="text-ink">Keepers</span> page and the{" "}
          <span className="text-ink">Trade Simulator</span> on the Trades page.
        </p>
      </details>

      {!answer && !error && !loading && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuestion(ex);
                ask(ex);
              }}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-rejected/30 bg-rejected/10 p-3 text-sm text-rejected">
          {error}
        </p>
      )}

      {answer && (
        <div className="mt-4 rounded-md border border-line bg-canvas p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
            Assistant
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}
