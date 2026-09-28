import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatApp } from "@/components/chat/chat-app";
import { getCurrentUser } from "@/lib/backend";

// Private to the signed-in user: nothing here should be indexed.
export const metadata: Metadata = {
  title: "Chat",
  description: "Ask questions across your documents and see the page every answer came from.",
  robots: { index: false, follow: false },
};

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ s?: string | string[] }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // ?s=<session id> is how the open chat survives a refresh.
  const { s } = await searchParams;
  const sessionId = typeof s === "string" ? s : "";
  return <ChatApp user={user} initialSessionId={sessionId} />;
}
