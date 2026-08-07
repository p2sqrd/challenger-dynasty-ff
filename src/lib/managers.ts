import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function getCurrentManager(
  supabase: SupabaseClient<Database>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: manager } = await supabase
    .from("managers")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();
  if (manager) return manager;

  // Co-managed teams: the login email may be an alias for a shared team. Look
  // it up in manager_emails and resolve to that manager row, so every
  // co-manager sees and edits the same team.
  const { data: alias } = await supabase
    .from("manager_emails")
    .select("manager_id")
    .eq("email", user.email)
    .maybeSingle();
  if (!alias) return null;

  const { data: coManaged } = await supabase
    .from("managers")
    .select("*")
    .eq("id", alias.manager_id)
    .maybeSingle();

  return coManaged;
}
