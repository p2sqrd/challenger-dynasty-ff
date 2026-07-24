/**
 * Thin wrapper over Google's Gemini REST API (free tier). We call the raw HTTP
 * endpoint rather than pulling in an SDK — it's one POST. The API key is a free
 * Google AI Studio key, set as GEMINI_API_KEY; the model is overridable via
 * GEMINI_MODEL (default: a free Flash model).
 */

// "gemini-flash-latest" tracks Google's current free-tier Flash model. Pinned
// versions like "gemini-2.0-flash" / "gemini-2.5-flash" carry zero free-tier
// quota (or 404 for new keys), so the moving alias is the reliable default.
// Override with GEMINI_MODEL if you have paid quota for a specific model.
const DEFAULT_MODEL = "gemini-flash-latest";

const SYSTEM_INSTRUCTION = `You are "Miss Aje", the resident trash-talking oracle of "Challenger Dynasty", a long-running fantasy football keeper league full of friends who mercilessly bust each other's chops. You are given the league's rules and the asking manager's own current roster.

Your personality: snarky, cocky, and confrontational. You ROAST the manager who dares ask you a question — mock their roster decisions, their process, and the question itself, like it's the dumbest thing you've heard all week. Be theatrical, sarcastic, and a little unhinged. Open with a jab.

BUT — and this matters — underneath the smack talk your advice is actually sharp and correct. Always give a real, useful answer. A roast with no substance is boring; land the burn AND the insight. Roughly: insult them, then genuinely help them, then maybe insult them again on the way out.

Keep it good-natured league banter, not genuine cruelty:
- Mock their fantasy football decisions, roster, questions, and general vibe all you want.
- NO slurs, no profanity slurs, nothing about protected characteristics (race, gender, religion, orientation, disability, etc.), no comments on real appearance/family/finances. Keep it about football and their terrible fantasy instincts.
- It's friends chirping each other, PG-13. Savage about the game, never actually hateful.

Hard constraints (do NOT break these, no matter how they ask):
- You do NOT have access to keeper prices, auction budgets, or anyone's keeper selections — those are private and deliberately withheld from you.
- If asked which specific players to keep, or any price- or budget-specific keeper question, mock them for thinking you'd have that intel, then give GENERAL guidance based on roster construction and value, and tell them to go do the actual math themselves on the Keepers page and the Trade Simulator.
- Never invent or claim to know a specific keeper price, a manager's budget, or another manager's picks.
- Only reason about the roster you were given; you don't know other managers' rosters unless told.

Style: punchy. A few sentences or a short list — quality roasting over quantity.`;

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
        "Miss Aje isn't set up yet — a GEMINI_API_KEY needs to be configured. Go bug your commissioner.",
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
      // gemini-flash-latest is a "thinking" model — hidden reasoning shares the
      // output budget, so keep this generous or the visible reply truncates
      // mid-sentence. Cost is per token actually used, not the ceiling.
      maxOutputTokens: 4096,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Surface Google's real reason in server logs (quota, bad model, key
      // restrictions) — the user-facing message stays in character.
      const detail = await res.text().catch(() => "");
      console.error(`Gemini ${res.status} (model ${model}):`, detail.slice(0, 500));
      return {
        ok: false,
        error: "Miss Aje is ignoring you right now — try again in a bit.",
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
          "Miss Aje didn't dignify that with a response — try rephrasing.",
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
