/** Shared between the chat route and the client so a 401 can send the user to sign in. */
export const SESSION_EXPIRED = "Your session has expired. Sign in again.";

export function messageForStatus(status: number): string {
  if (status === 401) return SESSION_EXPIRED;
  if (status === 404) return "That conversation no longer exists. Start a new chat.";
  if (status === 429) return "You're sending messages too quickly. Wait a moment, then retry.";
  return "The answer service is unavailable right now. Try again.";
}
