"use client";

import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { Fragment, useState } from "react";
import {
  type LangfuseTrace,
  type LangfuseUsage,
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
  pageCount,
  pageOf,
  shareOf,
  sortRows,
} from "./data-table";
import { Badge, Empty, ErrorNote, Loading, PageHeader, Panel, PanelHeader } from "./ui";

/*
 * One request serves this whole page, and both tables sort, filter and page
 * in the browser.
 *
 * That is a deliberate reversal. The trace list used to be paginated by
 * Langfuse, so its sort and its filters had to be sent to the server -
 * ordering the twenty rows on screen would have claimed an order over the
 * other ninety-nine - and only the two columns Langfuse would order by could
 * be sorted at all. But reading traces that way cost three requests against
 * an endpoint that allows five a minute, plus three against a metrics API
 * that allows a hundred a day, so the page could not be opened twice in a
 * minute. The backend now takes two reads of Langfuse's observations API and
 * returns the entire window, so every row the table orders is a row it
 * holds, and every column can be sorted honestly.
 */

type Sorted = Record<string, unknown>;

export function Usage() {
  const [days] = useState(30);
  const usage = useAdminData<LangfuseUsage>(`/langfuse/usage?days=${days}`);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");
  // Seeded with the order the rows arrive in, so the When header shows the
  // state it is actually in and the first click flips it. Left null, the
  // first click asked for newest-first - which it already was - and nothing
  // on screen moved.
  const [sort, setSort] = useState<Sort>({ field: "created_at", dir: "desc" });
  const [userSort, setUserSort] = useState<Sort>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Anything that changes which rows are on screen goes back to the first
  // page: staying on page 4 of a filter with one page of results shows an
  // empty table. Done in the handlers rather than an effect, which would
  // render page 4 of the new list before resetting.
  const filterByUser = (id: string) => {
    setUserId(id);
    setPage(1);
  };
  const changeLimit = (n: number) => {
    setLimit(n);
    setPage(1);
  };
  const changeSearch = (text: string) => {
    setSearch(text);
    setPage(1);
  };
  const sortTraces = (field: string) => {
    setSort(nextSort(sort, field));
    setPage(1);
  };

  const data = usage.data;
  const notConfigured = data && !data.enabled;
  const users = data?.users ?? [];
  const totalCost = data?.totals.cost ?? 0;
  const selected = users.find((u) => u.user_id === userId);
  const filterLabel = selected?.username || userId;

  const all = data?.traces ?? [];
  const term = search.trim().toLowerCase();
  const matching = all.filter((t) => {
    if (userId && t.user_id !== userId) return false;
    if (!term) return true;
    return `${traceTitle(t.input, t.name)} ${t.name} ${t.username} ${t.tags.join(" ")}`.toLowerCase().includes(term);
  });
  const ordered = sortRows(matching as unknown as Sorted[], sort) as unknown as LangfuseTrace[];
  const pages = pageCount(ordered.length, limit);
  const visible = pageOf(ordered, page, limit);

  return (
    <>
      <PageHeader
        eyebrow="Admin · Usage & cost"
        title="What each answer costs"
        description={`Token use, spend and latency from Langfuse, which traces every question Verity answers. Last ${days} days.`}
      />

      {usage.error && <ErrorNote message={usage.error} onRetry={usage.reload} />}

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
            <Stat label={`Spend · last ${days} days`} value={data ? formatCost(data.totals.cost) : "—"} delay={0} />
            <Stat label={`Tokens · last ${days} days`} value={data ? formatNumber(data.totals.tokens) : "—"} delay={60} />
            <Stat label="Questions asked" value={data ? formatNumber(data.totals.traces) : "—"} delay={120} />
          </div>

          {data?.error && (
            <ErrorNote message={`Langfuse returned an error: ${data.error}`} onRetry={usage.reload} />
          )}

          {/*
            Said plainly rather than left implied: beyond this many rows the
            snapshot stops reading, and figures built from part of the window
            must not be read as the whole bill.
          */}
          {data?.truncated && (
            <Panel className="animate-rise px-5 py-4 text-[13px] text-muted-foreground">
              This window holds more traces than one snapshot reads, so these totals cover only the most recent of them. Narrow the window
              to see a complete picture.
            </Panel>
          )}

          {/* ── Cost by user ──────────────────────────────────────── */}
          <Panel className="animate-rise overflow-hidden">
            <PanelHeader
              title="Cost by user"
              meta={users.length ? `${users.length} ${users.length === 1 ? "user" : "users"}` : undefined}
            />
            {usage.loading && !data ? (
              <Loading />
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
                    {(sortRows(users as unknown as Sorted[], userSort) as unknown as UserUsage[]).map((u) => {
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
              meta={data ? `Page ${Math.min(page, pages)} of ${pages}` : undefined}
              actions={
                <div className="flex items-center gap-2">
                  <PageSize value={limit} onChange={changeLimit} />
                  <Pager page={page} pages={pages} busy={usage.loading} onPage={setPage} />
                </div>
              }
            />

            <div className="flex flex-wrap items-center gap-2 border-b border-hair px-5 py-3">
              <label className="relative flex min-w-[200px] flex-1 items-center">
                <MagnifyingGlass weight="regular" className="pointer-events-none absolute left-3 size-4 text-faint" />
                <input
                  value={search}
                  onChange={(e) => changeSearch(e.target.value)}
                  placeholder="Search questions and users"
                  aria-label="Search questions and users"
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

            {usage.loading && !data ? (
              <Loading />
            ) : !visible.length ? (
              <Empty title={all.length ? "Nothing matches that" : "No traces yet"}>
                {all.length
                  ? "Clear the search or the user filter to see the full list again."
                  : "Ask Verity a question and it will show up here."}
              </Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="stack-table w-full min-w-[820px] text-left text-[13.5px]">
                  <thead>
                    <tr className="border-b border-hair text-[11.5px] uppercase tracking-[0.1em] text-faint">
                      <SortHeader field="created_at" sort={sort} onSort={sortTraces} className="px-5">
                        When
                      </SortHeader>
                      <SortHeader field="name" sort={sort} onSort={sortTraces}>
                        Trace
                      </SortHeader>
                      {/*
                        Every column sorts now. While Langfuse paginated this
                        list these three could not: it rejects totalCost and
                        latency as an order-by column, and ordering only the
                        page on screen would have claimed an order over the
                        pages it had never seen. The table holds the whole
                        window, so the claim is now true.
                      */}
                      <SortHeader field="tokens" sort={sort} onSort={sortTraces} align="right">
                        Tokens
                      </SortHeader>
                      <SortHeader field="total_cost" sort={sort} onSort={sortTraces} align="right">
                        Cost
                      </SortHeader>
                      <SortHeader field="latency" sort={sort} onSort={sortTraces} align="right" className="px-5">
                        Latency
                      </SortHeader>
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
                            <td data-label="When" className="whitespace-nowrap px-5 py-3 text-muted-foreground" aria-sort={ariaSort(sort, "created_at")}>
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
                              A real 0 is drawn as "0", not a dash: the
                              question never reached a model, which small talk
                              does not, so it genuinely was free.
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
                                      only {t.username}
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
        {children || "—"}
      </p>
    </div>
  );
}
