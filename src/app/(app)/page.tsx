import { redirect } from "next/navigation";

// The home page now sends you straight to the in-season hub. Historical
// standings moved to /standings (under the Archive menu).
export default function HomePage() {
  redirect("/draft");
}
