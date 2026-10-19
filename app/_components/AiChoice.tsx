"use client";

import { PenLine, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useToast } from "./Toast";
import { Button, cx } from "./ui";

/**
 * Every step AI can do can also be done by hand. These components show both
 * options side by side, the same way everywhere, so it's always clear which
 * is which. When the AI isn't set up its option still shows, and choosing it
 * opens the matching part of Settings instead of doing nothing.
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

/** Where to set up an AI step: a section of the Settings page. */
export type Setup = {
  /** The Settings section's id, e.g. "voice". */
  section: "ai" | "voice" | "images";
  /** One line on what to do, e.g. "Add your ElevenLabs key in Settings." */
  text: string;
};

export type AiOption = ManualOption & {
  /** Whether the AI service for this step is set up. */
  available: boolean;
  /** Where to set it up. */
  setup: Setup;
  /** Names the service in the setup message, e.g. "AI voice". */
  service?: string;
};

/** What to set up, for each AI step. */
export const SETUP = {
  writing: {
    section: "ai",
    text: "Add an API key for Claude (or another AI provider) in Settings.",
  },
  voice: { section: "voice", text: "Add your ElevenLabs API key in Settings." },
  images: { section: "images", text: "Add your OpenAI API key in Settings." },
} satisfies Record<string, Setup>;

export const settingsHref = (setup: Setup) =>
  `/settings?from=setup#${setup.section}`;

/** Set once Settings has been opened from here, so coming back refreshes. */
let awaitingSetup = false;
let lastRefresh = 0;

/**
 * Opens the matching Settings section in a new tab, so nothing here is lost.
 * When the person comes back, the page refreshes so the AI option turns on.
 */
const useExplainSetup = () => {
  const notify = useToast();
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      // Many AI options can be on one page; one refresh is enough.
      if (!awaitingSetup || Date.now() - lastRefresh < 2000) return;
      lastRefresh = Date.now();
      router.refresh();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);

  return (option: Pick<AiOption, "setup" | "service">) => {
    awaitingSetup = true;
    const opened = window.open(settingsHref(option.setup), "_blank");
    if (!opened) {
      router.push(settingsHref(option.setup));
      return;
    }
    notify({
      tone: "info",
      title: `Set up ${option.service ?? "AI"} in Settings`,
      description:
        "Settings opened in a new tab. Once it's connected, come back here and it's ready to use. Until then, you can do this step yourself.",
    });
  };
};

/** A link to the Settings section that turns an AI step on. */
export const SetupLink = ({
  setup,
  service,
  children = "Set it up in Settings",
  className,
}: {
  setup: Setup;
  service?: string;
  children?: ReactNode;
  className?: string;
}) => {
  const explain = useExplainSetup();
  return (
    <a
      href={settingsHref(setup)}
      target="_blank"
      rel="noopener"
      onClick={(event) => {
        event.preventDefault();
        explain({ setup, service });
      }}
      className={cx(
        "font-medium text-accent-bright underline-offset-4 hover:underline",
        className,
      )}
    >
      {children}
    </a>
  );
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
        title={ai.available ? undefined : ai.setup.text}
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
            Not set up yet. Set it up in Settings
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
      title={option.available ? option.description : option.setup.text}
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
