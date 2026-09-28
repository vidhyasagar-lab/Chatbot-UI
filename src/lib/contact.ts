/**
 * How to reach the person who builds Verity. One source for the landing tile,
 * the contact page and the footer, so an address can never drift between them.
 */

export const EMAIL = "vidhyasagar54321@gmail.com";
export const LINKEDIN_URL = "https://www.linkedin.com/in/kokirala-vidhyasagar/";
export const LINKEDIN_HANDLE = "kokirala-vidhyasagar";

/**
 * A mailto with the subject already filled in, so a reply thread arrives
 * recognisable. Encoded, because a raw space or colon in a subject is not a
 * valid URL and some clients drop the rest of the line.
 */
export function mailtoLink(subject = "Verity"): string {
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`;
}
