"use client";

import { LogIn } from "lucide-react";
import { useActionState } from "react";
import { Alert, Button, Field, Input } from "../_components/ui";
import { signIn } from "./actions";

export const LoginForm = ({ next }: { next: string }) => {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
        />
      </Field>
      {error ? <Alert>{error}</Alert> : null}
      <Button
        type="submit"
        variant="primary"
        loading={pending}
        icon={<LogIn className="size-4" aria-hidden />}
      >
        Sign in
      </Button>
    </form>
  );
};
