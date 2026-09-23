import { redirect } from "next/navigation";

// The landing page comes later; until then the app is the front door.
export default function Home() {
  redirect("/chat");
}
