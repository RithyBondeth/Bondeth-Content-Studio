"use client";

import { Check, Globe, Layers, Loader2, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  createBlankProjectAction,
  createExampleProjectAction,
  createProjectAction,
} from "../actions";
import { ChoiceButtons, SETUP } from "./AiChoice";
import { useToast } from "./Toast";
import { Input, Kbd, cx } from "./ui";

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
  <label className="relative flex h-9 cursor-pointer items-center gap-2 rounded-full border border-line bg-raised/70 pr-3 pl-3 text-[13px] text-muted transition-colors focus-within:border-accent hover:border-line-strong hover:text-text">
    {icon}
    <span className="sr-only">{label}</span>
    <span>{options.find(([key]) => key === value)?.[1]}</span>
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="absolute inset-0 cursor-pointer opacity-0"
      aria-label={label}
    >
      {options.map(([key, name]) => (
        <option key={key} value={key}>
          {name}
        </option>
      ))}
    </select>
  </label>
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
                  "grid size-5 place-items-center rounded-full",
                  index < active && "bg-success/15 text-success",
                  index === active && "text-accent-bright",
                  index > active && "border border-line-strong",
                )}
              >
                {index < active ? (
                  <Check className="size-3" aria-hidden />
                ) : index === active ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
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

  const canCreate = idea.trim().length > 0 && pending === null;

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
        className="group relative rounded-3xl bg-gradient-to-b from-line-strong to-line p-px shadow-2xl shadow-black/40 transition focus-within:from-accent/70 focus-within:to-pink/30"
      >
        <div className="rounded-[calc(1.5rem-1px)] bg-surface">
          <label htmlFor="idea" className="sr-only">
            What do you want to teach?
          </label>
          <textarea
            id="idea"
            ref={textareaRef}
            rows={3}
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="What do you want to teach? e.g. Personal finance basics for university students"
            disabled={pending !== null}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void create(hasAi);
              }
            }}
            className="block min-h-32 w-full resize-none rounded-t-3xl bg-transparent px-5 pt-5 pb-2 text-[17px] leading-relaxed placeholder:text-faint focus:outline-none"
          />
          {showMore ? (
            <div className="animate-fade-in grid gap-3 px-5 pb-2 sm:grid-cols-2">
              <Input
                aria-label="Audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="Audience (optional), e.g. first-year students"
                disabled={pending !== null}
              />
              <Input
                aria-label="Tone"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                placeholder="Tone (optional), e.g. warm and playful"
                disabled={pending !== null}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 px-4 pt-2 pb-4">
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
            <button
              type="button"
              onClick={() => setShowMore((value) => !value)}
              aria-expanded={showMore}
              className={cx(
                "flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] transition-colors",
                showMore || audience || tone
                  ? "border-accent/40 bg-accent/10 text-accent-bright"
                  : "border-line bg-raised/70 text-muted hover:border-line-strong hover:text-text",
              )}
            >
              <Users className="size-3.5" aria-hidden />
              Audience & tone
            </button>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden items-center gap-1 text-xs text-faint md:flex">
                <Kbd>⌘ Enter</Kbd>
              </span>
              <ChoiceButtons
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
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-faint">Try:</span>
        {EXAMPLE_IDEAS.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setIdea(example);
              textareaRef.current?.focus();
            }}
            disabled={pending !== null}
            className="rounded-full border border-line bg-surface/50 px-3 py-1.5 text-xs text-muted transition-all hover:-translate-y-px hover:border-line-strong hover:text-text"
          >
            {example}
          </button>
        ))}
      </div>

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
