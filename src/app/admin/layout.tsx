import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentUser } from "@/lib/backend";

// Each admin page sets its own short title ("Users"); the template places it
// under Admin. Admin screens are private and never indexed.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Verity" },
  description: "Verity admin console: users, golden dataset, evaluation runs, usage and cost.",
  robots: { index: false, follow: false },
};

/**
 * Every /admin page is admins only. The backend enforces this on each call;
 * checking here as well means a non-admin never sees a screen of errors.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/chat");
  return <AdminShell username={user.username}>{children}</AdminShell>;
}
