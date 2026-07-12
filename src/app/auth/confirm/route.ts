import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Token-hash email verification (Supabase's recommended SSR magic-link
 * flow). Unlike the PKCE `?code` flow in ./callback, verifyOtp with a
 * token_hash carries no browser-side secret, so the link works even when
 * it's opened in a different browser or a mail app's in-app webview — the
 * common reason magic links "bounce back to login" on phones.
 *
 * The email templates point here as:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink
 * (type is `signup` for a first-time login, `magiclink` afterwards).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Only allow same-origin relative redirects to avoid an open redirect.
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") ? nextParam : "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
