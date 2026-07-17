import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentManager } from "@/lib/managers";

const MAX_IMAGE_BYTES = 8_000_000; // generous ceiling after client compression
const MAX_BODY_LEN = 2000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const manager = await getCurrentManager(supabase);
  if (!manager) {
    return NextResponse.json({ error: "Not linked to a manager" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const rawBody = form.get("body");
  const body =
    typeof rawBody === "string" && rawBody.trim()
      ? rawBody.trim().slice(0, MAX_BODY_LEN)
      : null;

  const image = form.get("image");
  const admin = createAdminClient();
  let imagePath: string | null = null;

  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image is too large." }, { status: 400 });
    }
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images are allowed." }, { status: 400 });
    }
    imagePath = `${crypto.randomUUID()}.jpg`;
    const { error } = await admin.storage
      .from("trash-talk")
      .upload(imagePath, image, {
        contentType: image.type || "image/jpeg",
        upsert: false,
      });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (!body && !imagePath) {
    return NextResponse.json(
      { error: "Add some text or an image." },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("trash_talk_posts")
    .insert({ manager_id: manager.id, body, image_path: imagePath });
  if (error) {
    // Roll back the uploaded image if the row insert failed.
    if (imagePath) await admin.storage.from("trash-talk").remove([imagePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
