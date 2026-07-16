import { redirect } from "next/navigation";

// The home page now sends you straight to the keeper hub. Historical
// standings moved to /standings (under the Archive menu).
export default function HomePage() {
  redirect("/keepers");
}
