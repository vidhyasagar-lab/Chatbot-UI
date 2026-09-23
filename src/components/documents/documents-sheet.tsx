"use client";

import {
  CircleNotch,
  FileDoc,
  FilePdf,
  FileText,
  Image as ImageIcon,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { type DocumentRecord, formatBytes, SUPPORTED_EXTENSIONS } from "@/lib/documents";
import { cn } from "@/lib/utils";
import type { DocumentsState, UploadItem } from "./use-documents";

function FileIcon({ name }: { name: string }) {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  const cls = "size-5 shrink-0 text-muted-foreground";
  if (ext === ".pdf") return <FilePdf weight="regular" className={cls} />;
  if (ext === ".docx" || ext === ".doc") return <FileDoc weight="regular" className={cls} />;
  if ([".txt", ".md"].includes(ext)) return <FileText weight="regular" className={cls} />;
  return <ImageIcon weight="regular" className={cls} />;
}

const dateFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

export function DocumentsSheet({ open, onClose, state }: { open: boolean; onClose: () => void; state: DocumentsState }) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnFocus.current?.focus();
    };
  }, [open, onClose]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) state.add(e.dataTransfer.files);
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-[rgb(28_27_24/0.28)] transition-opacity duration-500 ease-spring",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Documents"
        inert={!open}
        className={cn(
          "fixed inset-y-3 right-3 z-40 w-[min(420px,calc(100%-1.5rem))] transition-transform duration-700 ease-spring",
          open ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]",
        )}
      >
        <div className="paper h-full rounded-2xl">
          <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-[1.5rem] font-normal tracking-[-0.01em]">Documents</h2>
                <p className="text-[12.5px] text-faint">Only you can search the files you upload.</p>
              </div>
              <button
                ref={closeBtn}
                type="button"
                onClick={onClose}
                aria-label="Close documents"
                className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-shell hover:text-foreground"
              >
                <X weight="regular" className="size-[18px]" />
              </button>
            </header>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1.5 rounded-[1.25rem] px-4 py-7 text-center text-[13.5px] text-muted-foreground outline-1 outline-offset-[-1px] outline-dashed transition-[background-color,outline-color] duration-300 ease-spring focus-within:outline-brand",
                over ? "bg-brand-soft outline-brand" : "bg-shell outline-hair-strong hover:bg-brand-soft hover:outline-brand",
              )}
            >
              <UploadSimple weight="regular" className="size-7 text-brand" />
              <span>
                Drop files here or <span className="text-foreground underline underline-offset-4">browse</span>
              </span>
              <small className="text-[11.5px] text-faint">PDF, Word, text, Markdown or images · up to 50 MB</small>
              <input
                type="file"
                multiple
                accept={SUPPORTED_EXTENSIONS.join(",")}
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) state.add(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>

            {state.error && (
              <p role="alert" className="flex items-center gap-2 rounded-xl bg-err-soft px-3 py-2 text-[12.5px]">
                <WarningCircle weight="regular" className="size-4 shrink-0 text-err" />
                {state.error}
              </p>
            )}

            {state.uploads.length > 0 && (
              <ul aria-label="Uploads in progress" className="flex flex-col gap-1.5">
                {state.uploads.map((u) => (
                  <UploadRow key={u.id} item={u} onDismiss={() => state.dismiss(u.id)} />
                ))}
              </ul>
            )}

            <section className="flex flex-col gap-1.5">
              {state.docs === null ? (
                <p className="px-1 text-[13px] text-faint">Loading your documents…</p>
              ) : state.docs.length === 0 && state.uploads.length === 0 ? (
                <p className="px-1 text-[13px] text-faint">No documents yet. Upload one to start asking questions.</p>
              ) : (
                <ul aria-label="Your documents" className="flex flex-col gap-1.5">
                  {state.docs.map((d) => (
                    <DocRow key={d.doc_id} doc={d} onDelete={() => state.remove(d.doc_id)} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </aside>
    </>
  );
}

function UploadRow({ item, onDismiss }: { item: UploadItem; onDismiss: () => void }) {
  const label =
    item.phase === "queued"
      ? "Waiting…"
      : item.phase === "uploading"
        ? `Uploading · ${Math.round(item.progress * 100)}%`
        : item.phase === "indexing"
          ? "Reading and indexing… large PDFs can take a minute"
          : item.error;
  return (
    <li
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-hair px-3 py-2.5",
        item.phase === "error" ? "bg-err-soft" : "bg-core-2",
      )}
    >
      <FileIcon name={item.name} />
      <div className="min-w-0">
        <div className="truncate text-[13.5px]">{item.name}</div>
        <small className={cn("block text-[11.5px]", item.phase === "error" ? "text-err" : "text-faint")}>{label}</small>
        {item.phase !== "error" && (
          <span className="mt-1.5 block h-[3px] overflow-hidden rounded-full bg-hair">
            <span
              className={cn(
                "block h-full origin-left rounded-full bg-brand transition-transform duration-300 ease-spring",
                item.phase === "indexing" && "animate-pulse",
              )}
              style={{ transform: `scaleX(${item.phase === "queued" ? 0 : Math.max(0.04, item.progress)})` }}
            />
          </span>
        )}
      </div>
      {item.phase === "error" ? (
        <button type="button" onClick={onDismiss} aria-label={`Dismiss ${item.name}`} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-shell">
          <X weight="regular" className="size-4" />
        </button>
      ) : (
        <CircleNotch weight="regular" className="size-4 animate-spin text-faint" aria-hidden />
      )}
    </li>
  );
}

function DocRow({ doc, onDelete }: { doc: DocumentRecord; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const meta = [
    formatBytes(doc.file_size),
    `${doc.chunks_added} chunks`,
    doc.images_extracted ? `${doc.images_extracted} figures` : null,
    doc.uploaded_at ? dateFmt.format(new Date(doc.uploaded_at)) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-hair bg-core px-3 py-2.5">
      <FileIcon name={doc.filename} />
      <div className="min-w-0">
        <div className="truncate text-[13.5px]" title={doc.filename}>
          {doc.filename}
        </div>
        <small className="block text-[11.5px] text-faint">{meta}</small>
      </div>
      {confirming ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full bg-err-soft px-3 py-1 text-[12px] text-err transition-transform duration-300 ease-spring active:scale-95"
          >
            Delete
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-2.5 py-1 text-[12px] text-muted-foreground hover:bg-shell">
            Keep
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${doc.filename}`}
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-shell hover:text-err"
        >
          <Trash weight="regular" className="size-4" />
        </button>
      )}
    </li>
  );
}
