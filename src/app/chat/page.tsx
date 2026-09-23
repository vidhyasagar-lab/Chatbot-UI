import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatApp } from "@/components/chat/chat-app";
import { getCurrentUser } from "@/lib/backend";

export const metadata: Metadata = { title: "Chat · Verity" };

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ s?: string | string[] }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // ?s=<session id> is how the open chat survives a refresh.
  const { s } = await searchParams;
  const sessionId = typeof s === "string" ? s : "";
  return <ChatApp user={user} initialSessionId={sessionId} />;
}
