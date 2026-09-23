"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Fragment, useState } from "react";
import { type LangfuseSummary, type LangfuseTraces, formatCost, formatLatency, formatNumber, formatWhen, traceTitle } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { useAdminData } from "./admin-api";
import { Badge, Empty, ErrorNote, Loading, PageHeader, Panel, PanelHeader } from "./ui";

const PAGE_SIZE = 20;

export function Usage() {
  const summary = useAdminData<LangfuseSummary>("/langfuse/summary");
  const [page, setPage] = useState(1);
  const traces = useAdminData<LangfuseTraces>(`/langfuse/traces?page=${page}&limit=${PAGE_SIZE}`);
  const [openId, setOpenId] = useState<string | null>(null);

  const s = summary.data;
  const notConfigured = (s && !s.enabled) || Boolean(traces.data?.message);
  const pages = traces.data ? Math.max(1, Math.ceil(traces.data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        eyebrow="Admin · Usage & cost"
        title="What each answer costs"
        description="Token use, spend and latency from Langfuse, which traces every question Verity answers."
      />

      {summary.error && <ErrorNote message={summary.error} onRetry={summary.reload} />}

      {notConfigured ? (
        <Panel className="animate-rise">
          <Empty title="Langfuse isn't configured">
            Set LANGFUSE_ENABLED and the Langfuse keys in the backend&apos;s .env, then restart it. Usage appears here once questions are
            traced.
          </Empty>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
            <Stat label="Spend · last 100 traces" value={s?.enabled ? formatCost(s.total_cost) : "—"} delay={0} />
            <Stat label="Tokens · last 100 traces" value={s?.enabled ? formatNumber(s.total_tokens) : "—"} delay={60} />
            <Stat label="Traces recorded" value={traces.data ? formatNumber(traces.data.total) : "—"} delay={120} />
          </div>
          {s?.enabled && s.error && <ErrorNote message={`Langfuse returned an error: ${s.error}`} onRetry={summary.reload} />}

          <Panel className="animate-rise overflow-hidden">
            <PanelHeader
              title="Recent traces"
              meta={traces.data ? `Page ${page} of ${pages}` : undefined}
              actions={
                <div className="flex items-center gap-1">
                  <PageButton label="Previous page" disabled={page <= 1 || traces.loading} onClick={() => setPage((p) => p - 1)}>
                    <CaretLeft weight="regular" />
                  </PageButton>
                  <PageButton label="Next page" disabled={page >= pages || traces.loading} onClick={() => setPage((p) => p + 1)}>
                    <CaretRight weight="regular" />
                  </PageButton>
                </div>
              }
            />
            {traces.loading && !traces.data ? (
              <Loading />
            ) : traces.error ? (
              <div className="p-5">
                <ErrorNote message={traces.error} onRetry={traces.reload} />
              </div>
            ) : traces.data?.error ? (
              <div className="p-5">
                <ErrorNote message={`Langfuse returned an error: ${traces.data.error}`} onRetry={traces.reload} />
              </div>
            ) : !traces.data?.traces.length ? (
              <Empty title="No traces yet">Ask Verity a question and it will show up here.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[13.5px]">
                  <thead>
                    <tr className="border-b border-hair text-[11.5px] uppercase tracking-[0.1em] text-faint">
                      <th className="px-5 py-2.5 font-medium">When</th>
                      <th className="px-3 py-2.5 font-medium">Trace</th>
                      <th className="px-3 py-2.5 text-right font-medium">Tokens in / out</th>
                      <th className="px-3 py-2.5 text-right font-medium">Cost</th>
                      <th className="px-5 py-2.5 text-right font-medium">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traces.data.traces.map((t) => {
                      const open = openId === t.id;
                      return (
                        <Fragment key={t.id}>
                          <tr
                            onClick={() => setOpenId(open ? null : t.id)}
                            className={cn("cursor-pointer border-b border-hair transition-colors hover:bg-shell", open && "bg-shell")}
                          >
                            <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{formatWhen(t.created_at)}</td>
                            <td className="max-w-[320px] px-3 py-3">
                              <button type="button" aria-expanded={open} className="block max-w-full truncate text-left font-medium">
                                {traceTitle(t.input, t.name || t.id.slice(0, 8)).slice(0, 140)}
                              </button>
                              <span className="mt-1 flex flex-wrap gap-1.5">
                                {t.name && <Badge>{t.name}</Badge>}
                                {t.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} tone="brand">
                                    {tag}
                                  </Badge>
                                ))}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[12.5px] text-muted-foreground">
                              {formatNumber(t.usage.input)} / {formatNumber(t.usage.output)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[12.5px]">{formatCost(t.total_cost)}</td>
                            <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-[12.5px]">{formatLatency(t.latency)}</td>
                          </tr>
                          {open && (
                            <tr className="border-b border-hair bg-shell">
                              <td colSpan={5} className="px-5 pb-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <TraceText label="Input">{t.input}</TraceText>
                                  <TraceText label="Output">{t.output}</TraceText>
                                </div>
                                <p className="mt-3 font-mono text-[11.5px] text-faint">
                                  trace {t.id}
                                  {t.session_id ? ` · session ${t.session_id}` : ""}
                                </p>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}

function Stat({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <div className="paper animate-rise rounded-2xl p-6" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-4 font-serif text-[2.5rem] font-normal leading-none tracking-[-0.02em]">{value}</p>
    </div>
  );
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-shell hover:text-foreground disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

function TraceText({ label, children }: { label: string; children: string }) {
  return (
    <div className="rounded-xl border border-hair bg-core p-4">
      <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-faint">{label}</p>
      <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">{children || "—"}</p>
    </div>
  );
}
