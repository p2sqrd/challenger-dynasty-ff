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
    .single();

  return manager;
}
