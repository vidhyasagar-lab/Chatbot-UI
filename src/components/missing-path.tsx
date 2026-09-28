"use client";

import { usePathname } from "next/navigation";

/** The address that 404'd. not-found.tsx is not given the path, so it is read on the client. */
export function MissingPath({ className }: { className?: string }) {
  const pathname = usePathname();
  return <span className={className}>{pathname || "/"}</span>;
}
