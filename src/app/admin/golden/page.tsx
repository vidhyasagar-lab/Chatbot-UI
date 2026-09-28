import type { Metadata } from "next";
import { Golden } from "@/components/admin/golden";

export const metadata: Metadata = {
  title: "Golden dataset",
  description: "The question-and-answer pairs every evaluation run is scored against.",
};

export default function AdminGoldenPage() {
  return <Golden />;
}
