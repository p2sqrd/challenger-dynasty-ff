import { redirect } from "next/navigation";

// Keepers are self-service now — there's no approval step. Bounce any old
// bookmark of this route back to the Keepers page.
export default function KeeperApprovalPage() {
  redirect("/keepers");
}
