"use client";

import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { Fragment, useState } from "react";
import {
  type LangfuseByUser,
  type LangfuseSummary,
  type LangfuseTraces,
  type UserUsage,
  formatCost,
  formatLatency,
  formatNumber,
  formatWhen,
  traceTitle,
} from "@/lib/admin";
import { cn } from "@/lib/utils";
import { useAdminData } from "./admin-api";
import {
  type Sort,
  PageSize,
  Pager,
  SortHeader,
  ariaSort,
  nextSort,
  shareOf,
  sortRows,
  tracesQuery,
} from "./data-table";
import { Badge, Empty, ErrorNote, Loading, PageHeader, Panel, PanelHeader } from "./ui";

/*
 * Two tables, sorted two different ways on purpose.
 *
 * "Cost by user" arrives whole in one response, so it sorts in the browser.
 * The trace list is paginated by Langfuse, so its sort and its filters are
 * sent to the server - sorting the twenty rows on screen would claim an
 * order over the other ninety-nine that it does not have.
 */

export function Usage() {
  const [days] = useState(30);
  const summary = useAdminData<LangfuseSummary>(`/langfuse/summary?days=${days}`);
  const byUser = useAdminData<LangfuseByUser>(`/langfuse/by-user?days=${days}`);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");
  // Seeded with the order Langfuse already serves, so the When header shows
  // the state it is actually in and the first click flips it. Left null, the
  // first click asked for timestamp.desc - which is the default - and
  // nothing on screen moved.
  const [sort, setSort] = useState<Sort>({ field: "timestamp", dir: "desc" });
  const [userSort, setUserSort] = useState<Sort>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const traces = useAdminData<LangfuseTraces>(`/langfuse/traces?${tracesQuery({ page, limit, userId, sort })}`);

  // Anything that changes what is being asked for goes back to the first
  // page: staying on page 4 of a filter with one page of results shows an
  // empty table. Done in the handlers rather than an effect, which would
  // fetch page 4 of the new query first and then fetch again after resetting.
  const filterByUser = (id: string) => {
    setUserId(id);
    setPage(1);
  };
  const changeLimit = (n: number) => {
    setLimit(n);
    setPage(1);
  };
  const sortTraces = (field: string) => {
    setSort(nextSort(sort, field));
    setPage(1);
  };

  const s = summary.data;
  const notConfigured = (s && !s.enabled) || Boolean(traces.data?.message);
  const pages = traces.data ? Math.max(1, Math.ceil(traces.data.total / limit)) : 1;

  const users = byUser.data?.users ?? [];
  const totalCost = users.reduce((sum, u) => sum + u.cost, 0);
  const selected = users.find((u) => u.user_id === userId);
  // The filter can be set from a row whose user is not in the current window.
  const filterLabel = selected?.username || userId;

  const rows = traces.data?.traces ?? [];
  const visible = search.trim()
    ? rows.filter((t) =>
        `${traceTitle(t.input, t.name)} ${t.name} ${t.tags.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : rows;

  return (
    <>
      <PageHeader
        eyebrow="Admin · Usage & cost"
        title="What each answer costs"
        description={`Token use, spend and latency from Langfuse, which traces every question Verity answers. Last ${days} days.`}
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
            <Stat label={`Spend · last ${days} days`} value={s?.enabled ? formatCost(s.total_cost) : "—"} delay={0} />
            <Stat label={`Tokens · last ${days} days`} value={s?.enabled ? formatNumber(s.total_tokens) : "—"} delay={60} />
            <Stat label="Traces recorded" value={traces.data ? formatNumber(traces.data.total) : "—"} delay={120} />
          </div>
          {s?.enabled && s.error && <ErrorNote message={`Langfuse returned an error: ${s.error}`} onRetry={summary.reload} />}

          {/* ── Cost by user ──────────────────────────────────────── */}
          <Panel className="animate-rise overflow-hidden">
            <PanelHeader
              title="Cost by user"
              meta={users.length ? `${users.length} ${users.length === 1 ? "user" : "users"}` : undefined}
            />
            {byUser.loading && !byUser.data ? (
              <Loading />
            ) : byUser.error ? (
              <div className="p-5">
                <ErrorNote message={byUser.error} onRetry={byUser.reload} />
              </div>
            ) : byUser.data?.error ? (
              <div className="p-5">
                <ErrorNote message={`Langfuse returned an error: ${byUser.data.error}`} onRetry={byUser.reload} />
              </div>
            ) : !users.length ? (
              <Empty title="Nothing spent yet">Usage appears here once questions have been answered.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="stack-table w-full min-w-[560px] text-left text-[13.5px]">
                  <thead>
                    <tr className="border-b border-hair text-[11.5px] uppercase tracking-[0.1em] text-faint">
                      <SortHeader field="username" sort={userSort} onSort={(f) => setUserSort(nextSort(userSort, f))} className="px-5">
                        User
                      </SortHeader>
                      <SortHeader field="traces" sort={userSort} onSort={(f) => setUserSort(nextSort(userSort, f))} align="right">
                        Questions
                      </SortHeader>
                      <SortHeader field="tokens" sort={userSort} onSort={(f) => setUserSort(nextSort(userSort, f))} align="right">
                        Tokens
                      </SortHeader>
                      <SortHeader field="cost" sort={userSort} onSort={(f) => setUserSort(nextSort(userSort, f))} align="right">
                        Spend
                      </SortHeader>
                      <th className="px-5 py-2.5 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortRows(users as unknown as Record<string, unknown>[], userSort).map((raw) => {
                      const u = raw as unknown as UserUsage;
                      const picked = u.user_id === userId;
                      const canFilter = Boolean(u.user_id);
                      return (
                        <tr
                          key={u.user_id || "unattributed"}
                          onClick={() => canFilter && filterByUser(picked ? "" : u.user_id)}
                          className={cn(
                            "border-b border-hair transition-colors",
                            canFilter && "cursor-pointer hover:bg-shell",
                            picked && "bg-shell",
                          )}
                        >
                          <td data-primary className="px-5 py-3" aria-sort={ariaSort(userSort, "username")}>
                            <button
                              type="button"
                              disabled={!canFilter}
                              aria-pressed={picked}
                              className="block max-w-full truncate text-left font-medium disabled:cursor-default [overflow-wrap:anywhere]"
                            >
                              {u.username}
                            </button>
                            {u.role === "admin" && (
                              <span className="mt-1 inline-flex">
                                <Badge tone="brand">admin</Badge>
                              </span>
                            )}
                          </td>
                          <td data-label="Questions" className="whitespace-nowrap px-3 py-3 text-right font-mono text-[12.5px] text-muted-foreground">
                            {formatNumber(u.traces)}
                          </td>
                          <td data-label="Tokens" className="whitespace-nowrap px-3 py-3 text-right font-mono text-[12.5px] text-muted-foreground">
                            {formatNumber(u.tokens)}
                          </td>
                          <td data-label="Spend" className="whitespace-nowrap px-3 py-3 text-right font-mono text-[12.5px]">
                            {formatCost(u.cost)}
                          </td>
                          <td data-label="Share" className="px-5 py-3">
                            <div className="ml-auto flex w-24 items-center gap-2 max-md:ml-0 max-md:w-full">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-shell">
                                <div className="h-full rounded-full bg-brand" style={{ width: `${shareOf(u.cost, totalCost) * 100}%` }} />
                              </div>
                              <span className="w-9 shrink-0 text-right font-mono text-[11.5px] text-faint">
                                {Math.round(shareOf(u.cost, totalCost) * 100)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* ── Traces ────────────────────────────────────────────── */}
          <Panel className="animate-rise overflow-hidden">
            <PanelHeader
              title="Traces"
              meta={traces.data ? `Page ${page} of ${pages}` : undefined}
              actions={
                <div className="flex items-center gap-2">
                  <PageSize value={limit} onChange={changeLimit} />
                  <Pager page={page} pages={pages} busy={traces.loading} onPage={setPage} />
                </div>
              }
            />

            <div className="flex flex-wrap items-center gap-2 border-b border-hair px-5 py-3">
              <label className="relative flex min-w-[200px] flex-1 items-center">
                <MagnifyingGlass weight="regular" className="pointer-events-none absolute left-3 size-4 text-faint" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search questions on this page"
                  aria-label="Search questions on this page"
                  className="h-9 w-full rounded-lg border border-hair bg-core pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-brand pointer-coarse:h-11"
                />
              </label>
              {userId && (
                <button
                  type="button"
                  onClick={() => filterByUser("")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-shell px-3 py-1.5 text-[12.5px] transition-colors hover:border-hair-strong hover:text-foreground pointer-coarse:py-2"
                >
                  <span className="max-w-[220px] truncate">{filterLabel}</span>
                  <X weight="regular" className="size-3.5 shrink-0" />
                  <span className="sr-only">Clear the user filter</span>
                </button>
              )}
            </div>

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
            ) : !visible.length ? (
              <Empty title={rows.length ? "Nothing matches that search" : "No traces yet"}>
                {rows.length
                  ? "Clear the search to see this page again."
                  : userId
                    ? "This user hasn't asked anything in this window."
                    : "Ask Verity a question and it will show up here."}
              </Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="stack-table w-full min-w-[800px] text-left text-[13.5px]">
                  <thead>
                    <tr className="border-b border-hair text-[11.5px] uppercase tracking-[0.1em] text-faint">
                      <SortHeader field="timestamp" sort={sort} onSort={sortTraces} className="px-5">
                        When
                      </SortHeader>
                      <SortHeader field="name" sort={sort} onSort={sortTraces}>
                        Trace
                      </SortHeader>
                      {/*
                        Tokens, cost and latency are not sortable, and
                        deliberately offer no affordance saying they are:
                        Langfuse rejects them as an order-by column, and
                        sorting only the page on screen would claim an order
                        over the other pages that it does not have. To rank
                        by spend, use the panel above - it holds every row.
                      */}
                      <th className="px-3 py-2.5 text-right font-medium">Tokens</th>
                      <th className="px-3 py-2.5 text-right font-medium">Cost</th>
                      <th className="px-5 py-2.5 text-right font-medium">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((t) => {
                      const open = openId === t.id;
                      return (
                        <Fragment key={t.id}>
                          <tr
                            onClick={() => setOpenId(open ? null : t.id)}
                            className={cn("cursor-pointer border-b border-hair transition-colors hover:bg-shell", open && "bg-shell")}
                          >
                            <td data-label="When" className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                              {formatWhen(t.created_at)}
                            </td>
                            <td data-primary className="max-w-[320px] px-3 py-3">
                              {/* The row handles the click; this button gives keyboard and screen reader users the same toggle. */}
                              <button
                                type="button"
                                aria-expanded={open}
                                className="block max-w-full truncate text-left font-medium max-md:line-clamp-2 max-md:whitespace-normal max-md:[overflow-wrap:anywhere]"
                              >
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
                            {/*
                              formatNumber draws null as an em dash and 0 as
                              "0", which is the distinction that matters
                              here: small talk never reaches a model and
                              really did cost nothing, while null means
                              Langfuse could not say.
                            */}
                            <td data-label="Tokens" className="whitespace-nowrap px-3 py-3 text-right font-mono text-[12.5px] text-muted-foreground">
                              {formatNumber(t.tokens)}
                            </td>
                            <td data-label="Cost" className="whitespace-nowrap px-3 py-3 text-right font-mono text-[12.5px]">
                              {formatCost(t.total_cost)}
                            </td>
                            <td data-label="Latency" className="whitespace-nowrap px-5 py-3 text-right font-mono text-[12.5px]">
                              {formatLatency(t.latency)}
                            </td>
                          </tr>
                          {open && (
                            <tr className="border-b border-hair bg-shell">
                              <td colSpan={5} className="px-5 pb-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <TraceText label="Input">{t.input}</TraceText>
                                  <TraceText label="Output">{t.output}</TraceText>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] text-faint">
                                  <span className="[overflow-wrap:anywhere]">trace {t.id}</span>
                                  {t.session_id && <span className="[overflow-wrap:anywhere]">session {t.session_id}</span>}
                                  {t.user_id && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        filterByUser(t.user_id);
                                      }}
                                      className="underline decoration-hair-strong underline-offset-4 transition-colors hover:text-foreground"
                                    >
                                      only this user
                                    </button>
                                  )}
                                </div>
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
    <div className="paper animate-rise rounded-2xl p-6 max-md:p-5" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-4 font-serif text-[2.5rem] font-normal leading-none tracking-[-0.02em] max-md:mt-3 max-md:text-[2.1rem]">{value}</p>
    </div>
  );
}

function TraceText({ label, children }: { label: string; children: string }) {
  return (
    <div className="rounded-xl border border-hair bg-core p-4">
      <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-faint">{label}</p>
      <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
        {children || "Nothing recorded."}
      </p>
    </div>
  );
}
