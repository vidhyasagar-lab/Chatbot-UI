import type { Metadata } from "next";
import { Usage } from "@/components/admin/usage";

export const metadata: Metadata = {
  title: "Usage & cost",
  description: "Tokens, spend and latency for every traced answer, from Langfuse.",
};

export default function AdminUsagePage() {
  return <Usage />;
}
