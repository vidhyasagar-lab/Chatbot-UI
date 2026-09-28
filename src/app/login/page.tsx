import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/backend";

type Search = { searchParams: Promise<{ mode?: string; reason?: string }> };

// One route, two screens: the title and description follow the form that opens.
export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const { mode } = await searchParams;
  return mode === "register"
    ? {
        title: "Create an account",
        description: "Create a Verity account to upload documents, ask questions and get cited answers checked against your sources.",
        alternates: { canonical: "/login?mode=register" },
      }
    : {
        title: "Sign in",
        description: "Sign in to Verity to ask questions across your documents and see where every answer came from.",
        alternates: { canonical: "/login" },
      };
}

export default async function LoginPage({ searchParams }: Search) {
  if (await getCurrentUser()) redirect("/chat");
  // /login?mode=register opens straight on the sign-up form (the landing page links there).
  // /login?reason=idle is where the idle sign-out lands (components/idle-logout.tsx).
  const { mode, reason } = await searchParams;
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 py-16 max-sm:gap-5 max-sm:py-14">
      {/* The Verity logo on the card is the way home; a second "Home" link here would repeat it. */}
      <ThemeToggle className="fixed right-4 top-4 z-10" />
      {reason === "idle" && (
        <p role="status" className="w-full max-w-[420px] rounded-xl bg-mark px-4 py-3 text-[13.5px] text-mark-ink">
          You were signed out after an hour without activity. Sign in to pick up where you left off.
        </p>
      )}
      <AuthForm initialMode={mode === "register" ? "register" : "login"} />
      <p className="max-w-[420px] text-center font-serif text-[15px] italic text-muted-foreground">
        Answers from your documents, cited and checked before you see them.
      </p>
    </main>
  );
}
