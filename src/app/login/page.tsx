import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/backend";

export const metadata: Metadata = { title: "Sign in · Verity" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/chat");
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 py-16">
      <ThemeToggle className="fixed right-5 top-5 z-10" />
      <AuthForm />
      <p className="max-w-[420px] text-center font-serif text-[15px] italic text-muted-foreground">
        Answers from your documents, cited and checked before you see them.
      </p>
    </main>
  );
}
