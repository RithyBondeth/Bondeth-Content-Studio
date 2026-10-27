"use client";

import { ArrowLeft, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "../../studio/auth-client";
import { Alert, Button, Field, Input } from "../_components/ui";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
    <path
      fill="#4285F4"
      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"
    />
    <path
      fill="#EA4335"
      d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"
    />
  </svg>
);

/**
 * Google, or an email address and then the 6-digit code sent to it. Either
 * one creates the account the first time.
 */
export const LoginForm = ({
  next,
  google,
  email: emailCodes,
}: {
  next: string;
  google: boolean;
  /** Whether sign-in codes can be emailed on this server. */
  email: boolean;
}) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [pending, setPending] = useState<"google" | "send" | "verify" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sendCode = async () => {
    setPending("send");
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: "sign-in",
    });
    setPending(null);
    if (error) {
      setError(error.message ?? "Couldn't send the code. Try again.");
      return false;
    }
    setStep("code");
    return true;
  };

  const verify = async () => {
    setPending("verify");
    setError(null);
    const { error } = await authClient.signIn.emailOtp({
      email: email.trim(),
      otp: code.trim(),
    });
    if (error) {
      setPending(null);
      setError(
        error.code === "INVALID_OTP" || error.code === "OTP_EXPIRED"
          ? "That code isn't right or has expired. Check it, or send a new one."
          : (error.message ?? "Couldn't sign in. Try again."),
      );
      return;
    }
    router.push(next);
    router.refresh();
  };

  if (step === "code") {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void verify();
        }}
      >
        <p className="text-sm leading-relaxed text-muted">
          We sent a 6-digit code to{" "}
          <span className="text-text">{email.trim()}</span>. It works for 10
          minutes.
        </p>
        <Field label="Code" htmlFor="code">
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            required
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="text-center font-mono text-lg tracking-[0.5em]"
          />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        {notice ? <Alert tone="info">{notice}</Alert> : null}
        <Button
          type="submit"
          variant="primary"
          loading={pending === "verify"}
          disabled={code.length !== 6}
        >
          Sign in
        </Button>
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
              setNotice(null);
            }}
            className="flex items-center gap-1 text-muted hover:text-text"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Use another email
          </button>
          <button
            type="button"
            disabled={pending !== null}
            onClick={async () => {
              setNotice(null);
              if (await sendCode()) setNotice("We sent a new code.");
            }}
            className="text-muted underline underline-offset-4 hover:text-text disabled:opacity-50"
          >
            Send a new code
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {google ? (
        <>
          <Button
            variant="secondary"
            size="lg"
            loading={pending === "google"}
            disabled={pending !== null}
            icon={<GoogleIcon />}
            onClick={async () => {
              setPending("google");
              setError(null);
              const { error } = await authClient.signIn.social({
                provider: "google",
                callbackURL: next,
              });
              if (error) {
                setPending(null);
                setError(error.message ?? "Couldn't reach Google. Try again.");
              }
            }}
          >
            Continue with Google
          </Button>
          {emailCodes ? (
            <div className="flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
          ) : null}
        </>
      ) : null}
      {emailCodes ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void sendCode();
          }}
        >
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus={!google}
              required
              placeholder="you@school.org"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          {error ? <Alert>{error}</Alert> : null}
          <Button
            type="submit"
            variant={google ? "secondary" : "primary"}
            size="lg"
            loading={pending === "send"}
            disabled={pending !== null || !email.trim()}
            icon={<Mail className="size-4" aria-hidden />}
          >
            Email me a sign-in code
          </Button>
        </form>
      ) : null}
      {!emailCodes && error ? <Alert>{error}</Alert> : null}
    </div>
  );
};
