import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { buildAssistantContext } from "@/lib/assistant/context";
import { askGemini } from "@/lib/assistant/gemini";

export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json(
      { error: "You need to be signed in to ask the assistant." },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    question?: string;
  };
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (question.length > 1000) {
    return NextResponse.json(
      { error: "That's a bit long — keep it under 1000 characters." },
      { status: 400 }
    );
  }

  // Public-only context. buildAssistantContext never reads keepers, prices, or
  // budgets, so nothing private is sent to the free LLM tier.
  const context = await buildAssistantContext(supabase, manager);
  const result = await askGemini(context, question);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ answer: result.text });
}
