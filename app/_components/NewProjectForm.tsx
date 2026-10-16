"use client";

import { ChevronDown, Sparkles, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createExampleProjectAction, createProjectAction } from "../actions";
import { Alert, Button, Field, Input, Select, Textarea } from "./ui";

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

// Shown one after another while Claude works, so the wait feels alive.
const PLANNING_STEPS = [
  "Understanding your idea…",
  "Picking the right audience…",
  "Choosing themes for the series…",
  "Writing hooks for each video…",
  "Putting together a posting schedule…",
];

export const NewProjectForm = ({ hasClaude }: { hasClaude: boolean }) => {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [videos, setVideos] = useState(5);
  const [language, setLanguage] = useState("en");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [pending, setPending] = useState<"plan" | "example" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (pending !== "plan") return;
    setStepIndex(0);
    const timer = setInterval(
      () =>
        setStepIndex((index) => Math.min(index + 1, PLANNING_STEPS.length - 1)),
      9000,
    );
    return () => clearInterval(timer);
  }, [pending]);

  const createPlan = async () => {
    setError(null);
    setPending("plan");
    const result = await createProjectAction({
      idea,
      videos,
      language,
      audience,
      tone,
    });
    if (result.ok) {
      router.push(`/projects/${result.data}`);
    } else {
      setError(result.error);
      setPending(null);
    }
  };

  const createExample = async () => {
    setError(null);
    setPending("example");
    const result = await createExampleProjectAction();
    if (result.ok) {
      router.push(`/projects/${result.data}`);
    } else {
      setError(result.error);
      setPending(null);
    }
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void createPlan();
      }}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="idea" className="sr-only">
          Your idea
        </label>
        <Textarea
          id="idea"
          rows={3}
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="e.g. Personal finance basics for university students"
          className="min-h-28 text-base"
          disabled={pending !== null}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              (event.metaKey || event.ctrlKey) &&
              idea.trim()
            ) {
              event.preventDefault();
              void createPlan();
            }
          }}
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_IDEAS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setIdea(example)}
              disabled={pending !== null}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-faint hover:text-text"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Videos in the series" htmlFor="videos">
          <Select
            id="videos"
            value={videos}
            onChange={(event) => setVideos(Number(event.target.value))}
            disabled={pending !== null}
          >
            {[3, 5, 7, 10].map((count) => (
              <option key={count} value={count}>
                {count} videos
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Language" htmlFor="language">
          <Select
            id="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            disabled={pending !== null}
          >
            {LANGUAGES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <button
        type="button"
        onClick={() => setShowMore((value) => !value)}
        className="flex items-center gap-1 self-start text-sm text-muted hover:text-text"
        aria-expanded={showMore}
      >
        <ChevronDown
          className={`size-4 transition-transform ${showMore ? "rotate-180" : ""}`}
          aria-hidden
        />
        Audience and tone
      </button>
      {showMore ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Audience"
            htmlFor="audience"
            hint="Leave empty and Claude will choose."
          >
            <Input
              id="audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="e.g. first-year university students"
              disabled={pending !== null}
            />
          </Field>
          <Field
            label="Tone"
            htmlFor="tone"
            hint="Leave empty and Claude will choose."
          >
            <Input
              id="tone"
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              placeholder="e.g. warm, playful, no jargon"
              disabled={pending !== null}
            />
          </Field>
        </div>
      ) : null}

      {!hasClaude ? (
        <Alert tone="warning">
          Add <code className="font-mono">ANTHROPIC_API_KEY</code> to{" "}
          <code className="font-mono">.env</code> and restart the studio to plan
          with Claude. Until then, try the example project.
        </Alert>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={pending === "plan"}
          disabled={!hasClaude || !idea.trim() || pending !== null}
          icon={<Wand2 className="size-4" aria-hidden />}
        >
          Create content plan
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          loading={pending === "example"}
          disabled={pending !== null}
          onClick={() => void createExample()}
          icon={<Sparkles className="size-4" aria-hidden />}
        >
          Try the example project
        </Button>
        {pending === "plan" ? (
          <p className="text-sm text-muted" aria-live="polite">
            {PLANNING_STEPS[stepIndex]} This usually takes about a minute.
          </p>
        ) : null}
      </div>
    </form>
  );
};
