"use client";

import { useChat } from "@ai-sdk/react";
import { Files, FlowArrow, Paperclip, Plus, SealCheck, SignOut, Sparkle, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Wordmark } from "@/components/brand";
import { DocumentsSheet } from "@/components/documents/documents-sheet";
import { useDocuments } from "@/components/documents/use-documents";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SessionUser } from "@/lib/backend";
import { SESSION_EXPIRED } from "@/lib/chat-errors";
import type { ChatStage, VerityMessage } from "@/lib/chat-types";
import { AssistantMessage, textOf } from "./assistant-message";

const SUGGESTIONS = [
  { icon: Sparkle, text: "Summarize my documents", hint: "Key points, with sources" },
  { icon: SealCheck, text: "What are the most important numbers?", hint: "Figures you can trace to a page" },
  { icon: FlowArrow, text: "Explain the main diagram or flowchart", hint: "Answers from figures, not just text" },
  { icon: WarningCircle, text: "What risks or open questions are mentioned?", hint: "Everything flagged, in one place" },
];

export function ChatApp({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [stage, setStage] = useState<ChatStage | null>(null);
  const [stoppedIds, setStoppedIds] = useState<Set<string>>(() => new Set());
  const [announcement, setAnnouncement] = useState("");
  const sessionId = useRef("");
  const composer = useRef<HTMLDivElement>(null);
  const documents = useDocuments();
  const [docsOpen, setDocsOpen] = useState(false);
  const closeDocs = useCallback(() => setDocsOpen(false), []);
  const docCount = documents.docs?.length ?? 0;

  // The session id rides along per request (see ask/retry), so the transport is static.
  const transport = useMemo(() => new DefaultChatTransport<VerityMessage>({ api: "/api/chat" }), []);

  const { messages, sendMessage, status, stop, regenerate, error, clearError, setMessages } = useChat<VerityMessage>({
    transport,
    throttle: 50, // batch token renders instead of re-rendering per token
    onData: (part) => {
      if (part.type === "data-status") setStage(part.data.stage);
      if (part.type === "data-meta" && part.data.sessionId) sessionId.current = part.data.sessionId;
    },
    onFinish: ({ message }) => {
      setStage(null);
      const text = textOf(message);
      // One announcement for the finished answer, never per token.
      if (text) setAnnouncement(`Answer ready. ${text}`);
    },
    onError: (err) => {
      setStage(null);
      if (err.message === SESSION_EXPIRED) router.replace("/login");
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const focusInput = useCallback(() => composer.current?.querySelector("textarea")?.focus(), []);

  const ask = useCallback(
    (text: string) => {
      const q = text.trim();
      // Throwing keeps the draft in the box (PromptInput only clears on success).
      if (!q) throw new Error("empty");
      if (busy) throw new Error("busy");
      clearError();
      setAnnouncement("");
      setStage("retrieving");
      sendMessage({ text: q }, { body: { sessionId: sessionId.current } });
      focusInput();
    },
    [busy, clearError, sendMessage, focusInput],
  );

  const stopNow = useCallback(() => {
    const last = messages.at(-1);
    if (last?.role === "assistant") setStoppedIds((s) => new Set(s).add(last.id));
    setStage(null);
    stop();
    setAnnouncement("Stopped.");
    focusInput();
  }, [messages, stop, focusInput]);

  const retry = useCallback(
    (messageId?: string) => {
      if (busy) return;
      clearError();
      setStage("retrieving");
      regenerate({ messageId, body: { sessionId: sessionId.current } });
      focusInput();
    },
    [busy, clearError, regenerate, focusInput],
  );

  const newChat = useCallback(() => {
    if (busy) stop();
    sessionId.current = "";
    setMessages([]);
    setStoppedIds(new Set());
    clearError();
    focusInput();
  }, [busy, stop, setMessages, clearError, focusInput]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && busy) stopNow();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        newChat();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, stopNow, newChat]);

  const signOut = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  };

  const lastId = messages.at(-1)?.id;

  return (
    <div className="fixed inset-0 grid grid-cols-[272px_1fr] bg-background max-md:grid-cols-1">
      <aside className="flex min-h-0 flex-col gap-4 border-r border-hair bg-rail px-3 py-4 max-md:hidden">
        <div className="flex items-center justify-between px-2">
          <Wordmark className="text-[15px]" />
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={newChat}
          className="flex items-center justify-between rounded-xl border border-hair-strong bg-core px-3.5 py-2.5 text-[13.5px] font-medium transition-[border-color,transform] duration-300 ease-spring hover:border-faint active:scale-[0.985]"
        >
          <span className="inline-flex items-center gap-2">
            <Plus weight="regular" className="size-4" />
            New chat
          </span>
          <kbd className="font-mono text-[10.5px] text-faint">Ctrl K</kbd>
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setDocsOpen(true)}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-muted-foreground transition-colors hover:bg-shell hover:text-foreground"
        >
          <Files weight="regular" className="size-[18px]" />
          Documents
          <span className="ml-auto rounded-md bg-shell px-1.5 font-mono text-[11px] text-muted-foreground">
            {documents.docs === null ? "…" : docCount}
          </span>
        </button>
        <div className="flex items-center gap-2.5 border-t border-hair px-2 pt-3 text-[13px]">
          <span className="grid size-7 place-items-center rounded-full bg-mark font-serif text-[13px] font-medium uppercase text-mark-ink">
            {user.username.slice(0, 2)}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate">{user.username}</span>
            <small className="text-[11.5px] capitalize text-faint">{user.role}</small>
          </span>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="ml-auto grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-shell hover:text-foreground"
          >
            <SignOut weight="regular" className="size-[18px]" />
          </button>
        </div>
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 px-4">
          <Wordmark className="text-[15px] md:hidden" />
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setDocsOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-hair bg-core px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-hair-strong hover:text-foreground"
          >
            <span className={docCount ? "size-1.5 rounded-full bg-ok" : "size-1.5 rounded-full bg-warn"} />
            {documents.docs === null
              ? "Loading documents"
              : docCount
                ? `Searching ${docCount} document${docCount === 1 ? "" : "s"}`
                : "No documents yet"}
            {documents.busy && <span className="text-brand">· indexing</span>}
          </button>
        </header>
        <Conversation className="min-h-0">
          <ConversationContent className="mx-auto w-full max-w-[760px] gap-9 px-6 pb-56 pt-8 max-md:px-4">
            {messages.length === 0 ? (
              <EmptyState
                onPick={(t) => ask(t)}
                noDocuments={documents.docs !== null && docCount === 0 && !documents.busy}
                onUpload={() => setDocsOpen(true)}
              />
            ) : (
              messages.map((m) =>
                m.role === "user" ? (
                  <Message key={m.id} from="user" className="animate-rise">
                    <MessageContent className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[15px] text-foreground group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-md group-[.is-user]:bg-secondary group-[.is-user]:text-foreground">
                      {textOf(m)}
                    </MessageContent>
                  </Message>
                ) : (
                  <AssistantMessage
                    key={m.id}
                    message={m}
                    streaming={busy && m.id === lastId}
                    stage={stage}
                    stopped={stoppedIds.has(m.id)}
                    onRetry={() => retry(m.id)}
                  />
                ),
              )
            )}

            {/* The request can fail before any assistant message exists. */}
            {busy && messages.at(-1)?.role === "user" && (
              <AssistantMessage
                message={{ id: "pending", role: "assistant", parts: [] }}
                streaming
                stage={stage}
                stopped={false}
                onRetry={() => undefined}
              />
            )}
            {error && (
              <div role="alert" className="animate-rise flex items-center gap-3 rounded-2xl bg-err-soft px-4 py-3 text-[13.5px]">
                <WarningCircle weight="regular" className="size-5 shrink-0 text-err" />
                <span className="flex-1">{error.message || "Something went wrong."}</span>
                <button
                  type="button"
                  onClick={() => retry()}
                  className="rounded-full px-3.5 py-1.5 text-[13px] shadow-[0_0_0_1px_var(--hair-strong)] transition-colors hover:bg-shell"
                >
                  Retry
                </button>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton className="bottom-40" />
        </Conversation>

        <div
          ref={composer}
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background from-55% to-transparent px-6 pb-4 pt-10 max-md:px-3 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          <PromptInputProvider>
            <div className="pointer-events-auto mx-auto w-full max-w-[760px]">
              <PromptInput
                onSubmit={({ text }) => ask(text)}
                className="composer paper rounded-2xl transition-[border-color] duration-300 focus-within:border-hair-strong"
              >
                <PromptInputBody>
                  <PromptInputTextarea
                    autoFocus
                    aria-label="Ask a question"
                    placeholder="Ask about your documents…"
                    className="max-h-[200px] min-h-12 text-[15px] max-md:text-base"
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputTools>
                    <button
                      type="button"
                      onClick={() => setDocsOpen(true)}
                      aria-label="Add documents"
                      title="Add documents"
                      className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-shell hover:text-foreground"
                    >
                      <Paperclip weight="regular" className="size-[18px]" />
                    </button>
                    <span className="px-1 text-[11.5px] text-faint max-md:hidden">
                      Enter to send · Shift + Enter for a new line
                    </span>
                  </PromptInputTools>
                  <PromptInputSubmit
                    status={status}
                    onStop={stopNow}
                    className="size-8 rounded-lg bg-brand text-brand-ink hover:bg-brand hover:brightness-110"
                  />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </PromptInputProvider>
          <p className="mx-auto mt-2 w-full max-w-[760px] text-center text-[11.5px] text-faint">
            Answers are scored for faithfulness, but check the sources for anything that matters.
          </p>
        </div>

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </main>
      <DocumentsSheet open={docsOpen} onClose={closeDocs} state={documents} />
    </div>
  );
}

function EmptyState({ onPick, noDocuments, onUpload }: { onPick: (text: string) => void; noDocuments: boolean; onUpload: () => void }) {
  if (noDocuments) {
    return (
      <section className="flex min-h-[calc(100dvh-22rem)] flex-col justify-center gap-8">
        <div className="animate-rise">
          <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-warn" />
            Step 1 of 2
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2.2rem,4.4vw,3.1rem)] font-normal leading-[1.05] tracking-[-0.02em]">
            Add a document <em className="text-brand">to start asking.</em>
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Answers only come from files you upload, so every claim can be traced to a page.
          </p>
        </div>
        <button
          type="button"
          onClick={onUpload}
          className="animate-rise flex h-11 w-fit items-center gap-2.5 rounded-xl bg-brand px-5 text-[14.5px] font-medium text-brand-ink transition-[filter,transform] duration-300 ease-spring hover:brightness-110 active:scale-[0.99]"
          style={{ animationDelay: "120ms" }}
        >
          <UploadSimple weight="bold" className="size-4" />
          Upload documents
        </button>
      </section>
    );
  }
  return (
    <section className="flex min-h-[calc(100dvh-20rem)] flex-col justify-center gap-8">
      <div className="animate-rise">
        <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-ok" />
          Every answer checked against your sources
        </p>
        <h1 className="mt-4 font-serif text-[clamp(2.2rem,4.4vw,3.1rem)] font-normal leading-[1.05] tracking-[-0.02em]">
          Ask your documents <em className="text-brand">anything.</em>
        </h1>
      </div>
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        {SUGGESTIONS.map(({ icon: Icon, text, hint }, i) => (
          <button
            key={text}
            type="button"
            onClick={() => onPick(text)}
            className="group animate-rise flex h-full w-full items-start gap-3 rounded-xl border border-hair bg-core px-4 py-3.5 text-left transition-[border-color,box-shadow,transform] duration-300 ease-spring hover:border-hair-strong hover:shadow-[var(--paper-shadow)] active:scale-[0.99]"
            style={{ animationDelay: `${80 + i * 60}ms` }}
          >
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
              <Icon weight="regular" className="size-4" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] font-medium">{text}</span>
              <small className="text-[12.5px] text-muted-foreground">{hint}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
