"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/compress-image";

const MAX_INPUT_BYTES = 25_000_000; // reject absurd files before compressing

export function TrashTalkForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "posting">("idle");
  const [error, setError] = useState("");

  function pickFile(f: File | null) {
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      setError("That's not an image.");
      return;
    }
    if (f.size > MAX_INPUT_BYTES) {
      setError("That image is huge — pick something smaller.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function reset() {
    setBody("");
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !file) {
      setError("Add some text or an image.");
      return;
    }
    setStatus("posting");
    setError("");

    try {
      const form = new FormData();
      if (body.trim()) form.set("body", body.trim());
      if (file) {
        const compressed = await compressImage(file);
        form.set("image", compressed, "trash-talk.jpg");
      }
      const res = await fetch("/api/trash-talk/create", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error ?? "Could not post.");
        setStatus("idle");
        return;
      }
      reset();
      setStatus("idle");
      router.refresh();
    } catch {
      setError("Could not process that image.");
      setStatus("idle");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-line bg-surface p-4"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Post a laughably bad trade offer — drop a screenshot, some words, or both."
        rows={3}
        className="w-full resize-y rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
      />

      {preview && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="preview"
            className="max-h-64 rounded-md border border-line object-contain"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-md border border-line bg-canvas px-3 py-1.5 text-sm text-ink hover:bg-surface-2">
          {file ? "Change image" : "Add image"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        {file && (
          <button
            type="button"
            onClick={() => pickFile(null)}
            className="text-xs text-muted hover:text-ink"
          >
            Remove image
          </button>
        )}
        <button
          type="submit"
          disabled={status === "posting"}
          className="ml-auto rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-[var(--color-brand-ink)] transition-opacity disabled:opacity-40"
        >
          {status === "posting" ? "Posting…" : "Post"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-rejected">{error}</p>}
    </form>
  );
}
