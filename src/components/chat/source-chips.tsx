"use client";

import { FileDoc, FilePdf, FileText, FlowArrow, Image as ImageIcon, Table } from "@phosphor-icons/react";
import type { SourceDocumentUIPart } from "ai";
import type { SourceDetails } from "@/lib/chat-types";

function detailsOf(part: SourceDocumentUIPart): SourceDetails {
  const d = part.providerMetadata?.verity as SourceDetails | undefined;
  return { page: d?.page ?? "", contentType: d?.contentType ?? "text" };
}

function IconFor({ part, contentType }: { part: SourceDocumentUIPart; contentType: string }) {
  const cls = "size-3.5 shrink-0 text-muted-foreground";
  if (contentType === "table") return <Table weight="regular" className={cls} />;
  if (["flowchart", "diagram", "chart"].includes(contentType)) return <FlowArrow weight="regular" className={cls} />;
  if (part.mediaType.startsWith("image/") || contentType === "image") return <ImageIcon weight="regular" className={cls} />;
  if (part.mediaType === "application/pdf") return <FilePdf weight="regular" className={cls} />;
  if (part.mediaType.includes("wordprocessingml")) return <FileDoc weight="regular" className={cls} />;
  return <FileText weight="regular" className={cls} />;
}

/** Source cards under an answer. `data-source-id` is what inline citation chips target. */
export function SourceChips({ sources }: { sources: SourceDocumentUIPart[] }) {
  if (sources.length === 0) return null;
  return (
    <ul aria-label="Sources" className="flex flex-wrap gap-1.5">
      {sources.map((s) => {
        const { page, contentType } = detailsOf(s);
        const where = [page !== "" ? `p.${page}` : null, contentType !== "text" ? contentType : null].filter(Boolean).join(" · ");
        return (
          <li
            key={s.sourceId}
            data-source-id={s.sourceId}
            title={s.title}
            className="inline-flex max-w-full items-center gap-2 rounded-lg border border-hair bg-core py-1.5 pl-1.5 pr-3 text-[12.5px] text-muted-foreground transition-[border-color,box-shadow] duration-500 ease-spring data-[flash]:border-brand data-[flash]:shadow-[0_0_0_3px_var(--brand-soft)]"
          >
            <b className="grid size-5 shrink-0 place-items-center rounded-[4px] bg-mark text-[10.5px] font-semibold text-mark-ink">
              {s.sourceId}
            </b>
            <IconFor part={s} contentType={contentType} />
            <span className="truncate text-foreground">{s.title}</span>
            {where && <small className="shrink-0 text-faint">{where}</small>}
          </li>
        );
      })}
    </ul>
  );
}

/** Briefly highlight the source card a citation chip points at. */
export function flashSource(from: HTMLElement, sourceId: string) {
  const card = from.closest("[data-message-id]")?.querySelector<HTMLElement>(`[data-source-id="${sourceId}"]`);
  if (!card) return;
  card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  card.setAttribute("data-flash", "");
  window.setTimeout(() => card.removeAttribute("data-flash"), 1400);
}
