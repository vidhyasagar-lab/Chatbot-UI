/**
 * App-wide success and failure messages.
 *
 * A tiny store rather than a library: components call toast.success/error,
 * and the one <Toaster /> in the root layout renders whatever is queued. The
 * root layout survives client-side navigation, so a message raised just
 * before router.replace still shows on the next page. For a full page load
 * (window.location), use toast.flash, which carries one message across it.
 */

export type ToastTone = "success" | "error" | "info";
export type ToastAction = { label: string; run: () => void };
export type Toast = { id: number; tone: ToastTone; message: string; action?: ToastAction };

const FLASH_KEY = "verity-flash";
const MAX_VISIBLE = 3;

let queue: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function push(tone: ToastTone, message: string, action?: ToastAction): number {
  const id = nextId++;
  // The same message twice in a row (a double click, a retry loop) shows once.
  queue = [...queue.filter((t) => t.message !== message), { id, tone, message, action }].slice(-MAX_VISIBLE);
  emit();
  return id;
}

export const toast = {
  success: (message: string, action?: ToastAction) => push("success", message, action),
  error: (message: string, action?: ToastAction) => push("error", message, action),
  info: (message: string, action?: ToastAction) => push("info", message, action),
  dismiss(id: number) {
    queue = queue.filter((t) => t.id !== id);
    emit();
  },
  /** Show a message after a full page load (window.location.*). */
  flash(tone: ToastTone, message: string) {
    try {
      sessionStorage.setItem(FLASH_KEY, JSON.stringify({ tone, message }));
    } catch {
      // storage blocked: the message is lost, the navigation is not
    }
  },
};

/** Called once by the Toaster on mount: turn a pending flash into a toast. */
export function takeFlash() {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FLASH_KEY);
    const { tone, message } = JSON.parse(raw) as { tone: ToastTone; message: string };
    if (message) push(tone, message);
  } catch {
    // unreadable or blocked storage
  }
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getToasts = () => queue;
const EMPTY: Toast[] = [];
export const getServerToasts = () => EMPTY;

/** How long a toast stays: failures stay longer, and anything with an action longer still. */
export function lifetimeOf(t: Pick<Toast, "tone" | "action">): number {
  if (t.action) return 10_000;
  return t.tone === "error" ? 7_000 : 4_000;
}
