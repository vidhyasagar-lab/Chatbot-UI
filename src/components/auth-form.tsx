"use client";

import { ArrowRight, CircleNotch } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Wordmark } from "@/components/brand";
import { toast } from "@/lib/toast";

type Mode = "login" | "register";
type FieldName = "username" | "password";

const COPY = {
  login: {
    title: "Welcome back",
    sub: "Sign in to ask questions across your documents.",
    cta: "Sign in",
    altQ: "New here?",
    alt: "Create an account",
  },
  register: {
    title: "Create your account",
    sub: "Upload documents and start asking in under a minute.",
    cta: "Create account",
    altQ: "Already have an account?",
    alt: "Sign in",
  },
} as const;

// Mirrors the backend's AuthCredentials schema (RAG Chatbot app/models/schemas.py).
const USERNAME_PATTERN = /^[\w\-. ]+$/;
const MIN_PASSWORD = 8;

/** The first problem with the form, checked before any request is spent. */
export function validateCredentials(mode: Mode, username: string, password: string): { field: FieldName; message: string } | null {
  if (!username.trim()) return { field: "username", message: "Enter your username." };
  if (username.length > 100) return { field: "username", message: "Usernames can be at most 100 characters." };
  if (!USERNAME_PATTERN.test(username)) {
    return { field: "username", message: "Usernames can use letters, numbers, spaces, dots, dashes and underscores." };
  }
  if (!password) return { field: "password", message: "Enter your password." };
  if (mode === "register" && password.length < MIN_PASSWORD) {
    return { field: "password", message: `Use at least ${MIN_PASSWORD} characters for your password.` };
  }
  return null;
}

async function errorFrom(res: Response): Promise<string> {
  if (res.status === 429) {
    const secs = Number(res.headers.get("retry-after"));
    const mins = Math.max(1, Math.ceil((Number.isFinite(secs) ? secs : 300) / 60));
    return `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
  }
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // non-JSON error body
  }
  if (res.status >= 500) return "The server hit an error. Try again in a moment.";
  return "Something went wrong. Try again.";
}

export function AuthForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<FieldName | null>(null);
  const [pending, setPending] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const copy = COPY[mode];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const problem = validateCredentials(mode, username, password);
    if (problem) {
      setError(problem.message);
      setInvalid(problem.field);
      form.current?.querySelector<HTMLInputElement>(`[name="${problem.field}"]`)?.focus();
      return;
    }

    setPending(true);
    setError(null);
    setInvalid(null);
    try {
      const res = await fetch(`/api/v1/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError(await errorFrom(res));
        setPending(false);
        return;
      }
      toast.success(mode === "register" ? `Account created. Welcome to Verity, ${username}.` : `Welcome back, ${username}.`);
      // pending stays on: the button keeps its spinner until the chat has loaded.
      router.replace("/chat");
      router.refresh();
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  const switchMode = () => {
    const next = mode === "login" ? "register" : "login";
    setMode(next);
    setError(null);
    setInvalid(null);
    // Keep the address, and with it the page title, in step with the form on screen.
    router.replace(next === "register" ? "/login?mode=register" : "/login", { scroll: false });
  };

  return (
    <div className="paper animate-rise w-full max-w-[420px] rounded-2xl">
      <div className="px-8 pb-8 pt-9 max-sm:px-5 max-sm:pb-6 max-sm:pt-7">
        <Link href="/" aria-label="Verity home" className="-mx-1 inline-block rounded-md px-1 py-0.5 transition-opacity hover:opacity-80">
          <Wordmark className="text-sm" />
        </Link>
        <h1 className="mt-7 font-serif text-[2.1rem] font-normal leading-tight tracking-[-0.02em] max-sm:mt-5 max-sm:text-[1.85rem]">{copy.title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{copy.sub}</p>

        <form ref={form} onSubmit={submit} className="mt-8 flex flex-col gap-4 max-sm:mt-6" noValidate>
          <Field
            label="Username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            invalid={invalid === "username"}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            hint={mode === "register" ? `At least ${MIN_PASSWORD} characters.` : undefined}
            invalid={invalid === "password"}
          />

          <p id="auth-error" role="alert" className="min-h-5 text-[13px] text-err">
            {error}
          </p>

          <button
            type="submit"
            disabled={pending}
            className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-[14.5px] font-medium text-brand-ink transition-[filter,transform] duration-300 ease-spring hover:brightness-110 active:scale-[0.99] disabled:opacity-70 pointer-coarse:h-12"
          >
            {copy.cta}
            <span className="transition-transform duration-300 ease-spring group-hover:translate-x-0.5">
              {pending ? (
                <CircleNotch weight="regular" className="size-4 animate-spin" />
              ) : (
                <ArrowRight weight="regular" className="size-4" />
              )}
            </span>
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          {copy.altQ}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="text-foreground underline decoration-hair-strong underline-offset-4 transition-colors hover:decoration-foreground pointer-coarse:py-2"
          >
            {copy.alt}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  hint,
  invalid,
  ...input
}: { label: string; name: string; hint?: string; invalid?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      <input
        name={name}
        required
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "auth-error" : undefined}
        className="h-11 rounded-xl border border-input bg-background px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] duration-300 ease-spring focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)] aria-invalid:border-err aria-invalid:focus:shadow-[0_0_0_3px_var(--err-soft)] pointer-coarse:h-12"
        {...input}
      />
      {hint && <span className="text-[11.5px] text-faint">{hint}</span>}
    </label>
  );
}
