"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clapperboard,
  FileText,
  Lightbulb,
  Loader2,
  Mic,
  Pencil,
  Plus,
  RefreshCw,
  Target,
  Users,
  Volume2,
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
import { useConfirm } from "../../_components/ConfirmDialog";
import { BrandKitCard } from "./BrandKitCard";
import { Header } from "../../_components/Header";
import { KeyStatus } from "../../_components/KeyStatus";
import { Menu } from "../../_components/Menu";
import { useToast } from "../../_components/Toast";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  buttonClass,
  cx,
} from "../../_components/ui";

const STAGES = [
  { key: "script", label: "Script", icon: FileText },
  { key: "voice", label: "Voice", icon: Mic },
  { key: "export", label: "Export", icon: Clapperboard },
] as const;

/** Script → Voice → Export, with each stage marked done or not. */
const StageTrack = ({ video }: { video: VideoSummary }) => {
  const done = {
    script: video.status !== "draft",
    voice: video.status === "voiced",
    export: video.renders.length > 0,
  };
  return (
    <ol className="flex items-center gap-1.5" aria-label="Progress">
      {STAGES.map((stage, index) => (
        <li key={stage.key} className="flex items-center gap-1.5">
          <span
            className={cx(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset",
              done[stage.key]
                ? "bg-success/10 text-success ring-success/20"
                : "text-faint ring-line",
            )}
          >
            {done[stage.key] ? (
              <Check className="size-3" aria-hidden />
            ) : (
              <stage.icon className="size-3" aria-hidden />
            )}
            {stage.label}
          </span>
          {index < STAGES.length - 1 ? (
            <span className="h-px w-2 bg-line-strong" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
};

const StatTile = ({
  label,
  value,
  total,
  icon,
}: {
  label: string;
  value: number;
  /** Leave out for a plain count. */
  total?: number;
  icon: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/70 p-4">
    <div className="flex items-center justify-between text-[13px] text-muted">
      {label}
      <span className="text-faint">{icon}</span>
    </div>
    <p className="text-2xl font-medium tracking-tight">
      {value}
      {total !== undefined ? (
        <span className="text-base text-faint">/{total}</span>
      ) : (
        <span className="ml-1.5 text-sm text-faint">in the series</span>
      )}
    </p>
    {total !== undefined ? (
      <div className="h-1 overflow-hidden rounded-full bg-raised">
        <div
          className="bg-brand h-full rounded-full transition-[width] duration-500"
          style={{ width: `${total ? (value / total) * 100 : 0}%` }}
        />
      </div>
    ) : (
      <div className="h-1" />
    )}
  </div>
);

const Detail = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex gap-3">
    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-raised text-accent-bright">
      {icon}
    </span>
    <div className="min-w-0">
      <h3 className="text-xs text-faint">{label}</h3>
      <p className="mt-0.5 text-sm leading-relaxed">{children}</p>
    </div>
  </div>
);

const PlanEditor = ({
  plan,
  onDone,
}: {
  plan: PlanFile;
  onDone: () => void;
}) => {
  const router = useRouter();
  const notify = useToast();
  const [draft, setDraft] = useState<ContentPlan>(plan.plan);
  const [saving, setSaving] = useState(false);

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
    const result = await updatePlanAction(plan.slug, draft);
    setSaving(false);
    if (!result.ok) {
      notify({
        tone: "error",
        title: "Couldn't save the plan",
        description: result.error,
      });
      return;
    }
    notify({ tone: "success", title: "Plan saved" });
    router.refresh();
    onDone();
  };

  return (
    <Card className="animate-rise-in flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Edit plan</h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={() => void save()}
            icon={<Check className="size-4" aria-hidden />}
          >
            Save changes
          </Button>
        </div>
      </div>
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
        <span className="text-[13px] font-medium text-muted">Videos</span>
        {draft.videos.map((video, index) => (
          <div
            key={index}
            className="flex gap-3 rounded-xl border border-line bg-bg/40 p-3"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-raised font-mono text-xs text-muted">
              {index + 1}
            </span>
            <div className="flex flex-1 flex-col gap-2">
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
  const notify = useToast();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [seconds, setSeconds] = useState(45);
  const [writing, setWriting] = useState<Set<number>>(new Set());
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const content = plan.plan;
  const drafts = videos.filter((video) => video.status === "draft");
  const counts = {
    scripted: videos.filter((video) => video.status !== "draft").length,
    voiced: videos.filter((video) => video.status === "voiced").length,
    rendered: videos.filter((video) => video.renders.length > 0).length,
  };

  const writeScript = async (index: number) => {
    setWriting((current) => new Set(current).add(index));
    const result = await writeScriptAction(plan.slug, index, seconds);
    setWriting((current) => {
      const next = new Set(current);
      next.delete(index);
      return next;
    });
    if (!result.ok) {
      notify({
        tone: "error",
        title: `Couldn't write “${videos[index]?.title}”`,
        description: result.error,
      });
    }
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
    notify({
      tone: "success",
      title: "Scripts written",
      description: "Open a video to review and edit it.",
    });
  };

  const rewrite = async (index: number) => {
    const ok = await confirm({
      title: "Rewrite this script?",
      description:
        "Claude writes a fresh script for this video. Any edits you made to it will be replaced.",
      confirmLabel: "Rewrite script",
    });
    if (ok) void writeScript(index);
  };

  const addVideo = async () => {
    setAdding(true);
    const result = await addVideoAction(plan.slug, newTitle);
    setAdding(false);
    if (result.ok)
      router.push(`/projects/${plan.slug}/videos/${result.data + 1}`);
    else
      notify({
        tone: "error",
        title: "Couldn't add the video",
        description: result.error,
      });
  };

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {dialog}
      <div
        className="bg-stage pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70"
        aria-hidden
      />
      <Header>
        <KeyStatus status={keys} />
      </Header>
      <main className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-8 pb-24 sm:px-6">
        <div className="flex flex-col gap-5">
          <Link
            href="/"
            className="flex items-center gap-1.5 self-start text-sm text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All projects
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex max-w-3xl flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                {content.title}
              </h1>
              <p className="flex items-center gap-2 text-muted">
                <Lightbulb className="size-4 shrink-0 text-faint" aria-hidden />
                {plan.idea}
              </p>
            </div>
            {!editing ? (
              <Button
                variant="secondary"
                onClick={() => setEditing(true)}
                icon={<Pencil className="size-4" aria-hidden />}
              >
                Edit plan
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Videos"
            value={videos.length}
            icon={<Clapperboard className="size-4" aria-hidden />}
          />
          <StatTile
            label="Scripted"
            value={counts.scripted}
            total={videos.length}
            icon={<FileText className="size-4" aria-hidden />}
          />
          <StatTile
            label="Voiced"
            value={counts.voiced}
            total={videos.length}
            icon={<Volume2 className="size-4" aria-hidden />}
          />
          <StatTile
            label="Rendered"
            value={counts.rendered}
            total={videos.length}
            icon={<Check className="size-4" aria-hidden />}
          />
        </div>

        {editing ? (
          <PlanEditor plan={plan} onDone={() => setEditing(false)} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col gap-5 p-6 lg:col-span-2">
              <div className="grid gap-5 sm:grid-cols-2">
                <Detail
                  icon={<Users className="size-4" aria-hidden />}
                  label="Audience"
                >
                  {content.audience}
                </Detail>
                <Detail
                  icon={<Volume2 className="size-4" aria-hidden />}
                  label="Tone"
                >
                  {content.tone}
                </Detail>
              </div>
              <Detail
                icon={<Target className="size-4" aria-hidden />}
                label="Goal"
              >
                {content.goal}
              </Detail>
              {content.pillars.length ? (
                <div className="flex flex-wrap gap-2 border-t border-line pt-5">
                  {content.pillars.map((pillar) => (
                    <span
                      key={pillar.name}
                      title={pillar.description}
                      className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent-bright ring-1 ring-accent/20 ring-inset"
                    >
                      {pillar.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>
            <Card className="relative flex flex-col gap-3 overflow-hidden p-6">
              <div
                className="bg-brand absolute -top-16 -right-16 size-40 rounded-full opacity-20 blur-3xl"
                aria-hidden
              />
              <h2 className="flex items-center gap-2 text-xs text-faint">
                <CalendarDays className="size-4" aria-hidden />
                Posting schedule
              </h2>
              <p className="text-4xl font-bold tracking-tight">
                {content.schedule.postsPerWeek}
                <span className="ml-2 text-base font-normal text-muted">
                  videos a week
                </span>
              </p>
              <p className="text-sm leading-relaxed text-muted">
                {content.schedule.notes}
              </p>
            </Card>
          </div>
        )}

        <BrandKitCard
          key={JSON.stringify(plan.brand ?? null)}
          plan={plan}
          canListVoices={keys.elevenLabs}
        />

        <section
          className="flex flex-col gap-4"
          aria-labelledby="videos-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="videos-heading"
              className="text-xl font-medium tracking-tight"
            >
              Videos
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {keys.claude ? (
                <label className="flex items-center gap-2 text-sm text-muted">
                  Length
                  <Select
                    value={seconds}
                    onChange={(e) => setSeconds(Number(e.target.value))}
                    className="h-9 w-32"
                  >
                    {[30, 45, 60, 90].map((value) => (
                      <option key={value} value={value}>
                        {value} seconds
                      </option>
                    ))}
                  </Select>
                </label>
              ) : null}
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
                  Write{" "}
                  {drafts.length === 1
                    ? "the script"
                    : `all ${drafts.length} scripts`}
                </Button>
              ) : null}
            </div>
          </div>

          <ol className="flex flex-col gap-3">
            {videos.map((video) => {
              const isWriting = writing.has(video.index);
              const href = `/projects/${plan.slug}/videos/${video.index + 1}`;
              const scripted = video.status !== "draft";
              return (
                <li key={video.index}>
                  <div
                    className={cx(
                      "group relative flex flex-col gap-4 rounded-2xl border bg-surface/70 p-4 transition-all sm:flex-row sm:items-center sm:p-5",
                      isWriting
                        ? "border-accent/40"
                        : "border-line hover:border-line-strong hover:bg-surface",
                    )}
                  >
                    {isWriting ? (
                      <div
                        className="skeleton pointer-events-none absolute inset-0 rounded-2xl opacity-30"
                        aria-hidden
                      />
                    ) : null}
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised font-mono text-sm text-muted ring-1 ring-line ring-inset">
                      {String(video.index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <h3 className="font-medium">
                        {scripted ? (
                          <Link
                            href={href}
                            className="after:absolute after:inset-0 hover:text-accent-bright"
                          >
                            {video.title}
                          </Link>
                        ) : (
                          video.title
                        )}
                      </h3>
                      {video.hook ? (
                        <p className="line-clamp-2 text-sm text-muted">
                          “{video.hook}”
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3">
                        <StageTrack video={video} />
                        {scripted ? (
                          <span className="text-xs text-faint">
                            {video.scenes} scenes
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="relative z-10 flex shrink-0 items-center gap-1">
                      {isWriting ? (
                        <span className="flex items-center gap-2 px-3 text-sm text-accent-bright">
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
                          Claude is writing…
                        </span>
                      ) : scripted ? (
                        <>
                          <Link
                            href={href}
                            className={buttonClass({ variant: "secondary" })}
                          >
                            Open editor
                            <ArrowRight className="size-4" aria-hidden />
                          </Link>
                          {keys.claude ? (
                            <Menu
                              label={`Actions for ${video.title}`}
                              items={[
                                {
                                  label: "Rewrite script",
                                  icon: (
                                    <RefreshCw className="size-4" aria-hidden />
                                  ),
                                  onSelect: () => void rewrite(video.index),
                                },
                              ]}
                            />
                          ) : null}
                        </>
                      ) : (
                        <Button
                          variant="primary"
                          disabled={!keys.claude}
                          title={
                            keys.claude
                              ? undefined
                              : "Add ANTHROPIC_API_KEY to .env"
                          }
                          onClick={() => void writeScript(video.index)}
                          icon={<Wand2 className="size-4" aria-hidden />}
                        >
                          Write script
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <form
            className="flex flex-col gap-2 rounded-2xl border border-dashed border-line-strong p-3 transition-colors focus-within:border-accent/50 sm:flex-row sm:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              void addVideo();
            }}
          >
            <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-raised text-faint sm:grid">
              <Plus className="size-4" aria-hidden />
            </span>
            <input
              aria-label="New video title"
              placeholder="Add your own video, e.g. “3 budgeting myths”"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-10 flex-1 bg-transparent px-2 text-sm placeholder:text-faint focus:outline-none"
            />
            <Button
              type="submit"
              variant="secondary"
              loading={adding}
              disabled={!newTitle.trim()}
            >
              Add video
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
};
