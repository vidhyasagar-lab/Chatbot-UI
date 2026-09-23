import {
  ArrowRight,
  ChartLineUp,
  Exam,
  FileMagnifyingGlass,
  FilePdf,
  Lightning,
  Receipt,
  SealCheck,
  UploadSimple,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { Mark, Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

type Props = { signedIn: boolean };

/** Public front page. Every claim on it describes something the backend actually does. */
export function Landing({ signedIn }: Props) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-background">
      <Nav signedIn={signedIn} />

      {/* Hero: editorial split. Headline left, a real-looking answer right. */}
      <section className="mx-auto grid max-w-[1240px] grid-cols-[1.15fr_1fr] items-center gap-14 px-8 pb-28 pt-40 max-lg:grid-cols-1 max-lg:gap-14 max-md:px-4 max-md:pb-20 max-md:pt-32">
        <div className="animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-hair bg-core px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-ok" />
            Eval-gated retrieval
          </p>
          <h1 className="mt-6 font-serif text-[clamp(2.6rem,4.8vw,4.4rem)] font-normal leading-[1.02] tracking-[-0.025em]">
            Answers from your documents. <em className="text-brand">Checked</em> before you read them.
          </h1>
          <p className="mt-7 max-w-[34rem] text-[17px] leading-relaxed text-muted-foreground">
            Upload reports, contracts, notes and scans. Ask in plain language. Every answer cites the page it came from, and a quality
            gate scores it against your sources, rewriting anything they don&apos;t support.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <PrimaryCta href={signedIn ? "/chat" : "/login?mode=register"}>{signedIn ? "Open your chats" : "Create an account"}</PrimaryCta>
            {!signedIn && (
              <Link
                href="/login"
                className="rounded-full px-5 py-3 text-[15px] text-muted-foreground transition-colors duration-300 hover:text-foreground"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        <div className="animate-rise [animation-delay:160ms]">
          <AnswerSpecimen />
        </div>
      </section>

      {/* How it works: three steps, deliberately uneven. */}
      <section id="how" className="mx-auto max-w-[1200px] scroll-mt-28 px-8 py-28 max-md:px-4 max-md:py-20">
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.2rem,4.4vw,3.4rem)] font-normal leading-[1.04] tracking-[-0.02em]">
            Three steps, and the last one is the one that matters.
          </h2>
        </Reveal>
        <div className="mt-16 grid grid-cols-12 gap-5 max-md:grid-cols-1">
          <Reveal className="col-span-4 max-md:col-span-1" delay={0}>
            <Step n="01" icon={<UploadSimple weight="regular" />} title="Upload">
              PDF, Word, text, Markdown or images. Charts, tables and diagrams are read by a vision model, so answers can come from figures,
              not just prose.
            </Step>
          </Reveal>
          <Reveal className="col-span-4 max-md:col-span-1 md:mt-16" delay={100}>
            <Step n="02" icon={<FileMagnifyingGlass weight="regular" />} title="Ask">
              Hybrid search finds the passages, by meaning and by exact wording, and the answer streams in as it is written, citing each
              one.
            </Step>
          </Reveal>
          <Reveal className="col-span-4 max-md:col-span-1 md:mt-32" delay={200}>
            <Step n="03" icon={<SealCheck weight="regular" />} title="Checked" accent>
              RAGAS scores the answer for faithfulness to those passages. Below the bar, it is rewritten from the sources, and you see both.
            </Step>
          </Reveal>
        </div>
      </section>

      {/* The gate: the one idea worth a whole section. */}
      <section id="quality" className="border-y border-hair bg-rail">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 items-center gap-16 px-8 py-32 max-lg:grid-cols-1 max-md:px-4 max-md:py-20">
          <Reveal>
            <Eyebrow>The quality gate</Eyebrow>
            <h2 className="mt-5 font-serif text-[clamp(2.2rem,4.4vw,3.4rem)] font-normal leading-[1.04] tracking-[-0.02em]">
              When an answer isn&apos;t supported, <em className="text-brand">you see it fail.</em>
            </h2>
            <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-muted-foreground">
              Most chatbots hide their mistakes. Verity shows the rejected draft, says why it failed, and streams the rewrite underneath, so
              you learn how far to trust each answer instead of guessing.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <GateSpecimen />
          </Reveal>
        </div>
      </section>

      {/* For whoever runs it. */}
      <section className="mx-auto max-w-[1200px] px-8 py-28 max-md:px-4 max-md:py-20">
        <Reveal>
          <Eyebrow>For admins</Eyebrow>
          <h2 className="mt-5 max-w-3xl font-serif text-[clamp(2rem,3.6vw,2.8rem)] font-normal leading-[1.08] tracking-[-0.02em]">
            Measure quality across every question, not one answer at a time.
          </h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-3 gap-5 max-md:grid-cols-1">
          {[
            { icon: <Exam weight="regular" />, title: "Golden dataset", body: "Question-and-answer pairs written by hand or generated from your documents." },
            { icon: <ChartLineUp weight="regular" />, title: "Evaluation runs", body: "Ask every golden question and score faithfulness, relevance, precision and recall." },
            { icon: <Receipt weight="regular" />, title: "Usage and cost", body: "Tokens, spend and latency for every traced answer, from Langfuse." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <div className="h-full rounded-2xl border border-hair bg-core p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand [&_svg]:size-5">{f.icon}</span>
                <h3 className="mt-5 text-[16px] font-semibold">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Closing call to action. */}
      <section className="mx-auto max-w-[1200px] px-8 pb-32 max-md:px-4 max-md:pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-brand px-12 py-20 text-brand-ink max-md:px-6 max-md:py-14">
            <Mark className="absolute -right-10 -top-14 size-64 rotate-12 rounded-[3.5rem] bg-brand-ink/10 text-[12rem] text-brand-ink/15" />
            <h2 className="relative max-w-2xl font-serif text-[clamp(2.2rem,4.6vw,3.6rem)] font-normal leading-[1.02] tracking-[-0.02em]">
              Stop wondering whether the answer is right.
            </h2>
            <div className="relative mt-10">
              <PrimaryCta href={signedIn ? "/chat" : "/login?mode=register"} inverted>
                {signedIn ? "Open your chats" : "Get started"}
              </PrimaryCta>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-hair">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-8 py-8 text-[13px] text-faint max-md:px-4">
          <Wordmark className="text-[14px] text-muted-foreground" />
          <span>Retrieval-augmented answers, scored with RAGAS.</span>
        </div>
      </footer>
    </div>
  );
}

/** Floating island nav, detached from the top edge. */
function Nav({ signedIn }: Props) {
  return (
    <div className="fixed inset-x-0 top-5 z-30 flex justify-center px-4">
      <nav
        aria-label="Main"
        className="flex items-center gap-1 rounded-full border border-hair bg-glass py-1.5 pl-4 pr-1.5 shadow-[var(--paper-shadow)] backdrop-blur-md"
      >
        <Link href="/" className="mr-3" aria-label="Verity home">
          <Wordmark className="text-[15px]" />
        </Link>
        <a href="#how" className="rounded-full px-3 py-1.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground max-sm:hidden">
          How it works
        </a>
        <a href="#quality" className="rounded-full px-3 py-1.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground max-sm:hidden">
          Quality
        </a>
        <ThemeToggle />
        <Link
          href={signedIn ? "/chat" : "/login"}
          className="ml-1 rounded-full bg-foreground px-4 py-1.5 text-[13.5px] font-medium text-background transition-transform duration-300 ease-spring active:scale-[0.97]"
        >
          {signedIn ? "Open app" : "Sign in"}
        </Link>
      </nav>
    </div>
  );
}

/** Pill CTA with the arrow in its own circle, which nudges on hover. */
function PrimaryCta({ href, children, inverted }: { href: string; children: ReactNode; inverted?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-[15px] font-medium transition-transform duration-500 ease-spring active:scale-[0.98]",
        inverted ? "bg-brand-ink text-brand" : "bg-brand text-brand-ink",
      )}
    >
      {children}
      <span
        className={cn(
          "grid size-9 place-items-center rounded-full transition-transform duration-500 ease-spring group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105",
          inverted ? "bg-brand/15" : "bg-brand-ink/15",
        )}
      >
        <ArrowRight weight="bold" className="size-4" />
      </span>
    </Link>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{children}</p>;
}

function Step({ n, icon, title, accent, children }: { n: string; icon: ReactNode; title: string; accent?: boolean; children: ReactNode }) {
  return (
    <div className={cn("h-full rounded-2xl border p-7", accent ? "border-brand/40 bg-brand-soft" : "border-hair bg-core")}>
      <div className="flex items-center justify-between">
        <span className={cn("grid size-10 place-items-center rounded-xl [&_svg]:size-5", accent ? "bg-brand text-brand-ink" : "bg-shell text-foreground")}>
          {icon}
        </span>
        <span className="font-mono text-[12px] text-faint">{n}</span>
      </div>
      <h3 className="mt-10 font-serif text-[1.9rem] font-normal leading-none">{title}</h3>
      <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function Cite({ n }: { n: number }) {
  return (
    <span className="mx-0.5 inline-grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-[4px] bg-mark px-1 align-[0.12em] font-sans text-[10.5px] font-semibold text-mark-ink">
      {n}
    </span>
  );
}

/** A still of the chat, built from the same pieces as the real one. */
function AnswerSpecimen() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-brand-soft blur-2xl" />
      <figure aria-label="Example answer" className="paper rounded-[1.75rem] p-6 max-md:p-4">
        <div className="flex justify-end">
          <p className="max-w-[80%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[14.5px]">What drove the Q3 revenue increase?</p>
        </div>
        <div className="mt-6 grid grid-cols-[28px_1fr] gap-3.5">
          <Mark className="mt-1 size-7 rounded-lg text-[18px]" />
          <div className="min-w-0">
            <p className="font-serif text-[17px] leading-[1.65]">
              Revenue rose <b className="font-semibold">12% to $4.2M</b>, driven mainly by three enterprise renewals signed in August
              <Cite n={1} />. The pricing change in July added roughly <b className="font-semibold">$310K</b>
              <Cite n={3} />.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {[
                { n: 1, name: "Q3-board-report.pdf", where: "p.4" },
                { n: 3, name: "pricing-review.docx", where: "table" },
              ].map((s) => (
                <span key={s.n} className="inline-flex items-center gap-2 rounded-lg border border-hair bg-core py-1.5 pl-1.5 pr-3 text-[12.5px] text-muted-foreground">
                  <b className="grid size-5 place-items-center rounded-[4px] bg-mark text-[10.5px] font-semibold text-mark-ink">{s.n}</b>
                  <FilePdf weight="regular" className="size-3.5" />
                  <span className="text-foreground">{s.name}</span>
                  <small className="text-faint">{s.where}</small>
                </span>
              ))}
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-1 text-xs text-ok">
              <SealCheck weight="regular" className="size-3.5" />
              Verified · 0.94
            </span>
          </div>
        </div>
      </figure>
    </div>
  );
}

function GateSpecimen() {
  return (
    <figure aria-label="Example of a rejected draft" className="paper flex flex-col gap-4 rounded-[1.75rem] p-6 max-md:p-4">
      <div className="rounded-xl border border-dashed border-hair-strong bg-core-2 p-4">
        <p className="mb-2 flex items-center gap-2 text-[12.5px] font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-warn" />
          Draft rejected by the quality gate: faithfulness 0.31 &lt; 0.75
        </p>
        <p className="text-[14px] leading-relaxed text-faint line-through decoration-faint/40">
          Revenue tripled in Q3 thanks to the new product line launched in September.
        </p>
      </div>
      <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Lightning weight="fill" className="size-3.5 text-brand" />
        Rewritten from the sources
      </p>
      <p className="font-serif text-[17px] leading-[1.65]">
        Revenue rose 12% in Q3<Cite n={1} />. The new product line launches in Q4, so it did not contribute<Cite n={2} />.
      </p>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-1 text-xs text-ok">
        <SealCheck weight="regular" className="size-3.5" />
        Verified · 0.91
      </span>
    </figure>
  );
}
