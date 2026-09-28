import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";
import { getCurrentUser } from "@/lib/backend";
import { DESCRIPTION, SITE_NAME, TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} · ${TAGLINE}` },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
};

export default async function Home() {
  // Signed-in visitors get "Open your chats" instead of the sign-up prompts.
  const user = await getCurrentUser().catch(() => null);
  return <Landing signedIn={Boolean(user)} />;
}
