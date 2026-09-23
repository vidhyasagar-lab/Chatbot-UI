"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  type AdminStats,
  type EvalRun,
  type GoldenSample,
  type LangfuseSummary,
  formatCost,
  formatNumber,
  formatWhen,
} from "@/lib/admin";
import { formatBytes } from "@/lib/documents";
import { cn } from "@/lib/utils";
import { useAdminData } from "./admin-api";
import { Badge, ErrorNote, PageHeader, Score } from "./ui";

export function Overview() {
  const stats = useAdminData<AdminStats>("/stats");
  const runs = useAdminData<EvalRun[]>("/evaluate/runs");
  const golden = useAdminData<GoldenSample[]>("/golden");
  const usage = useAdminData<LangfuseSummary>("/langfuse/summary");

  const s = stats.data;
  const latest = runs.data?.[0];

  return (
    <>
      <PageHeader
        eyebrow="Admin · Overview"
        title={
          <>
            How Verity is <em className="text-brand">doing.</em>
          </>
        }
        description="Everything stored, everyone using it, and how well answers hold up against the sources."
      />

      {stats.error && <ErrorNote message={stats.error} onRetry={stats.reload} />}

      {/* Asymmetric bento: one tall tile for the knowledge base, smaller tiles around it. */}
      <div className="grid grid-cols-12 gap-4 max-lg:grid-cols-6 max-md:grid-cols-1">
        <Tile className="col-span-7 row-span-2 max-lg:col-span-6 max-md:col-span-1" delay={0}>
          <TileLabel>Knowledge base</TileLabel>
          <p className="mt-6 font-serif text-[clamp(3.5rem,7vw,5.5rem)] font-normal leading-none tracking-[-0.03em]">
            {s ? formatNumber(s.total_docs) : "—"}
          </p>
          <p className="mt-2 text-[14px] text-muted-foreground">documents uploaded across all users</p>
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-hair pt-6 sm:grid-cols-4">
            <Metric label="Chunks" value={s ? formatNumber(s.total_chunks) : "—"} />
            <Metric label="Figures" value={s ? formatNumber(s.total_images) : "—"} />
            <Metric label="Storage" value={s ? formatBytes(s.total_size_bytes) : "—"} />
            <Metric label="Vectors indexed" value={s ? formatNumber(s.total_documents) : "—"} />
          </dl>
        </Tile>

        <Tile href="/admin/users" className="col-span-5 max-lg:col-span-3 max-md:col-span-1" delay={60}>
          <TileLabel>Users</TileLabel>
          <BigNumber>{s ? formatNumber(s.total_users) : "—"}</BigNumber>
          <p className="text-[13px] text-muted-foreground">accounts, including admins</p>
        </Tile>

        <Tile href="/admin/evaluations" className="col-span-5 max-lg:col-span-3 max-md:col-span-1" delay={120}>
          <TileLabel>Latest evaluation</TileLabel>
          {runs.error ? (
            <p className="mt-4 text-[13px] text-err">{runs.error}</p>
          ) : !runs.data ? (
            <p className="mt-4 text-[13px] text-faint">Loading…</p>
          ) : !latest ? (
            <p className="mt-4 text-[13.5px] text-muted-foreground">No runs yet. Build a golden dataset, then run one.</p>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-2">
                <Badge tone={latest.status === "completed" ? "good" : latest.status === "failed" ? "poor" : "brand"}>
                  {latest.status}
                </Badge>
                <span className="text-[12.5px] text-faint">{formatWhen(latest.created_at)}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Score value={latest.avg_faithfulness} label="Faithfulness" wide />
                <Score value={latest.avg_relevancy} label="Relevancy" wide />
              </div>
              <p className="mt-2 text-[12px] text-faint">Faithfulness · Relevancy</p>
            </>
          )}
        </Tile>

        <Tile href="/admin/golden" className="col-span-6 max-lg:col-span-3 max-md:col-span-1" delay={180}>
          <TileLabel>Golden dataset</TileLabel>
          <BigNumber>{golden.data ? formatNumber(golden.data.length) : "—"}</BigNumber>
          <p className="text-[13px] text-muted-foreground">question-and-answer pairs used to test quality</p>
        </Tile>

        <Tile href="/admin/usage" className="col-span-6 max-lg:col-span-3 max-md:col-span-1" delay={240}>
          <TileLabel>Usage · last 100 traces</TileLabel>
          {usage.data && !usage.data.enabled ? (
            <p className="mt-4 text-[13.5px] text-muted-foreground">Langfuse isn&apos;t configured on the backend.</p>
          ) : usage.data && "error" in usage.data && usage.data.error ? (
            <p className="mt-4 text-[13px] text-err">Langfuse returned an error.</p>
          ) : (
            <>
              <BigNumber>{usage.data?.enabled ? formatCost(usage.data.total_cost) : "—"}</BigNumber>
              <p className="text-[13px] text-muted-foreground">
                {usage.data?.enabled
                  ? `${formatNumber(usage.data.total_tokens)} tokens over ${formatNumber(usage.data.trace_count)} traces`
                  : "Loading…"}
              </p>
            </>
          )}
        </Tile>
      </div>
    </>
  );
}

function Tile({ href, className, delay, children }: { href?: string; className?: string; delay: number; children: ReactNode }) {
  const body = (
    <>
      {children}
      {href && (
        <ArrowUpRight
          weight="regular"
          aria-hidden
          className="absolute right-5 top-5 size-4 text-faint transition-transform duration-500 ease-spring group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
        />
      )}
    </>
  );
  const cls = cn(
    "paper animate-rise relative flex flex-col rounded-2xl p-6",
    href && "group transition-[border-color,transform] duration-500 ease-spring hover:-translate-y-0.5 hover:border-hair-strong",
    className,
  );
  return href ? (
    <Link href={href} className={cls} style={{ animationDelay: `${delay}ms` }}>
      {body}
    </Link>
  ) : (
    <section className={cls} style={{ animationDelay: `${delay}ms` }}>
      {body}
    </section>
  );
}

function TileLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{children}</p>;
}

function BigNumber({ children }: { children: ReactNode }) {
  return <p className="mt-4 font-serif text-[2.75rem] font-normal leading-none tracking-[-0.02em]">{children}</p>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-faint">{label}</dt>
      <dd className="mt-1 font-mono text-[15px] font-medium">{value}</dd>
    </div>
  );
}
