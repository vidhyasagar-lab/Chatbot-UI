/**
 * Turn `[n]` markers in an answer into `#cite-n` links so the renderer can show
 * them as citation chips. The backend labels each retrieved passage `[n]` and
 * reports the same n as the source's chunk_index.
 */

const MARKER = /\[(\d{1,3})\](?!\()/g;

function linkProse(prose: string, ids: Set<string>): string {
  // Odd segments of a backtick split are inline code.
  return prose
    .split("`")
    .map((seg, i) => (i % 2 ? seg : seg.replace(MARKER, (m, n: string) => (ids.has(n) ? `[${n}](#cite-${n})` : m))))
    .join("`");
}

export function linkCitations(markdown: string, ids: Set<string>): string {
  if (ids.size === 0) return markdown;
  // Odd segments of a fence split are code blocks, including one still streaming.
  return markdown
    .split("```")
    .map((seg, i) => (i % 2 ? seg : linkProse(seg, ids)))
    .join("```");
}
