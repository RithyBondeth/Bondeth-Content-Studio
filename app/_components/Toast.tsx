"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { cx } from "./ui";

type Tone = "success" | "error" | "info";
type Toast = {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
  /** A button in the toast, e.g. Undo. */
  action?: { label: string; onClick: () => void };
};
type Notify = (toast: Omit<Toast, "id">) => void;

const ToastContext = createContext<Notify>(() => {});

/** Shows a short message in the corner. Errors stay until dismissed. */
export const useToast = () => useContext(ToastContext);

const ICONS = {
  success: <CheckCircle2 className="size-4 text-success" aria-hidden />,
  error: <CircleAlert className="size-4 text-danger" aria-hidden />,
  info: <Info className="size-4 text-accent-bright" aria-hidden />,
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback<Notify>(
    (toast) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      if (toast.tone !== "error") setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cx(
              "animate-rise-in pointer-events-auto flex items-start gap-3 rounded-2xl border bg-raised/95 p-3.5 shadow-2xl shadow-black/50 backdrop-blur",
              toast.tone === "error"
                ? "border-danger/30"
                : "border-line-strong",
            )}
          >
            <span className="mt-0.5">{ICONS[toast.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="mt-2 rounded-lg bg-hover px-2.5 py-1 text-xs font-medium text-text ring-1 ring-line-strong transition-colors hover:bg-line-strong"
                >
                  {toast.action.label}
                </button>
              ) : null}
              {toast.description ? (
                <p className="mt-0.5 text-[13px] leading-relaxed break-words text-muted">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-md p-0.5 text-faint hover:text-text"
              aria-label="Dismiss"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
