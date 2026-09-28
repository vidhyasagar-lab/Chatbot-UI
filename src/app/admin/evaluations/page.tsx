import type { Metadata } from "next";
import { Evaluations } from "@/components/admin/evaluations";

export const metadata: Metadata = {
  title: "Evaluations",
  description: "Run the golden dataset through the pipeline and compare faithfulness, relevance, precision and recall.",
};

export default function AdminEvaluationsPage() {
  return <Evaluations />;
}
