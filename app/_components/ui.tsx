import { Loader2 } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
};

export const Button = ({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={cx(
      "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
      size === "sm" && "h-8 px-3 text-sm",
      size === "md" && "h-10 px-4 text-sm",
      size === "lg" && "h-12 px-6 text-base",
      variant === "primary" &&
        "bg-accent text-white hover:enabled:bg-accent-hover",
      variant === "secondary" &&
        "border border-line bg-raised text-text hover:enabled:border-faint",
      variant === "ghost" &&
        "text-muted hover:enabled:bg-raised hover:enabled:text-text",
      variant === "danger" && "text-danger hover:enabled:bg-danger/10",
      className,
    )}
  >
    {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
    {children}
  </button>
);

const fieldClass =
  "w-full rounded-lg border border-line bg-bg px-3 text-sm text-text placeholder:text-faint transition-colors hover:border-faint focus:border-accent focus:outline-none";

export const Input = ({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cx(fieldClass, "h-10", className)} />
);

export const Textarea = ({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={cx(fieldClass, "resize-y py-2 leading-relaxed", className)}
  />
);

export const Select = ({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={cx(fieldClass, "h-10 cursor-pointer", className)}
  >
    {children}
  </select>
);

export const Field = ({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor={htmlFor}
      className="text-xs font-medium tracking-wide text-muted uppercase"
    >
      {label}
    </label>
    {children}
    {hint ? <p className="text-xs text-faint">{hint}</p> : null}
  </div>
);

export const Badge = ({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  children: ReactNode;
}) => (
  <span
    className={cx(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
      tone === "neutral" && "bg-raised text-muted",
      tone === "accent" && "bg-accent/15 text-accent-bright",
      tone === "success" && "bg-success/10 text-success",
      tone === "warning" && "bg-warning/10 text-warning",
      tone === "danger" && "bg-danger/10 text-danger",
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
  <div className={cx("rounded-2xl border border-line bg-surface", className)}>
    {children}
  </div>
);

export const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
    <div
      className="h-full rounded-full bg-accent transition-[width] duration-300"
      style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
    />
  </div>
);

export const Alert = ({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "warning" | "info";
  children: ReactNode;
}) => (
  <div
    role={tone === "danger" ? "alert" : "status"}
    className={cx(
      "rounded-lg border px-3 py-2 text-sm",
      tone === "danger" && "border-danger/30 bg-danger/10 text-danger",
      tone === "warning" && "border-warning/30 bg-warning/10 text-warning",
      tone === "info" && "border-accent/30 bg-accent/10 text-accent-bright",
    )}
  >
    {children}
  </div>
);

export { cx };
