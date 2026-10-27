import { Loader2 } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
};

export const buttonClass = ({
  variant = "secondary",
  size = "md",
  iconOnly = false,
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  iconOnly?: boolean;
}) =>
  cx(
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
    size === "xs" &&
      (iconOnly ? "size-7 rounded-lg" : "h-7 rounded-lg px-2.5 text-xs"),
    size === "sm" &&
      (iconOnly ? "size-8 rounded-lg" : "h-8 rounded-lg px-3 text-sm"),
    size === "md" && (iconOnly ? "size-10" : "h-10 px-4 text-sm"),
    size === "lg" && (iconOnly ? "size-12" : "h-12 px-6 text-[15px]"),
    variant === "primary" &&
      "bg-brand text-white shadow-[0_8px_24px_-8px_rgb(10_102_194/0.7),inset_0_1px_0_rgb(255_255_255/0.2)] hover:enabled:brightness-110",
    variant === "secondary" &&
      "border border-line bg-raised text-text hover:enabled:border-line-strong hover:enabled:bg-hover",
    variant === "outline" &&
      "border border-line text-text hover:enabled:border-line-strong hover:enabled:bg-raised",
    variant === "ghost" &&
      "text-muted hover:enabled:bg-raised hover:enabled:text-text",
    variant === "danger" && "text-danger hover:enabled:bg-danger/10",
  );

export const Button = ({
  variant,
  size,
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) => (
  <button
    type="button"
    {...props}
    disabled={disabled || loading}
    className={cx(
      buttonClass({ variant, size, iconOnly: !children }),
      className,
    )}
  >
    {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
    {children}
  </button>
);

/** Fields fill their container unless the caller gives them a width. */
const widthClass = (className?: string) =>
  /(^|\s)w-/.test(className ?? "") ? "" : "w-full";

const fieldClass =
  "rounded-xl border border-line bg-bg/60 px-3.5 text-sm text-text placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent focus:bg-bg focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60";

export const Input = ({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cx(fieldClass, widthClass(className), "h-10", className)}
  />
);

export const Textarea = ({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={cx(
      fieldClass,
      widthClass(className),
      "resize-y py-2.5 leading-relaxed",
      className,
    )}
  />
);

export const Select = ({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={cx(
      fieldClass,
      widthClass(className),
      "h-10 cursor-pointer pr-8",
      className,
    )}
  >
    {children}
  </select>
);

export const Field = ({
  label,
  hint,
  aside,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  /** Shown at the right of the label, e.g. a counter. */
  aside?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-muted">
        {label}
      </label>
      {aside}
    </div>
    {children}
    {hint ? <p className="text-xs leading-relaxed text-faint">{hint}</p> : null}
  </div>
);

export const Badge = ({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cx(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset",
      tone === "neutral" && "bg-raised text-muted ring-line",
      tone === "accent" && "bg-accent/12 text-accent-bright ring-accent/25",
      tone === "success" && "bg-success/10 text-success ring-success/20",
      tone === "warning" && "bg-warning/10 text-warning ring-warning/20",
      tone === "danger" && "bg-danger/10 text-danger ring-danger/20",
      className,
    )}
  >
    {children}
  </span>
);

export const Card = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => (
  <div
    className={cx(
      "rounded-2xl border border-line bg-surface/80 shadow-[0_1px_0_rgb(255_255_255/0.03)_inset] backdrop-blur-sm",
      className,
    )}
  >
    {children}
  </div>
);

export const ProgressBar = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => (
  <div
    className={cx(
      "h-1.5 w-full overflow-hidden rounded-full bg-raised",
      className,
    )}
  >
    <div
      className="bg-brand h-full rounded-full transition-[width] duration-500 ease-out"
      style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
    />
  </div>
);

export const Alert = ({
  tone = "danger",
  icon,
  children,
}: {
  tone?: "danger" | "warning" | "info";
  icon?: ReactNode;
  children: ReactNode;
}) => (
  <div
    role={tone === "danger" ? "alert" : "status"}
    className={cx(
      "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed",
      tone === "danger" && "border-danger/25 bg-danger/8 text-danger",
      tone === "warning" && "border-warning/25 bg-warning/8 text-warning",
      tone === "info" && "border-accent/25 bg-accent/8 text-accent-bright",
    )}
  >
    {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong bg-raised px-1.5 font-mono text-[11px] text-muted">
    {children}
  </kbd>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cx("skeleton rounded-xl", className)} />
);

/** "3 minutes ago", "yesterday", or a date for anything older than a week. */
export const relativeTime = (iso: string) => {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (seconds < 60) return "just now";
  if (seconds < 3600) return format.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86400)
    return format.format(-Math.round(seconds / 3600), "hour");
  if (seconds < 604800)
    return format.format(-Math.round(seconds / 86400), "day");
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
};
