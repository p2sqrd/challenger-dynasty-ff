import { redirect } from "next/navigation";

// The keeper hub now lives at /keepers (with the Upcoming countdowns on top).
export default function DraftPage() {
  redirect("/keepers");
}
