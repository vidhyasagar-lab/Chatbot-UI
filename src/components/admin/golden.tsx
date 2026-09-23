"use client";

import { MagicWand, MagnifyingGlass, Plus, Trash, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { type GoldenSample, formatWhen } from "@/lib/admin";
import type { DocumentRecord } from "@/lib/documents";
import { cn } from "@/lib/utils";
import { adminJson, useAdminData } from "./admin-api";
import { Badge, Button, ConfirmButton, Empty, ErrorNote, Field, Loading, PageHeader, Panel, PanelHeader } from "./ui";

type Filter = "all" | "manual" | "synthetic";

export function Golden() {
  const golden = useAdminData<GoldenSample[]>("/golden");
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (golden.data ?? []).filter(
      (s) =>
        (filter === "all" || (filter === "manual" ? s.source === "manual" : s.source !== "manual")) &&
        (!q || s.question.toLowerCase().includes(q) || s.ground_truth.toLowerCase().includes(q) || s.source_doc.toLowerCase().includes(q)),
    );
  }, [golden.data, query, filter]);

  const act = async (fn: () => Promise<unknown>, done?: string) => {
    setActionError(null);
    setNotice(null);
    try {
      await fn();
      if (done) setNotice(done);
      await golden.reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const total = golden.data?.length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Admin · Golden dataset"
        title={
          <>
            The answers Verity <em className="text-brand">should</em> give.
          </>
        }
        description="Each pair is a question and the answer your documents support. Evaluation runs ask every question and score the reply against it."
        actions={
          <>
            {total > 0 && (
              <ConfirmButton
                label="Clear all"
                question={`Delete all ${total} pairs?`}
                confirmLabel="Clear"
                icon={<Trash weight="regular" />}
                onConfirm={() =>
                  act(async () => {
                    const r = await adminJson<{ deleted: number }>("/golden", { method: "DELETE" });
                    setNotice(`Cleared ${r.deleted} pair${r.deleted === 1 ? "" : "s"}.`);
                  })
                }
              />
            )}
            {!adding && (
              <Button variant="primary" onClick={() => setAdding(true)}>
                <Plus weight="bold" />
                Add pair
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-[1fr_320px] items-start gap-6 max-lg:grid-cols-1">
        <div className="flex flex-col gap-6">
          {adding && (
            <AddPair
              onCancel={() => setAdding(false)}
              onAdded={async () => {
                setAdding(false);
                await golden.reload();
              }}
            />
          )}
          {actionError && <ErrorNote message={actionError} />}
          {notice && (
            <p role="status" className="animate-rise rounded-xl bg-ok-soft px-4 py-3 text-[13.5px] text-ok">
              {notice}
            </p>
          )}

          <Panel className="animate-rise overflow-hidden">
            <PanelHeader
              title="Pairs"
              meta={golden.data ? (shown.length === total ? `${total}` : `${shown.length} of ${total}`) : undefined}
              actions={
                <div className="flex items-center gap-2 max-sm:flex-wrap">
                  <label className="relative">
                    <span className="sr-only">Search pairs</span>
                    <MagnifyingGlass weight="regular" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search"
                      className="h-8 w-44 rounded-lg border border-hair bg-background pl-8 pr-2.5 text-[13px] outline-none transition-[border-color] focus:border-brand"
                    />
                  </label>
                  <span role="radiogroup" aria-label="Show" className="inline-flex rounded-lg border border-hair bg-core-2 p-0.5">
                    {(["all", "manual", "synthetic"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        role="radio"
                        aria-checked={filter === f}
                        onClick={() => setFilter(f)}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[12px] capitalize transition-colors",
                          filter === f ? "bg-core font-medium shadow-[0_0_0_1px_var(--hair)]" : "text-muted-foreground",
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </span>
                </div>
              }
            />
            {golden.loading ? (
              <Loading />
            ) : golden.error ? (
              <div className="p-5">
                <ErrorNote message={golden.error} onRetry={golden.reload} />
              </div>
            ) : total === 0 ? (
              <Empty title="No pairs yet">Generate some from your documents, or add one by hand.</Empty>
            ) : shown.length === 0 ? (
              <Empty title="Nothing matches">Try another search or filter.</Empty>
            ) : (
              <ul>
                {shown.map((s) => (
                  <li key={s.id} className="group grid grid-cols-[1fr_auto] gap-4 border-b border-hair px-5 py-4 last:border-0">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-medium leading-snug">{s.question}</p>
                      <p className="mt-1.5 line-clamp-3 font-serif text-[15px] leading-relaxed text-muted-foreground">{s.ground_truth}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-faint">
                        <Badge tone={s.source === "manual" ? "brand" : "none"}>{s.source}</Badge>
                        {s.source_doc && <span className="truncate">{s.source_doc.split(/[\\/]/).pop()}</span>}
                        <span>{formatWhen(s.created_at)}</span>
                      </p>
                    </div>
                    <ConfirmButton
                      compact
                      label="Delete pair"
                      question="Delete?"
                      confirmLabel="Delete"
                      icon={<Trash weight="regular" />}
                      onConfirm={() => act(() => adminJson(`/golden/${encodeURIComponent(s.id)}`, { method: "DELETE" }))}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Generate onGenerated={(n) => act(async () => undefined, `Generated ${n} new pair${n === 1 ? "" : "s"}.`)} />
      </div>
    </>
  );
}

function Generate({ onGenerated }: { onGenerated: (count: number) => void }) {
  const [count, setCount] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await adminJson<{ count: number }>("/golden/generate", { method: "POST", body: { count_per_doc: count } });
      onGenerated(r.count);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="animate-rise sticky top-6 p-5 [animation-delay:80ms] max-lg:static">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
        <MagicWand weight="regular" className="size-[18px]" />
      </span>
      <h2 className="mt-4 font-serif text-[1.35rem] leading-tight">Generate from your documents</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
        Writes question-and-answer pairs from the documents in <b className="font-medium text-foreground">your</b> account, one AI call
        per document. Review them before trusting a score.
      </p>
      <label className="mt-5 flex items-center justify-between gap-3 text-[13px]">
        <span className="font-medium">Pairs per document</span>
        <select
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          disabled={busy}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-[13.5px] outline-none focus:border-brand"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <Button variant="primary" className="mt-4 w-full" busy={busy} onClick={generate}>
        {busy ? "Generating…" : "Generate pairs"}
      </Button>
      {busy && <p className="mt-2 text-[12px] text-faint">This can take a minute for several documents.</p>}
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-err">
          {error}
        </p>
      )}
      <p className="mt-5 border-t border-hair pt-4 text-[12.5px] leading-relaxed text-faint">
        New uploads get pairs automatically. Then{" "}
        <Link href="/admin/evaluations" className="text-foreground underline decoration-hair-strong underline-offset-4">
          run an evaluation
        </Link>
        .
      </p>
    </Panel>
  );
}

function AddPair({ onCancel, onAdded }: { onCancel: () => void; onAdded: () => void }) {
  const docs = useDocumentNames();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const question = String(form.get("question") ?? "").trim();
    const groundTruth = String(form.get("ground_truth") ?? "").trim();
    if (!question || !groundTruth) {
      setError("Enter both a question and the answer it should get.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminJson("/golden", {
        method: "POST",
        body: { question, ground_truth: groundTruth, source_doc: String(form.get("source_doc") ?? ""), source: "manual" },
      });
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="New pair"
        actions={
          <button type="button" onClick={onCancel} aria-label="Cancel" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-shell">
            <X weight="regular" className="size-4" />
          </button>
        }
      />
      <form onSubmit={submit} className="flex flex-col gap-4 p-5" noValidate>
        <Field label="Question" name="question" autoFocus placeholder="What was revenue in Q3?" />
        <Field
          label="Expected answer"
          name="ground_truth"
          multiline
          placeholder="Revenue was $4.2M, up 12% on Q2."
          hint="What a correct answer says, based only on the documents."
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Source document (optional)</span>
          <select name="source_doc" defaultValue="" className="h-10 rounded-xl border border-input bg-background px-3 text-[14px] outline-none focus:border-brand">
            <option value="">Not specified</option>
            {docs.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="text-[13px] text-err">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" busy={busy}>
            Add pair
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Panel>
  );
}

/** The admin's own document names, for the source picker. Empty on failure: the field is optional. */
function useDocumentNames(): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/v1/documents/history", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((b: { documents: DocumentRecord[] }) => alive && setNames(b.documents.map((d) => d.filename)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return names;
}
