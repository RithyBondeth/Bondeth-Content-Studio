"use client";

import {
  Check,
  CornerDownLeft,
  Globe,
  Layers,
  Lightbulb,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { BlockSpinner } from "./Blocks";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  createBlankProjectAction,
  createExampleProjectAction,
  createProjectAction,
} from "../actions";
import { ChoiceButtons, SETUP } from "./AiChoice";
import { useToast } from "./Toast";
import { Input, Kbd, Select, cx } from "./ui";

const LANGUAGES = [
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"],
  ["id", "Indonesian"],
  ["vi", "Vietnamese"],
  ["th", "Thai"],
  ["km", "Khmer"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["zh", "Chinese"],
] as const;

const EXAMPLE_IDEAS = [
  "Personal finance basics for university students",
  "Everyday science for curious teenagers",
  "Learn Python in one-minute lessons",
  "Fascinating moments from world history",
];

// Shown one after another while the AI works, so the wait feels alive.
const PLANNING_STEPS = [
  "Understanding your idea",
  "Choosing the right audience",
  "Picking themes for the series",
  "Writing a hook for every video",
  "Building a posting schedule",
];
const STEP_SECONDS = 9;

const PillSelect = ({
  icon,
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  disabled?: boolean;
}) => (
  <Select
    bare
    aria-label={label}
    value={value}
    disabled={disabled}
    onChange={(event) => onChange(event.target.value)}
    icon={icon}
    options={options.map(([key, name]) => ({ value: key, label: name }))}
    className="flex h-9 items-center gap-2 rounded-lg border border-line bg-raised/70 pr-2 pl-3 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-text focus-visible:border-accent focus-visible:outline-none aria-expanded:border-accent aria-expanded:text-text disabled:cursor-not-allowed disabled:opacity-60"
  />
);

const PlanningOverlay = ({ idea }: { idea: string }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const active = Math.min(
    Math.floor(elapsed / STEP_SECONDS),
    PLANNING_STEPS.length - 1,
  );

  return (
    <div className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-bg/80 p-4 backdrop-blur-md">
      <div
        className="animate-rise-in w-full max-w-md rounded-3xl border border-line-strong bg-raised/90 p-7 shadow-2xl shadow-black/60"
        role="status"
        aria-live="polite"
      >
        <div className="bg-brand mb-5 grid size-12 place-items-center rounded-2xl shadow-[0_10px_30px_-8px_rgb(124_92_255/0.8)]">
          <Sparkles className="size-5 text-white" aria-hidden />
        </div>
        <h2 className="text-lg font-medium">Planning your series</h2>
        <p className="mt-1 line-clamp-2 text-sm text-muted">“{idea}”</p>
        <ol className="mt-6 flex flex-col gap-3">
          {PLANNING_STEPS.map((step, index) => (
            <li
              key={step}
              className={cx(
                "flex items-center gap-3 text-sm transition-colors",
                index <= active ? "text-text" : "text-faint",
              )}
            >
              <span
                className={cx(
                  "grid size-5 place-items-center rounded-md",
                  index < active && "bg-success/15 text-success",
                  index === active && "text-accent-bright",
                  index > active && "border border-line-strong",
                )}
              >
                {index < active ? (
                  <Check className="size-3" aria-hidden />
                ) : index === active ? (
                  <BlockSpinner />
                ) : null}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-faint">
          This usually takes about a minute · {elapsed}s
        </p>
      </div>
    </div>
  );
};

/** The draft and choices, kept in this browser so a refresh doesn't lose them. */
const DRAFT_KEY = "new-project-draft";

type Draft = {
  idea: string;
  videos: string;
  language: string;
  audience: string;
  tone: string;
};

const readDraft = (): Partial<Draft> => {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}");
    return data && typeof data === "object" ? (data as Partial<Draft>) : {};
  } catch {
    return {};
  }
};

const writeDraft = (draft: Draft) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private windows and full storage: the draft just isn't kept.
  }
};

/** Ideas this short rarely give the AI enough to plan a good series. */
const isVague = (idea: string) => {
  const words = idea.trim().split(/\s+/).filter(Boolean).length;
  return words > 0 && words < 4;
};

const TEXTAREA_MAX = 240;

export const NewProjectForm = ({ hasAi }: { hasAi: boolean }) => {
  const router = useRouter();
  const notify = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [idea, setIdea] = useState("");
  const [videos, setVideos] = useState("5");
  const [language, setLanguage] = useState("en");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [pending, setPending] = useState<"plan" | "blank" | "example" | null>(
    null,
  );
  const [restored, setRestored] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);

  const canCreate = idea.trim().length > 0 && pending === null;

  // Bring back the last draft and choices, once, after the first render.
  useEffect(() => {
    const draft = readDraft();
    if (draft.idea) setIdea(draft.idea);
    if (draft.videos) setVideos(draft.videos);
    if (draft.language) setLanguage(draft.language);
    if (draft.audience) setAudience(draft.audience);
    if (draft.tone) setTone(draft.tone);
    if (draft.audience || draft.tone) setShowMore(true);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) writeDraft({ idea, videos, language, audience, tone });
  }, [restored, idea, videos, language, audience, tone]);

  // Grow with the text, up to a limit, then scroll.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, TEXTAREA_MAX)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > TEXTAREA_MAX ? "auto" : "hidden";
  }, [idea]);

  // While the box is empty, cycle through example ideas in the placeholder.
  useEffect(() => {
    if (idea) return;
    const timer = setInterval(
      () => setExampleIndex((index) => (index + 1) % EXAMPLE_IDEAS.length),
      3500,
    );
    return () => clearInterval(timer);
  }, [idea]);

  const pickExample = (example: string) => {
    setIdea(example);
    const textarea = textareaRef.current;
    textarea?.focus();
    // Put the cursor at the end so it's easy to add to.
    requestAnimationFrame(() =>
      textarea?.setSelectionRange(example.length, example.length),
    );
  };

  /** With AI, the idea becomes a full plan. Without, it's the project's title and you plan it yourself. */
  const create = async (withAi: boolean) => {
    if (!canCreate) return;
    setPending(withAi ? "plan" : "blank");
    const input = {
      idea,
      videos: Number(videos),
      language,
      audience,
      tone,
    };
    const result = withAi
      ? await createProjectAction(input)
      : await createBlankProjectAction(input);
    if (result.ok) {
      writeDraft({ idea: "", videos, language, audience: "", tone: "" });
      router.push(`/projects/${result.data}`);
    } else {
      notify({
        tone: "error",
        title: withAi
          ? "Couldn't create the plan"
          : "Couldn't create the project",
        description: result.error,
      });
      setPending(null);
    }
  };

  const createExample = async () => {
    setPending("example");
    const result = await createExampleProjectAction();
    if (result.ok) {
      router.push(`/projects/${result.data}`);
    } else {
      notify({
        tone: "error",
        title: "Couldn't create the example",
        description: result.error,
      });
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {pending === "plan" ? <PlanningOverlay idea={idea} /> : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void create(hasAi);
        }}
        className="group relative rounded-3xl bg-linear-to-b from-line-strong to-line p-px shadow-2xl shadow-black/40 transition focus-within:from-accent/70 focus-within:to-pink/30"
      >
        <div className="rounded-[calc(1.5rem-1px)] bg-surface">
          <div className="flex items-center justify-between gap-3 px-5 pt-4">
            <label
              htmlFor="idea"
              className="text-[13px] font-medium text-muted transition-colors group-focus-within:text-text"
            >
              What do you want to teach?
            </label>
            <div className="flex items-center gap-1">
              {idea && pending === null ? (
                <button
                  type="button"
                  onClick={() => {
                    setIdea("");
                    textareaRef.current?.focus();
                  }}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-faint transition-colors hover:bg-raised hover:text-text"
                >
                  <X className="size-3.5" aria-hidden />
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowMore((value) => !value)}
                aria-expanded={showMore}
                disabled={pending !== null}
                className={cx(
                  "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  showMore || audience || tone
                    ? "text-accent-bright hover:bg-accent/10"
                    : "text-faint hover:bg-raised hover:text-text",
                )}
              >
                <Users className="size-3.5" aria-hidden />
                Audience & tone
                {!showMore && (audience || tone) ? (
                  <span className="grid size-4 place-items-center rounded bg-accent/25 text-[10px]">
                    {[audience, tone].filter(Boolean).length}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
          <textarea
            id="idea"
            ref={textareaRef}
            rows={1}
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder={`e.g. ${EXAMPLE_IDEAS[exampleIndex]}`}
            disabled={pending !== null}
            aria-describedby="idea-help"
            onKeyDown={(event) => {
              // Enter creates; Shift+Enter adds a line. Never while an input
              // method (Khmer, Japanese, ...) is still composing a word.
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void create(hasAi);
              }
            }}
            className="block min-h-14 w-full resize-none max-sm:min-h-[4.5rem] bg-transparent px-5 pt-2 pb-2 text-[17px] leading-relaxed placeholder:text-faint focus:outline-none"
          />

          <div id="idea-help" className="min-h-9 px-5 pb-2">
            {!idea ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-xs text-faint">Try</span>
                {EXAMPLE_IDEAS.map((example, index) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => pickExample(example)}
                    disabled={pending !== null}
                    // Two are plenty on a phone.
                    className={cx(
                      index >= 2 && "max-sm:hidden",
                      "rounded-lg border border-line bg-raised/50 px-2.5 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-text",
                    )}
                  >
                    {example}
                  </button>
                ))}
              </div>
            ) : hasAi && isVague(idea) ? (
              <p className="animate-fade-in flex items-center gap-1.5 text-xs text-faint">
                <Lightbulb className="size-3.5 text-warning" aria-hidden />
                Add who it&apos;s for and what they&apos;ll learn for a sharper
                plan.
              </p>
            ) : (
              // Keyboard shortcuts mean nothing on a phone.
              <p className="flex items-center gap-1.5 text-xs text-faint max-sm:hidden">
                <Kbd>
                  <CornerDownLeft className="size-3" aria-label="Enter" />
                </Kbd>
                to {hasAi ? "plan with AI" : "create"}
                <span aria-hidden>·</span>
                <Kbd>Shift</Kbd>
                <Kbd>
                  <CornerDownLeft className="size-3" aria-label="Enter" />
                </Kbd>
                for a new line
              </p>
            )}
          </div>

          {showMore ? (
            <div className="animate-fade-in grid gap-3 border-t border-line/70 px-5 pt-4 pb-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-faint">
                  Audience <span className="text-faint/70">· optional</span>
                </span>
                <Input
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  placeholder="e.g. first-year students"
                  disabled={pending !== null}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-faint">
                  Tone <span className="text-faint/70">· optional</span>
                </span>
                <Input
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  placeholder="e.g. warm and playful"
                  disabled={pending !== null}
                />
              </label>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 px-4 pt-2 pb-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <PillSelect
                icon={<Layers className="size-3.5" aria-hidden />}
                label="Videos in the series"
                value={videos}
                onChange={setVideos}
                disabled={pending !== null}
                options={[3, 5, 7, 10].map(
                  (count) => [String(count), `${count} videos`] as const,
                )}
              />
              <PillSelect
                icon={<Globe className="size-3.5" aria-hidden />}
                label="Language"
                value={language}
                onChange={setLanguage}
                disabled={pending !== null}
                options={LANGUAGES}
              />
            </div>
            <ChoiceButtons
              className="sm:ml-auto [&>button]:w-full [&>button]:whitespace-nowrap sm:[&>button]:w-auto"
              manual={{
                label: "Plan it myself",
                onSelect: () => void create(false),
                loading: pending === "blank",
                disabled: !canCreate,
              }}
              ai={{
                label: "Plan with AI",
                service: "AI writing",
                available: hasAi,
                setup: SETUP.writing,
                onSelect: () => void create(true),
                loading: pending === "plan",
                disabled: hasAi && !canCreate,
              }}
            />
          </div>
        </div>
      </form>

      <p className="mx-auto max-w-xl text-center text-xs leading-relaxed text-faint">
        <span className="text-muted">Plan it myself</span> makes your text the
        series title, with empty videos for you to fill in.{" "}
        <span className="text-muted">Plan with AI</span> turns it into a full
        plan with an audience, themes, and hooks. You can edit everything either
        way.{" "}
        <button
          type="button"
          onClick={() => void createExample()}
          disabled={pending !== null}
          className="underline underline-offset-4 hover:text-muted"
        >
          {pending === "example" ? "Opening…" : "Or open an example project"}
        </button>
      </p>
    </div>
  );
};
