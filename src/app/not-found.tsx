import { ArrowLeft, ArrowRight, SealWarning } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { MissingPath } from "@/components/missing-path";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/backend";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This address doesn't match any page on Verity.",
  robots: { index: false, follow: false },
};

/** Every unknown URL lands here, in the same voice as the quality gate: no source, so no page. */
export default async function NotFound() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <main className="relative flex min-h-[100dvh] flex-col px-4">
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between py-5">
        <Link href="/" aria-label={`${SITE_NAME} home`}>
          <Wordmark className="text-[15px]" />
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto grid w-full max-w-[1100px] flex-1 grid-cols-[1.1fr_1fr] items-center gap-14 py-16 max-lg:grid-cols-1 max-lg:gap-10">
        <div className="animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-hair bg-core px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-warn" />
            Error 404
          </p>
          <h1 className="mt-6 font-serif text-[clamp(2.4rem,4.6vw,4rem)] font-normal leading-[1.03] tracking-[-0.025em]">
            This page isn&apos;t in <em className="text-brand">any of your documents.</em>
          </h1>
          <p className="mt-6 max-w-[32rem] text-[16.5px] leading-relaxed text-muted-foreground">
            The link may be old, or the address mistyped. Nothing was lost: your chats and files are where you left them.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={user ? "/chat" : "/"}
              className="group inline-flex items-center gap-3 rounded-full bg-brand py-1.5 pl-6 pr-1.5 text-[15px] font-medium text-brand-ink transition-transform duration-500 ease-spring active:scale-[0.98]"
            >
              {user ? "Back to your chats" : "Back to the home page"}
              <span className="grid size-9 place-items-center rounded-full bg-brand-ink/15 transition-transform duration-500 ease-spring group-hover:translate-x-1">
                <ArrowRight weight="bold" className="size-4" />
              </span>
            </Link>
            <Link
              href={user ? "/" : "/login"}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[15px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {user ? (
                <>
                  <ArrowLeft weight="regular" className="size-4" />
                  Home page
                </>
              ) : (
                "Sign in"
              )}
            </Link>
          </div>
        </div>

        <figure aria-label="The missing address, rejected like an unsupported answer" className="paper animate-rise flex flex-col gap-4 rounded-[1.75rem] p-6 [animation-delay:140ms] max-md:p-4">
          <div className="rounded-xl border border-dashed border-hair-strong bg-core-2 p-4">
            <p className="mb-2 flex items-center gap-2 text-[12.5px] font-medium text-muted-foreground">
              <SealWarning weight="regular" className="size-4 text-warn" />
              Rejected by the quality gate: no source found
            </p>
            <MissingPath className="block break-all font-mono text-[14px] text-faint line-through decoration-faint/40" />
          </div>
          <p className="font-serif text-[17px] leading-[1.65]">
            Retrieval came back empty for this address, so rather than guess, Verity is telling you plainly: there is nothing here.
          </p>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-1 text-xs text-warn">
            Faithfulness · 0.00
          </span>
        </figure>
      </div>

      <footer className="mx-auto w-full max-w-[1100px] border-t border-hair py-6 text-[12.5px] text-faint">
        © {new Date().getFullYear()} {SITE_NAME}
      </footer>
    </main>
  );
}
