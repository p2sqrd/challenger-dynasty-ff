import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface NotifyInput {
  title: string;
  body?: string;
  /** In-app path, e.g. "/fire-sale". */
  link?: string;
  /** Skip this manager (e.g. the person who triggered the event). */
  excludeManagerId?: string;
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://challenger-dynasty-ff.vercel.app";

/**
 * Notify every active manager: writes an in-app notification row for each and
 * sends one best-effort email (BCC). "Active" = has a budget entry in the
 * current season, matching the Budget/All-Keepers view. Never throws — a
 * notification failure must not break the action that triggered it.
 */
export async function notifyAll(
  admin: SupabaseClient<Database>,
  input: NotifyInput
): Promise<void> {
  try {
    const { data: season } = await admin
      .from("seasons")
      .select("id")
      .eq("status", "active")
      .single();
    if (!season) return;

    const { data: ledger } = await admin
      .from("budget_ledger")
      .select("manager_id")
      .eq("season_id", season.id);
    const recipients = [
      ...new Set((ledger ?? []).map((l) => l.manager_id)),
    ].filter((id) => id !== input.excludeManagerId);
    if (recipients.length === 0) return;

    await admin.from("notifications").insert(
      recipients.map((id) => ({
        manager_id: id,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      }))
    );

    await sendEmail(admin, recipients, input);
  } catch {
    // Best-effort: swallow so the triggering action still succeeds.
  }
}

async function sendEmail(
  admin: SupabaseClient<Database>,
  recipientIds: string[],
  input: NotifyInput
): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return; // email not configured — in-app only

  const { data: mgrs } = await admin
    .from("managers")
    .select("email")
    .in("id", recipientIds);
  const emails = (mgrs ?? [])
    .map((m) => m.email)
    .filter((e): e is string => !!e && !e.endsWith("@placeholder.invalid"));
  if (emails.length === 0) return;

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const url = input.link ? `${APP_URL}${input.link}` : APP_URL;
  await transport.sendMail({
    from: `"Challenger Dynasty" <${user}>`,
    bcc: emails,
    subject: input.title,
    text: `${input.body ? input.body + "\n\n" : ""}${url}`,
    html: `${input.body ? `<p>${input.body}</p>` : ""}<p><a href="${url}">Open Challenger Dynasty</a></p>`,
  });
}
