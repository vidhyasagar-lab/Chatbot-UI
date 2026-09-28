"use client";

import { ArrowUpRight, Check, Copy, EnvelopeSimple, LinkedinLogo } from "@phosphor-icons/react";
import { useState } from "react";
import { EMAIL, LINKEDIN_HANDLE, LINKEDIN_URL, mailtoLink } from "@/lib/contact";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/*
 * The two ways to get in touch, as paper cards in a tray: an outer shell with a
 * hairline and a tinted gutter, an inner sheet with its own edge, so each card
 * reads as something set into the page rather than drawn on it.
 *
 * Email carries two actions, which rules out wrapping the card in one <a>: the
 * mailto link covers the card through its own ::after, and the copy button
 * sits above that overlay. Nesting a button inside an anchor would be invalid.
 */

/**
 * `columns` is the shape at desktop width: two side by side on the contact
 * page, one above the other where the space is narrower, such as beside a
 * headline. Both collapse to a single column on phones. It is a prop rather
 * than a class override because two competing grid-cols utilities resolve by
 * stylesheet order, not by which one was passed.
 */
export function ContactChannels({ subject, columns = 2, className }: { subject?: string; columns?: 1 | 2; className?: string }) {
  return (
    <ul className={cn("grid gap-4", columns === 2 ? "grid-cols-2 max-md:grid-cols-1" : "grid-cols-1", className)}>
      <li>
        <EmailCard subject={subject} />
      </li>
      <li>
        <LinkedInCard />
      </li>
    </ul>
  );
}

/**
 * Outer tray, inner sheet. `icon`, `children` and `tail` are separate slots so
 * two cards side by side line up: the icon row is a fixed height and the body
 * follows it, so the labels agree even when one description wraps and the
 * other does not. Only the tail is pushed to the bottom edge.
 */
function Shell({ icon, tail, children }: { icon: React.ReactNode; tail: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="group relative h-full rounded-[1.75rem] border border-hair bg-shell p-1.5 transition-[border-color,transform] duration-700 ease-spring hover:-translate-y-0.5 hover:border-hair-strong">
      <div className="flex h-full flex-col rounded-[calc(1.75rem-0.375rem)] border border-hair bg-core p-6 max-md:p-5">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</span>
          <ArrowDisc />
        </div>
        <div className="mt-6">{children}</div>
        <div className="mt-auto flex min-h-9 items-center pt-6">{tail}</div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">{children}</p>;
}

/** The trailing arrow in its own disc, which leans out as the card is hovered. */
function ArrowDisc() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-shell text-muted-foreground transition-[transform,background-color,color] duration-700 ease-spring group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105 group-hover:bg-brand-soft group-hover:text-brand">
      <ArrowUpRight weight="regular" className="size-4" />
    </span>
  );
}

function EmailCard({ subject }: { subject?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      toast.success("Email address copied.");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy. Select the address and copy it instead.");
    }
  };

  return (
    <Shell
      icon={<EnvelopeSimple weight="light" className="size-5" />}
      tail={
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${EMAIL}`}
          className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border border-hair bg-shell px-3.5 py-2 text-[12.5px] text-muted-foreground transition-[background-color,color,border-color,transform] duration-500 ease-spring hover:border-hair-strong hover:bg-core hover:text-foreground active:scale-[0.98]"
        >
          {copied ? <Check weight="regular" className="size-3.5 text-ok" /> : <Copy weight="regular" className="size-3.5" />}
          {copied ? "Copied" : "Copy address"}
        </button>
      }
    >
      <Label>Email</Label>
      {/* Covers the card, so the whole surface opens a draft. */}
      <a
        href={mailtoLink(subject)}
        className="mt-2 block font-serif text-[1.35rem] leading-tight tracking-[-0.01em] [overflow-wrap:anywhere] after:absolute after:inset-0 max-md:text-[1.2rem]"
      >
        {EMAIL}
      </a>
      <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">Best for anything detailed: questions, bugs, or how Verity was built.</p>
    </Shell>
  );
}

function LinkedInCard() {
  return (
    <Shell
      icon={<LinkedinLogo weight="light" className="size-5" />}
      tail={
        /*
         * The card's one link, styled to match the copy button opposite it, so
         * both cards end on an action instead of a note. It carries the
         * card-covering overlay, which means it must not be positioned itself —
         * `inset-0` resolves against the shell. It has no press transform for
         * the same reason: a transform would become the containing block for
         * its own overlay mid-click and move the target out from under the
         * pointer. The new tab is announced to screen readers rather than
         * printed as a line of body copy.
         */
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-hair bg-shell px-3.5 py-2 text-[12.5px] text-muted-foreground transition-[background-color,color,border-color] duration-500 ease-spring after:absolute after:inset-0 group-hover:border-hair-strong group-hover:bg-core group-hover:text-foreground"
        >
          <LinkedinLogo weight="regular" className="size-3.5" />
          Open profile
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      }
    >
      <Label>LinkedIn</Label>
      <p className="mt-2 font-serif text-[1.35rem] leading-tight tracking-[-0.01em] [overflow-wrap:anywhere] max-md:text-[1.2rem]">
        /in/{LINKEDIN_HANDLE}
      </p>
      <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">Best for a quick message, or to see the rest of the work.</p>
    </Shell>
  );
}
