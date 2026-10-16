"use client";

import {
  ArrowLeft,
  Check,
  Clapperboard,
  FileText,
  Mic,
  Pencil,
  Plus,
  RefreshCw,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContentPlan } from "../../../pipeline/schemas";
import type { PlanFile } from "../../../pipeline/store";
import type { KeyStatus as Keys } from "../../../studio/server/env";
import type { VideoSummary } from "../../../studio/server/projects";
import {
  addVideoAction,
  updatePlanAction,
  writeScriptAction,
} from "../../actions";
import { Header } from "../../_components/Header";
import { KeyStatus } from "../../_components/KeyStatus";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from "../../_components/ui";

const StatusBadge = ({ video }: { video: VideoSummary }) => {
  if (video.status === "draft") return <Badge>Idea</Badge>;
  return (
    <>
      <Badge tone={video.status === "voiced" ? "success" : "accent"}>
        {video.status === "voiced" ? (
          <Mic className="size-3" aria-hidden />
        ) : (
          <FileText className="size-3" aria-hidden />
        )}
        {video.status === "voiced" ? "Voiced" : "Scripted"} · {video.scenes}{" "}
        scenes
      </Badge>
      {video.renders.length ? (
        <Badge tone="success">
          <Clapperboard className="size-3" aria-hidden />
          Rendered
        </Badge>
      ) : null}
    </>
  );
};

const PlanEditor = ({
  plan,
  onDone,
}: {
  plan: PlanFile;
  onDone: () => void;
}) => {
  const router = useRouter();
  const [draft, setDraft] = useState<ContentPlan>(plan.plan);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ContentPlan>(key: K, value: ContentPlan[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setVideo = (index: number, key: "title" | "hook", value: string) =>
    setDraft((current) => ({
      ...current,
      videos: current.videos.map((video, i) =>
        i === index ? { ...video, [key]: value } : video,
      ),
    }));

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await updatePlanAction(plan.slug, draft);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    onDone();
  };

  return (
    <Card className="flex flex-col gap-5 p-6">
      <Field label="Series title" htmlFor="plan-title">
        <Input
          id="plan-title"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Audience" htmlFor="plan-audience">
          <Textarea
            id="plan-audience"
            rows={2}
            value={draft.audience}
            onChange={(e) => set("audience", e.target.value)}
          />
        </Field>
        <Field label="Tone" htmlFor="plan-tone">
          <Textarea
            id="plan-tone"
            rows={2}
            value={draft.tone}
            onChange={(e) => set("tone", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Goal" htmlFor="plan-goal">
        <Textarea
          id="plan-goal"
          rows={2}
          value={draft.goal}
          onChange={(e) => set("goal", e.target.value)}
        />
      </Field>
      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">
          Videos
        </span>
        {draft.videos.map((video, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[2rem_1fr]"
          >
            <span className="pt-2 text-sm text-faint">{index + 1}</span>
            <div className="flex flex-col gap-2">
              <Input
                aria-label={`Video ${index + 1} title`}
                value={video.title}
                onChange={(e) => setVideo(index, "title", e.target.value)}
              />
              <Textarea
                aria-label={`Video ${index + 1} hook`}
                rows={2}
                value={video.hook}
                placeholder="Hook: the first sentence viewers hear"
                onChange={(e) => setVideo(index, "hook", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex gap-2">
        <Button
          variant="primary"
          loading={saving}
          onClick={() => void save()}
          icon={<Check className="size-4" aria-hidden />}
        >
          Save plan
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
      </div>
    </Card>
  );
};

export const ProjectView = ({
  plan,
  videos,
  keys,
}: {
  plan: PlanFile;
  videos: VideoSummary[];
  keys: Keys;
}) => {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [seconds, setSeconds] = useState(45);
  const [writing, setWriting] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const content = plan.plan;
  const drafts = videos.filter((video) => video.status === "draft");

  const writeScript = async (index: number) => {
    setWriting((current) => new Set(current).add(index));
    setErrors((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
    const result = await writeScriptAction(plan.slug, index, seconds);
    setWriting((current) => {
      const next = new Set(current);
      next.delete(index);
      return next;
    });
    if (!result.ok)
      setErrors((current) => ({ ...current, [index]: result.error }));
    router.refresh();
  };

  const writeAll = async () => {
    const queue = drafts.map((video) => video.index);
    // Three at a time keeps things quick without hitting rate limits.
    const worker = async () => {
      for (
        let index = queue.shift();
        index !== undefined;
        index = queue.shift()
      ) {
        await writeScript(index);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  };

  const addVideo = async () => {
    setAdding(true);
    const result = await addVideoAction(plan.slug, newTitle);
    setAdding(false);
    if (result.ok) {
      router.push(`/projects/${plan.slug}/videos/${result.data + 1}`);
    } else {
      window.alert(result.error);
    }
  };

  const rewrite = (index: number) => {
    if (
      window.confirm(
        "Rewrite this script with Claude? Your edits to it will be replaced.",
      )
    ) {
      void writeScript(index);
    }
  };

  return (
    <>
      <Header>
        <KeyStatus status={keys} />
      </Header>
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="flex items-center gap-1 self-start text-sm text-muted hover:text-text"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All projects
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex max-w-3xl flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {content.title}
              </h1>
              <p className="text-muted">{plan.idea}</p>
            </div>
            {!editing ? (
              <Button
                onClick={() => setEditing(true)}
                icon={<Pencil className="size-4" aria-hidden />}
              >
                Edit plan
              </Button>
            ) : null}
          </div>
        </div>

        {editing ? (
          <PlanEditor plan={plan} onDone={() => setEditing(false)} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col gap-4 p-5 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
                    Audience
                  </h2>
                  <p className="mt-1 text-sm">{content.audience}</p>
                </div>
                <div>
                  <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
                    Tone
                  </h2>
                  <p className="mt-1 text-sm">{content.tone}</p>
                </div>
              </div>
              <div>
                <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
                  Goal
                </h2>
                <p className="mt-1 text-sm">{content.goal}</p>
              </div>
              {content.pillars.length ? (
                <div className="flex flex-wrap gap-2">
                  {content.pillars.map((pillar) => (
                    <span
                      key={pillar.name}
                      title={pillar.description}
                      className="rounded-full bg-raised px-3 py-1 text-xs text-muted"
                    >
                      {pillar.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>
            <Card className="flex flex-col gap-2 p-5">
              <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
                Posting schedule
              </h2>
              <p className="text-2xl font-semibold">
                {content.schedule.postsPerWeek}
                <span className="text-base font-normal text-muted">
                  {" "}
                  videos a week
                </span>
              </p>
              <p className="text-sm text-muted">{content.schedule.notes}</p>
            </Card>
          </div>
        )}

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold">Videos</h2>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Length" htmlFor="seconds">
                <Select
                  id="seconds"
                  value={seconds}
                  onChange={(e) => setSeconds(Number(e.target.value))}
                  className="w-32"
                >
                  {[30, 45, 60, 90].map((value) => (
                    <option key={value} value={value}>
                      {value} seconds
                    </option>
                  ))}
                </Select>
              </Field>
              {drafts.length > 0 ? (
                <Button
                  variant="primary"
                  onClick={() => void writeAll()}
                  disabled={!keys.claude || writing.size > 0}
                  title={
                    keys.claude ? undefined : "Add ANTHROPIC_API_KEY to .env"
                  }
                  icon={<Wand2 className="size-4" aria-hidden />}
                >
                  Write all {drafts.length} scripts
                </Button>
              ) : null}
            </div>
          </div>

          <ol className="flex flex-col gap-3">
            {videos.map((video) => {
              const isWriting = writing.has(video.index);
              return (
                <li key={video.index}>
                  <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-sm font-semibold text-muted">
                      {video.index + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{video.title}</h3>
                        <StatusBadge video={video} />
                      </div>
                      {video.hook ? (
                        <p className="text-sm text-muted">“{video.hook}”</p>
                      ) : null}
                      {errors[video.index] ? (
                        <Alert>{errors[video.index]}</Alert>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {video.status === "draft" ? (
                        <Button
                          variant="primary"
                          loading={isWriting}
                          disabled={!keys.claude}
                          title={
                            keys.claude
                              ? undefined
                              : "Add ANTHROPIC_API_KEY to .env"
                          }
                          onClick={() => void writeScript(video.index)}
                          icon={<Wand2 className="size-4" aria-hidden />}
                        >
                          {isWriting ? "Writing…" : "Write script"}
                        </Button>
                      ) : (
                        <>
                          {keys.claude ? (
                            <Button
                              variant="ghost"
                              size="md"
                              loading={isWriting}
                              onClick={() => rewrite(video.index)}
                              icon={
                                <RefreshCw className="size-4" aria-hidden />
                              }
                              aria-label="Rewrite script"
                              title="Rewrite script with Claude"
                            />
                          ) : null}
                          <Link
                            href={`/projects/${plan.slug}/videos/${video.index + 1}`}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                          >
                            <Pencil className="size-4" aria-hidden />
                            Open editor
                          </Link>
                        </>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>

          <form
            className="flex flex-col gap-2 rounded-2xl border border-dashed border-line p-4 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void addVideo();
            }}
          >
            <Input
              aria-label="New video title"
              placeholder="Add your own video, e.g. “3 budgeting myths”"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Button
              type="submit"
              loading={adding}
              icon={<Plus className="size-4" aria-hidden />}
            >
              Add video
            </Button>
          </form>
        </section>
      </main>
    </>
  );
};
