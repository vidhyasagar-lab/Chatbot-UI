/** Site identity, shared by metadata, the footer and the 404 page. */

export const SITE_NAME = "Verity";
export const TAGLINE = "Answers from your documents, checked";
export const DESCRIPTION =
  "Upload reports, contracts and scans, ask in plain language, and get answers that cite the page they came from, each one checked against your sources before you read it.";

/**
 * Absolute base for Open Graph and canonical URLs. NEXT_PUBLIC_SITE_URL wins
 * when set (a custom domain); on Vercel the production URL is provided
 * automatically; locally it is the dev server.
 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}
