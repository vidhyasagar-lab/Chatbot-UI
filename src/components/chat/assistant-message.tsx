"use client";

import { ArrowClockwise, Check, Copy, ThumbsDown, ThumbsUp } from "@phosphor-icons/react";
import type { SourceDocumentUIPart } from "ai";
import { useMemo, useState, type ComponentProps } from "react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Mark } from "@/components/brand";
import type { ChatStage, VerityMessage } from "@/lib/chat-types";
import { linkCitations } from "@/lib/citations";
import { cn } from "@/lib/utils";
import { FigureStrip } from "./figure-strip";
import { QualityBadge } from "./quality-badge";
import { flashSource, SourceChips } from "./source-chips";

const STAGE_COPY: Record<ChatStage, string> = {
  retrieving: "Searching your documents",
  generating: "Writing the answer",
  scoring: "Checking it against your documents",
  regenerating: "Rewriting from the sources",
};

/**
 * The answer that stands.
 *
 * A rejected draft and its replacement both arrive as text parts, separated by
 * a `data-rejected` marker. Joining every text part would produce the draft
 * glued to the answer that replaced it — so only the parts after the last
 * marker count.
 */
export function textOf(message: VerityMessage): string {
  const lastRejection = message.parts.findLastIndex((p) => p.type === "data-rejected");
  const final = lastRejection === -1 ? message.parts : message.parts.slice(lastRejection + 1);
  return final.map((p) => (p.type === "text" ? p.text : "")).join("");
}

/** The draft the gate threw out, kept visible so the check is legible. */
export function rejectedDraftOf(message: VerityMessage): { text: string; reason: string } | null {
  const at = message.parts.findLastIndex((p) => p.type === "data-rejected");
  if (at === -1) return null;
  const marker = message.parts[at];
  const text = message.parts
    .slice(0, at)
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
  if (!text) return null;
  return { text, reason: (marker as { data: { reason: string } }).data.reason };
}

/** Inline `[n]` citations arrive as #cite-n links; render them as chips. */
function CitationOrLink({ href, children, node: _node, ...rest }: ComponentProps<"a"> & { node?: unknown }) {
  if (href?.startsWith("#cite-")) {
    const id = href.slice("#cite-".length);
    return (
      <button
        type="button"
        aria-label={`Show source ${id}`}
        onClick={(e) => flashSource(e.currentTarget, id)}
        className="mx-0.5 inline-grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-[4px] bg-mark px-1 align-[0.12em] font-sans text-[10.5px] font-semibold text-mark-ink transition-[filter,transform] duration-300 ease-spring hover:-translate-y-px hover:brightness-95"
      >
        {id}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" {...rest}>
      {children}
    </a>
  );
}
const MARKDOWN_COMPONENTS = { a: CitationOrLink };

type Props = {
  message: VerityMessage;
  streaming: boolean;
  stage: ChatStage | null;
  stopped: boolean;
  onRetry: () => void;
};

export function AssistantMessage({ message, streaming, stage, stopped, onRetry }: Props) {
  const text = textOf(message);
  const rejected = rejectedDraftOf(message);
  const sources = message.parts.filter((p): p is SourceDocumentUIPart => p.type === "source-document");
  const meta = message.parts.find((p) => p.type === "data-meta")?.data;
  // The last verdict: after a rejection it is the replacement's, not the draft's.
  const gated = message.parts.findLast((p) => p.type === "data-eval")?.data;
  const figures = message.parts.find((p) => p.type === "data-figures")?.data ?? [];

  const idKey = sources.map((s) => s.sourceId).join(",");
  const ids = useMemo(() => new Set(idKey ? idKey.split(",") : []), [idKey]);
  const linked = useMemo(() => linkCitations(text, ids), [text, ids]);

  return (
    <Message from="assistant" data-message-id={message.id} aria-busy={streaming} className="animate-rise max-w-full">
      <div className="grid grid-cols-[28px_1fr] gap-4 max-md:grid-cols-1 max-md:gap-2">
        <Mark className={cn("mt-1 size-7 rounded-lg text-[18px] max-md:hidden", streaming && "animate-pulse")} />
        <div className="flex min-w-0 flex-col gap-3">
          {streaming && !text && !rejected && <StageLine stage={stage ?? "retrieving"} />}

          {rejected && <RejectedDraft text={rejected.text} reason={rejected.reason} />}

          {streaming && rejected && !text && <StageLine stage="regenerating" />}

          {text && (
            <MessageContent className="w-full font-serif text-[17px] leading-[1.7] [&_code]:font-mono [&_pre]:font-mono [&_strong]:font-semibold">
              <MessageResponse
                mode={streaming ? "streaming" : "static"}
                isAnimating={streaming}
                parseIncompleteMarkdown
                components={MARKDOWN_COMPONENTS}
              >
                {linked}
              </MessageResponse>
            </MessageContent>
          )}

          {!streaming && (
            <div className="animate-rise flex flex-col gap-3">
              {stopped && <p className="text-[12.5px] text-faint">Stopped. This partial answer wasn&apos;t verified.</p>}
              {!stopped && <FigureStrip figures={figures} />}
              <SourceChips sources={sources} />
              <div className="flex flex-wrap items-center gap-1">
                {!stopped && text && (
                  <span className="mr-2">
                    <QualityBadge gated={gated} traceId={meta?.traceId} />
                  </span>
                )}
                <Actions text={text} traceId={meta?.traceId} onRetry={onRetry} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Message>
  );
}

/**
 * The gate rejecting an answer is the point of the gate, so it is shown rather
 * than swapped out silently: the reader sees what was written, and why it did
 * not survive the check against their documents.
 */
function RejectedDraft({ text, reason }: { text: string; reason: string }) {
  return (
    <div className="animate-rise rounded-xl border border-dashed border-hair-strong bg-core-2 p-3.5">
      <p className="mb-2 flex items-center gap-2 text-[12.5px] font-medium text-muted-foreground">
        <span aria-hidden className="size-1.5 rounded-full bg-warn" />
        Draft rejected by the quality gate — {reason}
      </p>
      <p className="text-[14px] leading-[1.65] text-faint line-through decoration-faint/40">{text}</p>
    </div>
  );
}

function StageLine({ stage }: { stage: ChatStage }) {
  return (
    <p className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
      <span className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-60" />
        <span className="relative size-2 rounded-full bg-brand" />
      </span>
      {STAGE_COPY[stage]}…
    </p>
  );
}

function Actions({ text, traceId, onRetry }: { text: string; traceId?: string; onRetry: () => void }) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<0 | 1 | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked; nothing useful to show
    }
  };

  const rate = async (score: 0 | 1) => {
    const next = vote === score ? null : score;
    setVote(next);
    if (next === null || !traceId) return;
    try {
      await fetch("/api/v1/feedback/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trace_id: traceId, score: next }),
      });
    } catch {
      // feedback is best-effort
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {text && (
        <IconAction label={copied ? "Copied" : "Copy answer"} onClick={copy}>
          {copied ? <Check weight="regular" /> : <Copy weight="regular" />}
        </IconAction>
      )}
      {traceId && (
        <>
          <IconAction label="Good answer" pressed={vote === 1} onClick={() => rate(1)}>
            <ThumbsUp weight={vote === 1 ? "fill" : "light"} />
          </IconAction>
          <IconAction label="Bad answer" pressed={vote === 0} onClick={() => rate(0)}>
            <ThumbsDown weight={vote === 0 ? "fill" : "light"} />
          </IconAction>
        </>
      )}
      <IconAction label="Regenerate" onClick={onRetry}>
        <ArrowClockwise weight="regular" />
      </IconAction>
    </div>
  );
}

function IconAction({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-300 ease-spring hover:bg-shell hover:text-foreground active:scale-95 [&_svg]:size-4",
        pressed && "bg-brand-soft text-brand hover:bg-brand-soft hover:text-brand",
      )}
    >
      {children}
    </button>
  );
}
