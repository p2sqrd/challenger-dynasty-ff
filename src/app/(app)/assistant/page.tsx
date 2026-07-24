import { createClient } from "@/lib/supabase/server";
import { getCurrentManager } from "@/lib/managers";
import { PageHeader } from "@/components/PageHeader";
import { AssistantChat } from "@/components/AssistantChat";

export default async function AssistantPage() {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);

  return (
    <div>
      <PageHeader
        title="Ask Miss Aje"
        subtitle="Challenger Dynasty's resident know-it-all — she knows the rules and your roster, and she has opinions. Ask about trades, waivers, roster construction, or how a rule works (and brace yourself)."
      />

      {manager ? (
        <div className="max-w-2xl">
          <AssistantChat />
        </div>
      ) : (
        <p className="text-sm text-muted">
          Your login isn&apos;t linked to a manager yet — ask your commissioner
          to add your email to your manager record.
        </p>
      )}
    </div>
  );
}
