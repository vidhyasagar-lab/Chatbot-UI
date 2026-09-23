import { Landing } from "@/components/landing/landing";
import { getCurrentUser } from "@/lib/backend";

export default async function Home() {
  // Signed-in visitors get "Open your chats" instead of the sign-up prompts.
  const user = await getCurrentUser().catch(() => null);
  return <Landing signedIn={Boolean(user)} />;
}
