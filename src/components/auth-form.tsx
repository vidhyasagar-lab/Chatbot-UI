"use client";

import { ArrowLeft, ArrowRight, CircleNotch, EnvelopeSimple, Key } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Wordmark } from "@/components/brand";
import { toast } from "@/lib/toast";

/*
 * Two ways into the same account:
 *
 *   code     — enter an address, receive a six-digit code, type it back. No
 *              password exists until someone chooses to set one, and a first
 *              sign-in creates the account, so there is no separate sign-up.
 *   password — the original form, for anyone who set one.
 *
 * The code route is the default because it is the one that always works: it
 * cannot be forgotten, and it proves the address at the same time.
 */

type Mode = "login" | "register";
type FieldName = "username" | "password";
type Door = "code" | "password";
type Step = "address" | "code";

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

// Mirrors the backend's EMAIL_PATTERN (RAG Chatbot app/models/schemas.py).
// Deliberately loose: the real test of an address is whether a code sent to
// it comes back, so anything that could be an address is allowed through.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;
const MAX_EMAIL = 254;
const MIN_PASSWORD = 8;
const CODE_LENGTH = 6;

/** The first problem with an address, or null. Shared by both doors. */
export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return "Enter your email address.";
  if (value.length > MAX_EMAIL) return "That address is too long.";
  if (!EMAIL_PATTERN.test(value)) return "That does not look like an email address.";
  return null;
}

/** The first problem with the password form, checked before a request is spent. */
export function validateCredentials(mode: Mode, username: string, password: string): { field: FieldName; message: string } | null {
  const emailProblem = validateEmail(username);
  if (emailProblem) return { field: "username", message: emailProblem };
  if (!password) return { field: "password", message: "Enter your password." };
  if (mode === "register" && password.length < MIN_PASSWORD) {
    return { field: "password", message: `Use at least ${MIN_PASSWORD} characters for your password.` };
  }
  return null;
}

/** What a six-digit code must look like once the stray spaces are gone. */
export function normaliseCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export function validateCode(raw: string): string | null {
  const code = normaliseCode(raw);
  if (!code) return "Enter the code from your email.";
  if (code.length < CODE_LENGTH) return `The code is ${CODE_LENGTH} digits.`;
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
  const [door, setDoor] = useState<Door>("code");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>("address");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<FieldName | null>(null);
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  // False when the server has no mail configured and logged the code instead,
  // which only happens in development. Saying "check your inbox" then would
  // send someone looking for a message that was never sent.
  const [delivered, setDelivered] = useState(true);
  const form = useRef<HTMLFormElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const copy = COPY[mode];

  // One interval for the resend countdown, cleared on unmount so a stray
  // timer cannot set state on a form that is gone.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setInterval(() => setResendIn((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  useEffect(() => {
    if (step === "code") codeInput.current?.focus();
  }, [step]);

  function finish(message: string) {
    toast.success(message);
    // pending stays on: the button keeps its spinner until the chat has loaded.
    router.replace("/chat");
    router.refresh();
  }

  async function requestCode(address: string, { resend = false } = {}) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/code/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      if (!res.ok) {
        setError(await errorFrom(res));
        setPending(false);
        return;
      }
      const body = await res.json().catch(() => ({}));
      setDelivered(body?.delivered !== false);
      setResendIn(Number(body?.resend_in_seconds) || 60);
      setStep("code");
      setCode("");
      if (resend) toast.success("A new code is on its way.");
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    }
    setPending(false);
  }

  async function submitAddress(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const address = email.trim();
    const problem = validateEmail(address);
    if (problem) {
      setError(problem);
      setInvalid("username");
      return;
    }
    setInvalid(null);
    await requestCode(address);
  }

  async function submitCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const problem = validateCode(code);
    if (problem) {
      setError(problem);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/code/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: normaliseCode(code) }),
      });
      if (!res.ok) {
        setError(await errorFrom(res));
        setCode("");
        codeInput.current?.focus();
        setPending(false);
        return;
      }
      // 201 means the account did not exist a moment ago.
      finish(res.status === 201 ? "Welcome to Verity. Your account is ready." : "Welcome back.");
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  async function submitPassword(e: FormEvent<HTMLFormElement>) {
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
      finish(mode === "register" ? "Account created. Welcome to Verity." : "Welcome back.");
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

  const useOtherDoor = () => {
    setDoor(door === "code" ? "password" : "code");
    setStep("address");
    setError(null);
    setInvalid(null);
    setCode("");
  };

  // Someone who arrived from "Create an account" should not be greeted with
  // "Sign in", even though the code door does both with one form.
  const heading =
    door === "password"
      ? copy.title
      : step === "code"
        ? "Check your email"
        : mode === "register"
          ? "Create your account"
          : "Sign in";
  const sub =
    door === "password"
      ? copy.sub
      : step === "code"
        ? delivered
          ? `We sent a ${CODE_LENGTH}-digit code to ${email.trim()}.`
          : `Mail is not configured here, so the ${CODE_LENGTH}-digit code for ${email.trim()} is in the server log.`
        : mode === "register"
          ? "Enter your email and we'll send a code. That is the whole sign-up — there is no password to choose."
          : "Enter your email and we'll send you a code. No password needed.";

  return (
    <div className="paper animate-rise w-full max-w-[420px] rounded-2xl">
      <div className="px-8 pb-8 pt-9 max-sm:px-5 max-sm:pb-6 max-sm:pt-7">
        <Link href="/" aria-label="Verity home" className="-mx-1 inline-block rounded-md px-1 py-0.5 transition-opacity hover:opacity-80">
          <Wordmark className="text-sm" />
        </Link>
        <h1 className="mt-7 font-serif text-[2.1rem] font-normal leading-tight tracking-[-0.02em] max-sm:mt-5 max-sm:text-[1.85rem]">{heading}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">{sub}</p>

        {door === "code" && step === "address" && (
          <form onSubmit={submitAddress} className="mt-8 flex flex-col gap-4 max-sm:mt-6" noValidate>
            <Field
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              invalid={invalid === "username"}
            />
            <ErrorLine error={error} />
            <Submit pending={pending} icon={<EnvelopeSimple weight="regular" className="size-4" />}>
              Email me a code
            </Submit>
          </form>
        )}

        {door === "code" && step === "code" && (
          <form onSubmit={submitCode} className="mt-8 flex flex-col gap-4 max-sm:mt-6" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Six-digit code</span>
              <input
                ref={codeInput}
                name="code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                // Not maxLength: a pasted "123 456" would be cut to "123 45"
                // before the non-digits are stripped. normaliseCode trims it.
                value={code}
                onChange={(e) => setCode(normaliseCode(e.target.value))}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={error ? "auth-error" : undefined}
                className="h-12 rounded-xl border border-input bg-background px-3.5 text-center font-mono text-[22px] tracking-[0.42em] outline-none transition-[border-color,box-shadow] duration-300 ease-spring focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)] aria-invalid:border-err aria-invalid:focus:shadow-[0_0_0_3px_var(--err-soft)]"
              />
            </label>
            <ErrorLine error={error} />
            <Submit pending={pending}>Sign in</Submit>

            <div className="flex items-center justify-between gap-3 text-[13px]">
              <button
                type="button"
                onClick={() => {
                  setStep("address");
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground pointer-coarse:py-2"
              >
                <ArrowLeft weight="regular" className="size-3.5" />
                Change address
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || pending}
                onClick={() => requestCode(email.trim(), { resend: true })}
                className="text-muted-foreground underline decoration-hair-strong underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground disabled:no-underline disabled:opacity-60 pointer-coarse:py-2"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {door === "password" && (
          <form ref={form} onSubmit={submitPassword} className="mt-8 flex flex-col gap-4 max-sm:mt-6" noValidate>
            <Field
              label="Email"
              name="username"
              type="email"
              inputMode="email"
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
            <ErrorLine error={error} />
            <Submit pending={pending}>{copy.cta}</Submit>

            <p className="text-center text-[13px] text-muted-foreground">
              {copy.altQ}{" "}
              <button
                type="button"
                onClick={switchMode}
                className="text-foreground underline decoration-hair-strong underline-offset-4 transition-colors hover:decoration-foreground pointer-coarse:py-2"
              >
                {copy.alt}
              </button>
            </p>
          </form>
        )}

        <div className="mt-6 border-t border-hair pt-5">
          <button
            type="button"
            onClick={useOtherDoor}
            className="mx-auto flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground pointer-coarse:py-2"
          >
            {door === "code" ? (
              <>
                <Key weight="regular" className="size-4" />
                Sign in with a password instead
              </>
            ) : (
              <>
                <EnvelopeSimple weight="regular" className="size-4" />
                Email me a code instead
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  return (
    <p id="auth-error" role="alert" className="min-h-5 text-[13px] text-err">
      {error}
    </p>
  );
}

function Submit({ pending, icon, children }: { pending: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-[14.5px] font-medium text-brand-ink transition-[filter,transform] duration-300 ease-spring hover:brightness-110 active:scale-[0.99] disabled:opacity-70 pointer-coarse:h-12"
    >
      {children}
      <span className="transition-transform duration-300 ease-spring group-hover:translate-x-0.5">
        {pending ? <CircleNotch weight="regular" className="size-4 animate-spin" /> : (icon ?? <ArrowRight weight="regular" className="size-4" />)}
      </span>
    </button>
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
