/**
 * Thin wrapper over Google's Gemini REST API (free tier). We call the raw HTTP
 * endpoint rather than pulling in an SDK — it's one POST. The API key is a free
 * Google AI Studio key, set as GEMINI_API_KEY; the model is overridable via
 * GEMINI_MODEL (default: a free Flash model).
 */

const DEFAULT_MODEL = "gemini-2.0-flash";

const SYSTEM_INSTRUCTION = `You are the in-app assistant for "Challenger Dynasty", a long-running fantasy football keeper league. You are given the league's rules and the manager's own current roster, and you help them think through roster construction, trades, waiver strategy, and general keeper reasoning.

Hard constraints:
- You do NOT have access to keeper prices, auction budgets, or anyone's keeper selections — those are private and are deliberately withheld from you.
- If asked which specific players to keep, or any price- or budget-specific keeper question, give GENERAL guidance based on roster construction and value, and clearly note that you can't see keeper prices or budgets. Point them to the Keepers page and the Trade Simulator for the exact, price-aware math.
- Never invent or claim to know a specific keeper price, a manager's budget, or another manager's picks.
- Only reason about the roster you were given; you don't know other managers' rosters unless told.

Style: concise and practical. A few sentences or a short list. Talk like a sharp league-mate, not a corporate assistant.`;

export interface GeminiResult {
  ok: boolean;
  text?: string;
  /** Present when ok is false: a user-safe error message. */
  error?: string;
}

export async function askGemini(
  context: string,
  question: string
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "The assistant isn't configured yet — a GEMINI_API_KEY needs to be set. Ask your commissioner.",
    };
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${context}\n\n---\n\nThe manager asks:\n${question}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: "The assistant is unavailable right now — try again in a bit.",
      };
    }

    const data = (await res.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
        finishReason?: string;
      }[];
    };

    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();

    if (!text) {
      return {
        ok: false,
        error:
          "The assistant didn't have a response for that — try rephrasing.",
      };
    }

    return { ok: true, text };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the assistant — check your connection and retry.",
    };
  }
}
