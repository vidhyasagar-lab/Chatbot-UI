import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentUser } from "@/lib/backend";

export const metadata: Metadata = { title: "Admin · Verity" };

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
