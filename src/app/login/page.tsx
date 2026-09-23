import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/backend";

export const metadata: Metadata = { title: "Sign in · Verity" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (await getCurrentUser()) redirect("/chat");
  // /login?mode=register opens straight on the sign-up form (the landing page links there).
  const { mode } = await searchParams;
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 py-16">
      <Link href="/" aria-label="Verity home" className="fixed left-5 top-5 z-10 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
        ← Home
      </Link>
      <ThemeToggle className="fixed right-5 top-5 z-10" />
      <AuthForm initialMode={mode === "register" ? "register" : "login"} />
      <p className="max-w-[420px] text-center font-serif text-[15px] italic text-muted-foreground">
        Answers from your documents, cited and checked before you see them.
      </p>
    </main>
  );
}
