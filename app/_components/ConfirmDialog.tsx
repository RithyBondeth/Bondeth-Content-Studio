"use client";

import { AlertTriangle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./ui";

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
};

/**
 * A promise-based replacement for window.confirm with a styled dialog.
 * Render `dialog` somewhere in the component and `await confirm({...})`.
 */
export const useConfirm = () => {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ ...options, resolve })),
    [],
  );

  const close = useCallback(
    (ok: boolean) => {
      state?.resolve(ok);
      setState(null);
    },
    [state],
  );

  useEffect(() => {
    if (!state) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) =>
      event.key === "Escape" && close(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, close]);

  const dialog = state ? (
    <div
      className="animate-fade-in fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => close(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
        className="animate-rise-in w-full max-w-md rounded-2xl border border-line-strong bg-raised p-6 shadow-2xl shadow-black/60"
      >
        <div className="flex gap-4">
          {state.danger ? (
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger/12 text-danger">
              <AlertTriangle className="size-5" aria-hidden />
            </span>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <h2 id="confirm-title" className="text-base font-medium">
              {state.title}
            </h2>
            {state.description ? (
              <div className="text-sm leading-relaxed text-muted">
                {state.description}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => close(true)}
            className={
              state.danger
                ? "inline-flex h-10 items-center rounded-xl bg-danger px-4 text-sm font-medium text-white transition hover:brightness-110"
                : "bg-brand inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-white transition hover:brightness-110"
            }
          >
            {state.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
};
