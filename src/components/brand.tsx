import { cn } from "@/lib/utils";

/** An ink-green seal with a serif V: the mark a checker leaves on a verified page. */
export function Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid size-[22px] shrink-0 place-items-center rounded-[6px] bg-brand font-serif text-[15px] font-medium italic leading-none text-brand-ink",
        className,
      )}
    >
      V
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-serif text-[1.15em] font-medium tracking-[-0.01em]", className)}>
      <Mark />
      Verity
    </span>
  );
}
