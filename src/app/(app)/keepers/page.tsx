import { redirect } from "next/navigation";

// Keepers now live on the Draft page (beneath the countdown timers).
export default function KeepersPage() {
  redirect("/draft");
}
