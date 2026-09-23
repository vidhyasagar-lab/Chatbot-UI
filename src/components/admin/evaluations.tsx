"use client";

import { ArrowLeft, CaretDown, Play } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import { type EvalResult, type EvalRun, type GoldenSample, averageScore, formatWhen, runProgress } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { adminJson, useAdminData } from "./admin-api";
import { Badge, Button, Empty, ErrorNote, Loading, PageHeader, Panel, PanelHeader, Score } from "./ui";

/** A run in progress is re-read on this interval; the backend rate limit is shared, so not faster. */
const POLL_MS = 5000;

function usePolling(active: boolean, reload: () => Promise<void>) {
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => void reload(), POLL_MS);
    return () => window.clearInterval(id);
  }, [active, reload]);
}

function StatusBadge({ run }: { run: EvalRun }) {
  const tone = run.status === "completed" ? "good" : run.status === "failed" ? "poor" : "brand";
  return (
    <Badge tone={tone}>
      {run.status === "running" && <span className="size-1.5 animate-pulse rounded-full bg-brand" />}
      {run.status}
    </Badge>
  );
}

function Progress({ run }: { run: EvalRun }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-hair">
        <span
          className={cn("block h-full origin-left rounded-full transition-transform duration-700 ease-out-expo", run.status === "failed" ? "bg-err" : "bg-brand")}
          style={{ transform: `scaleX(${runProgress(run)})` }}
        />
      </span>
      <span className="font-mono text-[12px] text-muted-foreground">
        {run.completed}/{run.total_samples}
      </span>
    </span>
  );
}

export function Evaluations() {
  const runs = useAdminData<EvalRun[]>("/evaluate/runs");
  const golden = useAdminData<GoldenSample[]>("/golden");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const running = runs.data?.some((r) => r.status === "running") ?? false;
  usePolling(running, runs.reload);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await adminJson("/evaluate", { method: "POST" });
      await runs.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const samples = golden.data?.length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Admin · Evaluations"
        title={
          <>
            Test every answer, <em className="text-brand">all at once.</em>
          </>
        }
        description={
          <>
            A run asks each golden question, then scores the reply with RAGAS: faithfulness to the sources, relevance to the question, and
            how precise and complete the retrieved context was. Retrieval uses the documents in your account.
          </>
        }
        actions={
          <Button
            variant="primary"
            busy={starting}
            disabled={running || samples === 0}
            onClick={start}
            title={samples === 0 ? "Add golden pairs first" : running ? "A run is already in progress" : undefined}
          >
            <Play weight="fill" />
            {running ? "Run in progress" : `Run on ${samples} pair${samples === 1 ? "" : "s"}`}
          </Button>
        }
      />

      {samples === 0 && golden.data && (
        <p className="animate-rise rounded-xl bg-warn-soft px-4 py-3 text-[13.5px]">
          There are no golden pairs to test yet.{" "}
          <Link href="/admin/golden" className="font-medium underline underline-offset-4">
            Build the golden dataset
          </Link>{" "}
          first.
        </p>
      )}
      {error && <ErrorNote message={error} />}

      <Panel className="animate-rise overflow-hidden">
        <PanelHeader title="Runs" meta={running ? "Updating every 5 seconds" : runs.data ? `Last ${runs.data.length}` : undefined} />
        {runs.loading ? (
          <Loading />
        ) : runs.error ? (
          <div className="p-5">
            <ErrorNote message={runs.error} onRetry={runs.reload} />
          </div>
        ) : !runs.data?.length ? (
          <Empty title="No runs yet">Start one to see how answers score against the golden dataset.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-hair text-[11.5px] uppercase tracking-[0.1em] text-faint">
                  <th className="px-5 py-2.5 font-medium">Started</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Progress</th>
                  <th className="px-3 py-2.5 font-medium">Faithful</th>
                  <th className="px-3 py-2.5 font-medium">Relevant</th>
                  <th className="px-3 py-2.5 font-medium">Precision</th>
                  <th className="px-3 py-2.5 font-medium">Recall</th>
                  <th className="px-5 py-2.5 font-medium">Overall</th>
                </tr>
              </thead>
              <tbody>
                {runs.data.map((r) => (
                  <tr key={r.id} className="group relative border-b border-hair last:border-0 transition-colors hover:bg-shell">
                    <td className="px-5 py-3">
                      {/* The whole row opens the run; the link covers it. */}
                      <Link href={`/admin/evaluations/${r.id}`} className="font-medium after:absolute after:inset-0">
                        {formatWhen(r.created_at)}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge run={r} />
                    </td>
                    <td className="px-3 py-3">
                      <Progress run={r} />
                    </td>
                    <td className="px-3 py-3">
                      <Score value={r.avg_faithfulness} />
                    </td>
                    <td className="px-3 py-3">
                      <Score value={r.avg_relevancy} />
                    </td>
                    <td className="px-3 py-3">
                      <Score value={r.avg_context_precision} />
                    </td>
                    <td className="px-3 py-3">
                      <Score value={r.avg_context_recall} />
                    </td>
                    <td className="px-5 py-3">
                      <Score value={averageScore(r)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

export function EvaluationRun({ runId }: { runId: string }) {
  const detail = useAdminData<{ run: EvalRun; results: EvalResult[] }>(`/evaluate/runs/${encodeURIComponent(runId)}`);
  const run = detail.data?.run;
  usePolling(run?.status === "running", detail.reload);

  return (
    <>
      <Link href="/admin/evaluations" className="animate-rise flex w-fit items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft weight="regular" className="size-4" />
        All runs
      </Link>

      {detail.loading ? (
        <Loading label="Loading run…" />
      ) : detail.error || !run ? (
        <ErrorNote message={detail.error ?? "Run not found."} onRetry={detail.reload} />
      ) : (
        <>
          <PageHeader
            eyebrow={`Evaluation · ${formatWhen(run.created_at)}`}
            title={
              <span className="flex flex-wrap items-center gap-3">
                Run {run.id.slice(0, 8)} <StatusBadge run={run} />
              </span>
            }
            description={
              run.status === "running"
                ? `Scoring ${run.completed} of ${run.total_samples} questions. This page updates by itself.`
                : run.status === "failed"
                  ? "The run stopped early. Results scored before the failure are below."
                  : `Scored ${run.completed} of ${run.total_samples} questions${run.completed_at ? `, finished ${formatWhen(run.completed_at)}` : ""}.`
            }
          />

          <div className="grid grid-cols-5 gap-4 max-lg:grid-cols-3 max-sm:grid-cols-2">
            {(
              [
                ["Overall", averageScore(run)],
                ["Faithfulness", run.avg_faithfulness],
                ["Relevancy", run.avg_relevancy],
                // Short labels: a two-line label would push its number out of line with the rest.
                ["Precision", run.avg_context_precision],
                ["Recall", run.avg_context_recall],
              ] as const
            ).map(([label, value], i) => (
              <div key={label} className="paper animate-rise rounded-2xl p-5" style={{ animationDelay: `${i * 50}ms` }}>
                <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                <div className="mt-3">
                  <Score value={value} wide large />
                </div>
              </div>
            ))}
          </div>

          <Panel className="animate-rise overflow-hidden">
            <PanelHeader title="Questions" meta={`${detail.data!.results.length}`} />
            {detail.data!.results.length > 0 && (
              <div
                aria-hidden
                className="grid grid-cols-[1fr_auto_auto] gap-5 border-b border-hair px-5 py-2 text-[11px] uppercase tracking-[0.1em] text-faint max-md:hidden"
              >
                <span>Question</span>
                <span className="flex gap-4">
                  {["Faithful", "Relevant", "Precision", "Recall"].map((h) => (
                    <span key={h} className="min-w-14">
                      {h}
                    </span>
                  ))}
                </span>
                <span className="w-4" />
              </div>
            )}
            {detail.data!.results.length === 0 ? (
              <Empty title={run.status === "running" ? "Scoring the first question…" : "No results"} />
            ) : (
              <ul>
                {detail.data!.results.map((r) => (
                  <ResultRow key={r.id} result={r} />
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </>
  );
}

function ResultRow({ result: r }: { result: EvalResult }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-hair last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-5 px-5 py-4 text-left transition-colors hover:bg-shell max-md:grid-cols-[1fr_auto]"
      >
        <span className="min-w-0 text-[14px] font-medium leading-snug">{r.question}</span>
        <span className="flex gap-4 max-md:hidden">
          <Score value={r.faithfulness} label="Faithfulness" />
          <Score value={r.answer_relevancy} label="Relevancy" />
          <Score value={r.context_precision} label="Context precision" />
          <Score value={r.context_recall} label="Context recall" />
        </span>
        <CaretDown weight="regular" className={cn("size-4 text-faint transition-transform duration-300 ease-spring", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-5 px-5 pb-5 md:grid-cols-2">
          <div className="flex gap-4 md:hidden md:col-span-2">
            <Score value={r.faithfulness} label="Faithfulness" />
            <Score value={r.answer_relevancy} label="Relevancy" />
            <Score value={r.context_precision} label="Precision" />
            <Score value={r.context_recall} label="Recall" />
          </div>
          <Block label="Verity answered">
            {r.answer ? (
              // Answers are Markdown; the raw asterisks read as noise.
              <MessageResponse mode="static">{r.answer}</MessageResponse>
            ) : (
              "No answer was produced."
            )}
          </Block>
          <Block label="Expected">{r.ground_truth}</Block>
          {r.contexts.length > 0 && (
            <details className="md:col-span-2">
              <summary className="cursor-pointer text-[12.5px] font-medium text-muted-foreground">
                Retrieved context ({r.contexts.length} passage{r.contexts.length === 1 ? "" : "s"})
              </summary>
              <ol className="mt-3 flex flex-col gap-2">
                {r.contexts.map((c, i) => (
                  <li key={i} className="rounded-lg bg-core-2 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    {c}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </li>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-hair bg-core-2 p-4">
      <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-faint">{label}</p>
      <div className="mt-2 whitespace-pre-wrap font-serif text-[15px] leading-relaxed [&_p]:whitespace-normal">{children}</div>
    </div>
  );
}
