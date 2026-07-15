import { redirect } from "next/navigation";

// Archive is now a menu; its landing item is Historical Standings. The old
// combined page split into /proposals and /punishment.
export default function ArchivePage() {
  redirect("/standings");
}
