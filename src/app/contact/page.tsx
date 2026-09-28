import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ContactChannels } from "@/components/contact/contact-channels";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/backend";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the person who builds Verity, by email or on LinkedIn.",
  alternates: { canonical: "/contact" },
  openGraph: { title: `Contact · ${SITE_NAME}`, description: "Reach the person who builds Verity, by email or on LinkedIn.", url: "/contact" },
};

/** What to say, so a first message arrives with enough to act on. */
const PROMPTS = [
  { title: "Something went wrong", body: "Send the question you asked, the answer you got back, and the document it should have come from." },
  { title: "You want it for your own documents", body: "Say roughly how many documents, what kind, and who would be asking." },
  { title: "You want to know how it works", body: "Ask about any part of it: retrieval, the quality gate, the evaluation runs, or the hosting." },
];

export default async function ContactPage() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <main className="relative flex min-h-[100dvh] flex-col px-6 max-md:px-4">
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between py-5">
        <Link href="/" aria-label={`${SITE_NAME} home`} className="-mx-1 rounded-md px-1 py-0.5 transition-opacity hover:opacity-80">
          <Wordmark className="text-[15px]" />
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto w-full max-w-[1100px] flex-1 pb-24 pt-16 max-md:pb-16 max-md:pt-10">
        <div className="animate-rise max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-hair bg-core px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand" />
            Contact
          </p>
          <h1 className="mt-6 font-serif text-[clamp(2.4rem,5vw,3.9rem)] font-normal leading-[1.03] tracking-[-0.025em]">
            Ask me anything about <em className="text-brand">Verity.</em>
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground max-md:text-[16px]">
            It is designed and built by Vidhyasagar Kokirala, an AI engineer. Both of these reach him directly: email for anything with detail
            in it, LinkedIn for a quick hello.
          </p>
        </div>

        <ContactChannels subject="Verity" className="animate-rise mt-12 [animation-delay:120ms] max-md:mt-9" />

        <section className="animate-rise mt-20 [animation-delay:200ms] max-md:mt-14">
          <h2 className="font-serif text-[1.75rem] font-normal leading-tight tracking-[-0.015em]">What to include</h2>
          <p className="mt-2.5 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground">
            None of this is required. It just saves a round trip.
          </p>
          <ul className="mt-8 grid grid-cols-3 gap-4 max-md:grid-cols-1">
            {PROMPTS.map((p) => (
              <li key={p.title} className="rounded-2xl border border-hair bg-core p-6 max-md:p-5">
                <h3 className="text-[15px] font-semibold">{p.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="animate-rise mt-16 flex flex-wrap items-center gap-3 [animation-delay:280ms] max-md:mt-12">
          <Link
            href={user ? "/chat" : "/"}
            className="group inline-flex items-center gap-3 rounded-full bg-brand py-1.5 pl-6 pr-1.5 text-[15px] font-medium text-brand-ink transition-transform duration-700 ease-spring active:scale-[0.98]"
          >
            {user ? "Back to your chats" : "See what Verity does"}
            <span className="grid size-9 place-items-center rounded-full bg-brand-ink/15 transition-transform duration-700 ease-spring group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105">
              <ArrowRight weight="bold" className="size-4" />
            </span>
          </Link>
          {user && (
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[15px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft weight="regular" className="size-4" />
              Home page
            </Link>
          )}
        </div>
      </div>

      <footer className="mx-auto w-full max-w-[1100px] border-t border-hair py-6 text-[12.5px] text-faint">
        © {new Date().getFullYear()} {SITE_NAME}
      </footer>
    </main>
  );
}
