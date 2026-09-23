"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { useState } from "react";
import type { Figure } from "@/lib/chat-types";

/** Same-origin URL for a backend figure; the proxy adds the API key and the cookie proves ownership. */
export function figureUrl(path: string): string {
  return `/api/v1/documents/figure?path=${encodeURIComponent(path)}`;
}

const LABEL: Record<string, string> = {
  chart: "Chart",
  table: "Table",
  flowchart: "Flowchart",
  diagram: "Diagram",
  image: "Image",
};

/** The charts, tables and diagrams an answer drew on. Each opens full size in a new tab. */
export function FigureStrip({ figures }: { figures: Figure[] }) {
  // A figure deleted with its document, or refused by the backend, just drops out.
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const shown = figures.filter((f) => !broken.has(f.path));
  if (shown.length === 0) return null;

  return (
    <ul aria-label="Figures used" className="grid grid-cols-3 gap-2 max-sm:grid-cols-2">
      {shown.map((f) => {
        const caption = [LABEL[f.contentType] ?? "Figure", f.page !== "" ? `p.${f.page}` : null, f.source]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={f.path}>
            <a
              href={figureUrl(f.path)}
              target="_blank"
              rel="noreferrer"
              title={`Open ${caption}`}
              className="group block overflow-hidden rounded-xl border border-hair bg-core transition-[border-color,transform] duration-300 ease-spring hover:border-hair-strong active:scale-[0.99]"
            >
              <span className="relative block aspect-[4/3] overflow-hidden bg-core-2">
                {/* A plain img: the figure is private and comes through the API proxy, not the image optimiser. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={figureUrl(f.path)}
                  alt={caption}
                  loading="lazy"
                  onError={() => setBroken((b) => new Set(b).add(f.path))}
                  className="size-full object-contain p-1.5 transition-transform duration-500 ease-spring group-hover:scale-[1.03]"
                />
                <ArrowSquareOut
                  weight="regular"
                  aria-hidden
                  className="absolute right-1.5 top-1.5 size-4 rounded-md bg-glass p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                />
              </span>
              <span className="block truncate px-2.5 py-1.5 text-[11.5px] text-muted-foreground">{caption}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
