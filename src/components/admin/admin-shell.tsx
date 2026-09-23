"use client";

import { ArrowLeft, ChartLineUp, Exam, House, Receipt, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: House },
  { href: "/admin/users", label: "Users", icon: UsersThree },
  { href: "/admin/golden", label: "Golden dataset", icon: Exam },
  { href: "/admin/evaluations", label: "Evaluations", icon: ChartLineUp },
  { href: "/admin/usage", label: "Usage & cost", icon: Receipt },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminShell({ username, children }: { username: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid min-h-[100dvh] grid-cols-[248px_1fr] bg-background max-md:grid-cols-1">
      <aside className="sticky top-0 flex h-[100dvh] flex-col gap-6 border-r border-hair bg-rail px-3 py-4 max-md:hidden">
        <div className="flex items-center justify-between px-2">
          <span className="flex items-baseline gap-2">
            <Wordmark className="text-[15px]" />
            <span className="rounded-md bg-mark px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mark-ink">
              Admin
            </span>
          </span>
          <ThemeToggle />
        </div>
        <nav aria-label="Admin" className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
                  active
                    ? "bg-core font-medium text-foreground shadow-[0_0_0_1px_var(--hair)]"
                    : "text-muted-foreground hover:bg-shell hover:text-foreground",
                )}
              >
                <Icon weight={active ? "fill" : "regular"} className={cn("size-[18px]", active && "text-brand")} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        <div className="flex flex-col gap-2 border-t border-hair px-2 pt-3">
          <Link
            href="/chat"
            className="flex items-center gap-2 rounded-lg py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft weight="regular" className="size-4" />
            Back to chat
          </Link>
          <p className="truncate text-[12px] text-faint">Signed in as {username}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Phones: brand row, then the sections as a scrollable tab strip. */}
        <div className="sticky top-0 z-20 border-b border-hair bg-glass backdrop-blur-sm md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/chat" aria-label="Back to chat" className="flex items-center gap-2 text-muted-foreground">
              <ArrowLeft weight="regular" className="size-4" />
              <Wordmark className="text-[15px] text-foreground" />
            </Link>
            <ThemeToggle />
          </div>
          <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none]">
            {NAV.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors",
                    active ? "bg-brand text-brand-ink" : "text-muted-foreground hover:bg-shell",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-10 pb-24 pt-12 max-lg:px-6 max-md:px-4 max-md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
