"use client";

import { CaretDown, CaretLeft, CaretRight, CaretUp, CaretUpDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/*
 * The pieces the admin tables share: a sort that can be clicked off again, a
 * sortable header, and pagination controls.
 *
 * Two tables, two kinds of sorting, deliberately. The traces list is paginated
 * by Langfuse, so its sort has to go to the server - sorting the twenty rows on
 * screen would be a lie about the other ninety-nine. The per-user table arrives
 * whole in one response, so it sorts here.
 */

export type SortDir = "asc" | "desc";
export type Sort = { field: string; dir: SortDir } | null;

/**
 * What clicking a column header does: a new column opens descending, because
 * the dearest answer and the slowest answer are the ones worth looking at.
 * Clicking it again flips it; a third click clears the sort and gives the
 * server's own ordering back.
 */
export function nextSort(current: Sort, field: string): Sort {
  if (!current || current.field !== field) return { field, dir: "desc" };
  if (current.dir === "desc") return { field, dir: "asc" };
  return null;
}

/** Langfuse spells its ordering "field.direction". */
export function orderByParam(sort: Sort): string {
  return sort ? `${sort.field}.${sort.dir}` : "";
}

/** The query string for GET /admin/langfuse/traces. */
export function tracesQuery(opts: {
  page: number;
  limit: number;
  userId?: string;
  name?: string;
  sort: Sort;
}): string {
  const params = new URLSearchParams({ page: String(opts.page), limit: String(opts.limit) });
  // Set, never sent empty: Langfuse reads user_id="" as a real id that
  // matches nothing, which would blank an unfiltered page.
  if (opts.userId) params.set("user_id", opts.userId);
  if (opts.name) params.set("name", opts.name);
  const order = orderByParam(opts.sort);
  if (order) params.set("order_by", order);
  return params.toString();
}

/** Compare one field of two rows: numbers numerically, text case-insensitively. */
export function compareRows(a: Record<string, unknown>, b: Record<string, unknown>, field: string): number {
  const av = a[field];
  const bv = b[field];
  // Missing values sink, whichever way the column is pointing, so an empty
  // cell never takes the top row away from a real one.
  const aMissing = av === null || av === undefined || av === "";
  const bMissing = bv === null || bv === undefined || bv === "";
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
}

/**
 * What fraction of `total` this value is, clamped to 0–1.
 *
 * Guarded because the obvious `value / total` yields NaN on a deployment
 * that has spent nothing, and a bar of width "NaN%" is dropped by the
 * browser without complaint - a layout bug nobody would think to look for.
 */
export function shareOf(value: number | null | undefined, total: number): number {
  if (!value || !total || total <= 0) return 0;
  return Math.min(1, value / total);
}

/** A sorted copy. The original is left alone, as React state requires. */
export function sortRows<T extends Record<string, unknown>>(rows: T[], sort: Sort): T[] {
  if (!sort) return rows;
  // A column the rows do not carry would otherwise shuffle them by comparing
  // undefined to undefined.
  if (!rows.some((r) => r[sort.field] !== undefined)) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => compareRows(a, b, sort.field) * dir);
}

// ── Components ───────────────────────────────────────────────────────

/** A column header that sorts, and says which way it is sorting. */
export function SortHeader({
  field,
  sort,
  onSort,
  align = "left",
  className,
  children,
}: {
  field: string;
  sort: Sort;
  onSort: (field: string) => void;
  align?: "left" | "right";
  className?: string;
  children: React.ReactNode;
}) {
  const active = sort?.field === field;
  const Icon = !active ? CaretUpDown : sort.dir === "desc" ? CaretDown : CaretUp;
  return (
    <th className={cn("px-3 py-2.5 font-medium", align === "right" && "text-right", className)}>
      <button
        type="button"
        onClick={() => onSort(field)}
        // aria-sort belongs on the cell, but the label here is what a screen
        // reader announces when the button itself takes focus.
        aria-label={`Sort by ${String(children)}${active ? `, currently ${sort.dir === "desc" ? "descending" : "ascending"}` : ""}`}
        className={cn(
          "inline-flex items-center gap-1 rounded transition-colors hover:text-foreground pointer-coarse:py-2",
          align === "right" && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        {children}
        <Icon weight="regular" className={cn("size-3", active ? "opacity-100" : "opacity-40")} />
      </button>
    </th>
  );
}

/** The aria-sort value for a header cell, so assistive tech reads the state. */
export function ariaSort(sort: Sort, field: string): "ascending" | "descending" | "none" {
  if (sort?.field !== field) return "none";
  return sort.dir === "asc" ? "ascending" : "descending";
}

export function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-shell hover:text-foreground disabled:opacity-40 pointer-coarse:size-10 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

export function Pager({
  page,
  pages,
  busy,
  onPage,
}: {
  page: number;
  pages: number;
  busy: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <PageButton label="Previous page" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>
        <CaretLeft weight="regular" />
      </PageButton>
      <PageButton label="Next page" disabled={page >= pages || busy} onClick={() => onPage(page + 1)}>
        <CaretRight weight="regular" />
      </PageButton>
    </div>
  );
}

/** Rows-per-page, for a table whose page size is worth changing. */
export function PageSize({ value, onChange, options = [20, 50, 100] }: { value: number; onChange: (n: number) => void; options?: number[] }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
      <span className="max-sm:sr-only">Rows</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-hair bg-core px-2 py-1 text-[12.5px] text-foreground outline-none transition-colors focus:border-brand pointer-coarse:py-2"
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
