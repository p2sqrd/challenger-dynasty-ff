import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // Implicit flow puts the session tokens in the magic-link redirect
      // hash instead of a PKCE `?code` that needs a browser-side verifier.
      // This lets Supabase's *default* (uneditable) email template work, and
      // makes the link succeed even when it's opened in a different browser
      // or a mail app's in-app webview. The /auth/callback page reads the
      // hash and persists the session itself, so we disable the library's
      // own URL detection to keep that handling deterministic (no race).
      auth: { flowType: "implicit", detectSessionInUrl: false },
    }
  );
}
