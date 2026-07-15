import { redirect } from "next/navigation";

// The approval queue now lives on the Commish page.
export default function KeeperApprovalPage() {
  redirect("/commish");
}
