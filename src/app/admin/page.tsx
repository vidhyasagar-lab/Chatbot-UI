import type { Metadata } from "next";
import { Overview } from "@/components/admin/overview";

export const metadata: Metadata = {
  // Same segment as the admin layout, so its template doesn't apply here; spelled out instead.
  title: { absolute: "Overview · Admin · Verity" },
  description: "Accounts, answer quality, the golden dataset and spend at a glance.",
};

export default function AdminOverviewPage() {
  return <Overview />;
}
