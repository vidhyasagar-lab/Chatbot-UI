"use client";

import { ArrowClockwise, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { type Tone, scoreTone } from "@/lib/admin";
import { cn } from "@/lib/utils";

/** Page title block: small eyebrow, serif heading, one line of context, actions on the right. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="animate-rise flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="max-w-2xl">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,2.75rem)] font-normal leading-[1.05] tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("paper rounded-2xl", className)}>{children}</section>;
}

export function PanelHeader({ title, meta, actions }: { title: string; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair px-5 py-3.5">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        {meta && <span className="text-[12.5px] text-faint">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "quiet" | "danger";
  busy?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
};

export function Button({ children, onClick, type = "button", variant = "quiet", busy, disabled, className, title }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
      aria-busy={busy || undefined}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-[13.5px] font-medium transition-[background-color,border-color,filter,transform] duration-300 ease-spring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4",
        variant === "primary" && "bg-brand text-brand-ink hover:brightness-110",
        variant === "quiet" && "border border-hair-strong bg-core text-foreground hover:border-faint",
        variant === "danger" && "bg-err-soft text-err hover:brightness-95",
        className,
      )}
    >
      {busy && <CircleNotch weight="regular" className="animate-spin" />}
      {children}
    </button>
  );
}

/** A destructive action that asks once, inline, before it happens. */
export function ConfirmButton({
  label,
  confirmLabel,
  question,
  onConfirm,
  icon,
  compact,
}: {
  label: string;
  confirmLabel: string;
  question: string;
  onConfirm: () => Promise<unknown> | void;
  icon?: ReactNode;
  compact?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirm = (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-err-soft py-1 pl-3 pr-1 text-[12.5px] text-err">
      {question}
      <button
        type="button"
        autoFocus
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setAsking(false);
          }
        }}
        className="rounded-md px-2 py-1 font-semibold transition-colors hover:bg-err-soft disabled:opacity-60"
      >
        {busy ? "…" : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-shell"
      >
        Cancel
      </button>
    </span>
  );
  // Compact (in a table row): the question floats over the row from a fixed-size
  // anchor, so asking never widens the column and shifts the whole table.
  if (compact && asking) {
    return (
      <span className="relative inline-block size-8 align-middle">
        {/* Opaque backing: the confirm's own tint is translucent and the row text would show through. */}
        <span className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-core">{confirm}</span>
      </span>
    );
  }
  if (!asking) {
    return compact ? (
      <button
        type="button"
        onClick={() => setAsking(true)}
        aria-label={label}
        title={label}
        className="grid size-8 place-items-center rounded-lg text-faint transition-colors hover:bg-err-soft hover:text-err [&_svg]:size-4"
      >
        {icon}
      </button>
    ) : (
      <Button onClick={() => setAsking(true)}>
        {icon}
        {label}
      </Button>
    );
  }
  return confirm;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <p role="alert" className="animate-rise flex items-center gap-3 rounded-xl bg-err-soft px-4 py-3 text-[13.5px]">
      <WarningCircle weight="regular" className="size-5 shrink-0 text-err" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] transition-colors hover:bg-shell"
        >
          <ArrowClockwise weight="regular" className="size-3.5" />
          Retry
        </button>
      )}
    </p>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-2.5 px-5 py-8 text-[13.5px] text-muted-foreground">
      <span className="size-2 animate-pulse rounded-full bg-brand" />
      {label}
    </p>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
      <p className="font-serif text-[1.25rem]">{title}</p>
      {children && <p className="max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  );
}

const TONE_TEXT: Record<Tone, string> = {
  good: "text-ok",
  fair: "text-warn",
  poor: "text-err",
  none: "text-faint",
};
const TONE_BAR: Record<Tone, string> = {
  good: "bg-ok",
  fair: "bg-warn",
  poor: "bg-err",
  none: "bg-hair-strong",
};

/** A 0–1 score as a number and a thin bar, coloured by band. */
export function Score({
  value,
  label,
  wide,
  large,
}: {
  value: number | null | undefined;
  label?: string;
  wide?: boolean;
  large?: boolean;
}) {
  const tone = scoreTone(value);
  return (
    <span className={cn("inline-flex flex-col", large ? "gap-2" : "gap-1", wide ? "min-w-28" : "min-w-14")} title={label}>
      <span
        className={cn(
          large ? "font-serif text-[2rem] font-normal leading-none" : "font-mono text-[13px] font-medium",
          TONE_TEXT[tone],
        )}
      >
        {value === null || value === undefined ? "—" : value.toFixed(2)}
      </span>
      <span className="h-1 w-full overflow-hidden rounded-full bg-hair">
        <span
          className={cn("block h-full origin-left rounded-full transition-transform duration-700 ease-out-expo", TONE_BAR[tone])}
          style={{ transform: `scaleX(${value ?? 0})` }}
        />
      </span>
    </span>
  );
}

export function Badge({ tone = "none", children }: { tone?: Tone | "brand"; children: ReactNode }) {
  return (
    <span
      className={cn(
        // font-sans: a badge can sit inside a serif heading.
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-sans text-[11.5px] font-medium tracking-normal",
        tone === "good" && "bg-ok-soft text-ok",
        tone === "fair" && "bg-warn-soft text-warn",
        tone === "poor" && "bg-err-soft text-err",
        tone === "brand" && "bg-brand-soft text-brand",
        tone === "none" && "bg-shell text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

/** Labelled text field in the house style. */
export function Field({
  label,
  hint,
  multiline,
  ...input
}: { label: string; hint?: string; multiline?: boolean } & React.InputHTMLAttributes<HTMLInputElement> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const cls =
    "w-full rounded-xl border border-input bg-background px-3.5 text-[14.5px] outline-none transition-[border-color,box-shadow] duration-300 ease-spring focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)]";
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      {multiline ? (
        <textarea rows={3} className={cn(cls, "resize-y py-2.5 leading-relaxed")} {...input} />
      ) : (
        <input className={cn(cls, "h-10")} {...input} />
      )}
      {hint && <span className="text-[11.5px] text-faint">{hint}</span>}
    </label>
  );
}
