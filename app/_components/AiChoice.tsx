"use client";

import { PenLine, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useToast } from "./Toast";
import { Button, cx } from "./ui";

/**
 * Every step AI can do can also be done by hand. These components show both
 * options side by side, the same way everywhere, so it's always clear which
 * is which. When the AI isn't set up its option still shows, and choosing it
 * explains how to set it up instead of doing nothing.
 */

export type ManualOption = {
  label: string;
  /** One short line on what happens. Shown on cards. */
  description?: string;
  icon?: ReactNode;
  onSelect: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export type AiOption = ManualOption & {
  /** Whether the AI service for this step is set up. */
  available: boolean;
  /** How to set it up, e.g. "Add ELEVENLABS_API_KEY to .env and restart." */
  setup: string;
  /** Names the service in the setup message, e.g. "AI voice". */
  service?: string;
};

/** What to set up, for each AI step. */
export const SETUP = {
  writing:
    "Add an ANTHROPIC_API_KEY (or another AI provider) to .env and restart the studio.",
  voice: "Add an ELEVENLABS_API_KEY to .env and restart the studio.",
  images: "Add an OPENAI_API_KEY to .env and restart the studio.",
};

const useExplainSetup = () => {
  const notify = useToast();
  return (option: AiOption) =>
    notify({
      tone: "info",
      title: `${option.service ?? "AI"} isn't set up yet`,
      description: `${option.setup} Until then, you can do this step yourself.`,
    });
};

/** A small "AI" marker, so AI options read the same everywhere. */
export const AiTag = ({ className }: { className?: string }) => (
  <span
    className={cx(
      "rounded-md bg-accent/12 px-1.5 py-px text-[10px] font-semibold tracking-wide text-accent-bright uppercase ring-1 ring-accent/20 ring-inset",
      className,
    )}
  >
    AI
  </span>
);

/**
 * Two buttons for tight spots: the AI one and the by-hand one. Whichever
 * can run leads; with both available, AI is the primary.
 */
export const ChoiceButtons = ({
  ai,
  manual,
  size = "md",
  quiet = false,
  className,
}: {
  ai: AiOption;
  manual: ManualOption;
  size?: "xs" | "sm" | "md";
  /** Neither button is primary, for lists where another button is the main action. */
  quiet?: boolean;
  className?: string;
}) => {
  const explain = useExplainSetup();
  const iconSize = size === "md" ? "size-4" : "size-3.5";
  const aiLeads = ai.available && !quiet;
  const manualLeads = !ai.available && !quiet;
  return (
    <div className={cx("flex flex-wrap items-center gap-2", className)}>
      <Button
        size={size}
        variant={manualLeads ? "primary" : "secondary"}
        loading={manual.loading}
        disabled={manual.disabled}
        onClick={manual.onSelect}
        icon={manual.icon ?? <PenLine className={iconSize} aria-hidden />}
      >
        {manual.label}
      </Button>
      <Button
        size={size}
        variant={aiLeads ? "primary" : "outline"}
        loading={ai.loading}
        disabled={ai.disabled}
        aria-disabled={!ai.available || undefined}
        title={ai.available ? undefined : ai.setup}
        onClick={() => (ai.available ? ai.onSelect() : explain(ai))}
        className={
          ai.available ? undefined : "text-muted opacity-75 hover:opacity-100"
        }
        icon={
          ai.icon ?? (
            <Sparkles
              className={cx(
                iconSize,
                !aiLeads && ai.available && "text-accent-bright",
              )}
              aria-hidden
            />
          )
        }
      >
        {ai.label}
        {ai.available ? null : (
          <span className="rounded-md border border-line px-1 text-[10px] font-normal text-faint">
            Set up
          </span>
        )}
      </Button>
    </div>
  );
};

const OptionCard = ({
  tag,
  title,
  description,
  dimmed,
  children,
}: {
  tag: ReactNode;
  title: string;
  description?: string;
  dimmed?: boolean;
  children: ReactNode;
}) => (
  <div
    className={cx(
      "flex flex-col gap-3 rounded-xl border p-4 text-left",
      dimmed ? "border-dashed border-line" : "border-line bg-bg/40",
    )}
  >
    <div className="flex items-center gap-2">
      {tag}
      <span className="text-sm font-medium">{title}</span>
    </div>
    {description ? (
      <p className="flex-1 text-[13px] leading-relaxed text-muted">
        {description}
      </p>
    ) : null}
    {children}
  </div>
);

/** The two options as side-by-side cards with a line on each, for empty states. */
export const ChoiceCards = ({
  ai,
  manual,
  stacked = false,
  className,
}: {
  ai: AiOption;
  manual: ManualOption;
  /** One above the other, for narrow panels. */
  stacked?: boolean;
  className?: string;
}) => {
  const explain = useExplainSetup();
  return (
    <div className={cx("grid gap-3", !stacked && "sm:grid-cols-2", className)}>
      <OptionCard
        tag={
          <span className="grid size-6 place-items-center rounded-md bg-raised text-muted">
            <PenLine className="size-3.5" aria-hidden />
          </span>
        }
        title="Do it yourself"
        description={manual.description}
      >
        <Button
          size="sm"
          variant={ai.available ? "secondary" : "primary"}
          loading={manual.loading}
          disabled={manual.disabled}
          onClick={manual.onSelect}
          icon={manual.icon ?? <PenLine className="size-3.5" aria-hidden />}
          className="self-start"
        >
          {manual.label}
        </Button>
      </OptionCard>
      <OptionCard
        tag={<AiTag />}
        title="Let AI do it"
        description={ai.description}
        dimmed={!ai.available}
      >
        {ai.available ? (
          <Button
            size="sm"
            variant="primary"
            loading={ai.loading}
            disabled={ai.disabled}
            onClick={ai.onSelect}
            icon={ai.icon ?? <Sparkles className="size-3.5" aria-hidden />}
            className="self-start"
          >
            {ai.label}
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => explain(ai)}
            className="self-start text-left text-xs text-faint underline-offset-4 hover:text-muted hover:underline"
          >
            Not set up yet. How to turn it on
          </button>
        )}
      </OptionCard>
    </div>
  );
};

/**
 * A single AI action, for steps whose by-hand option lives elsewhere (each
 * scene's own voice, say). Explains how to set it up when it isn't.
 */
export const AiButton = ({
  option,
  size = "md",
  lead = true,
  className,
}: {
  option: AiOption;
  size?: "xs" | "sm" | "md";
  /** Primary when available. Off when another button is the main action. */
  lead?: boolean;
  className?: string;
}) => {
  const explain = useExplainSetup();
  const iconSize = size === "md" ? "size-4" : "size-3.5";
  const leads = lead && option.available;
  return (
    <Button
      size={size}
      variant={leads ? "primary" : "outline"}
      loading={option.loading}
      disabled={option.disabled}
      aria-disabled={!option.available || undefined}
      title={option.available ? option.description : option.setup}
      onClick={() => (option.available ? option.onSelect() : explain(option))}
      className={cx(
        !option.available && "text-muted opacity-75 hover:opacity-100",
        className,
      )}
      icon={
        option.icon ?? (
          <Sparkles
            className={cx(
              iconSize,
              !leads && option.available && "text-accent-bright",
            )}
            aria-hidden
          />
        )
      }
    >
      {option.label}
      {option.available ? null : (
        <span className="rounded-md border border-line px-1 text-[10px] font-normal text-faint">
          Set up
        </span>
      )}
    </Button>
  );
};
