import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { backendConfig } from "@/lib/backend";
import { adaptBackendEvents, parseSse } from "@/lib/backend-stream";
import { messageForStatus } from "@/lib/chat-errors";
import type { VerityMessage } from "@/lib/chat-types";
import { upstreamHeaders } from "@/lib/proxy-headers";

/**
 * useChat posts here. The backend keeps conversation history itself (keyed by
 * session_id), so only the newest question is forwarded, never the transcript.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ChatBody = { messages: VerityMessage[]; sessionId?: string };

export async function POST(req: Request): Promise<Response> {
  const { messages, sessionId } = (await req.json()) as ChatBody;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const question = (lastUser?.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
  if (!question) return new Response("Ask a question first.", { status: 400 });

  const { url, key } = backendConfig();
  const headers = upstreamHeaders(req.headers, key);
  headers.set("content-type", "application/json");

  const upstream = await fetch(`${url}/api/v1/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ question, session_id: sessionId ?? "" }),
    cache: "no-store",
    signal: req.signal, // Stop in the UI aborts the backend call too
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(messageForStatus(upstream.status), { status: upstream.status === 401 ? 401 : 502 });
  }
  const body = upstream.body;

  const stream = createUIMessageStream<VerityMessage>({
    execute: async ({ writer }) => {
      for await (const chunk of adaptBackendEvents(parseSse(body))) writer.write(chunk);
    },
    onError: () => "The connection to the answer service dropped. Try again.",
  });
  return createUIMessageStreamResponse({ stream });
}
