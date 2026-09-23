"use client";

import { ArrowRight, CircleNotch } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Wordmark } from "@/components/brand";

type Mode = "login" | "register";

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
  if (res.status === 422) return "Usernames can use letters, numbers, spaces, dots, dashes and underscores.";
  return "Something went wrong. Try again.";
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy = COPY[mode];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      if (!res.ok) {
        setError(await errorFrom(res));
        return;
      }
      router.replace("/chat");
      router.refresh();
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="paper animate-rise w-full max-w-[420px] rounded-2xl">
      <div className="px-8 pb-8 pt-9 max-sm:px-6">
        <Wordmark className="text-sm" />
        <h1 className="mt-7 font-serif text-[2.1rem] font-normal leading-tight tracking-[-0.02em]">{copy.title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{copy.sub}</p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-4" noValidate>
          <Field label="Username" name="username" autoComplete="username" />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            hint={mode === "register" ? "At least 8 characters." : undefined}
            minLength={mode === "register" ? 8 : undefined}
          />

          <p role="alert" className="min-h-5 text-[13px] text-err">
            {error}
          </p>

          <button
            type="submit"
            disabled={pending}
            className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-[14.5px] font-medium text-brand-ink transition-[filter,transform] duration-300 ease-spring hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
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
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="text-foreground underline decoration-hair-strong underline-offset-4 transition-colors hover:decoration-foreground"
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
  ...input
}: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      <input
        name={name}
        required
        className="h-11 rounded-xl border border-input bg-background px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] duration-300 ease-spring focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)]"
        {...input}
      />
      {hint && <span className="text-[11.5px] text-faint">{hint}</span>}
    </label>
  );
}
