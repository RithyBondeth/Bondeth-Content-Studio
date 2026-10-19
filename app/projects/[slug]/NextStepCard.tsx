"use client";

import {
  ArrowRight,
  Check,
  Clapperboard,
  FileText,
  Mic,
  PartyPopper,
  Send,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { VideoSummary } from "../../../studio/server/projects";
import { Button, buttonClass, cx } from "../../_components/ui";
import { nextStep, STAGES, stageOf, type Stage } from "./next-step";

const STAGE_INFO: Record<
  Stage,
  { label: string; icon: LucideIcon; say: (title: string) => string }
> = {
  script: {
    label: "Script",
    icon: FileText,
    say: (title) => `Write the script for “${title}”.`,
  },
  voice: {
    label: "Voice",
    icon: Mic,
    say: (title) =>
      `Record the voice-over for “${title}”, or skip it and render with captions only.`,
  },
  render: {
    label: "Render",
    icon: Clapperboard,
    say: (title) => `Render “${title}” to a video file.`,
  },
  publish: {
    label: "Publish",
    icon: Send,
    say: (title) =>
      `Write the posts for “${title}” and download a bundle for each platform.`,
  },
};

/**
 * Tells you what to do next in a project, for the earliest video that isn't
 * ready to post, with a button that goes straight there.
 */
export const NextStepCard = ({
  slug,
  videos,
  canWrite,
  writing,
  onWrite,
}: {
  slug: string;
  videos: VideoSummary[];
  /** Whether Claude can write scripts (ANTHROPIC_API_KEY is set). */
  canWrite: boolean;
  /** Videos whose scripts are being written right now. */
  writing: Set<number>;
  onWrite: (index: number) => void;
}) => {
  const progress = videos.map((video) => ({
    status: video.status,
    rendered: video.renders.length > 0,
    hasPosts: video.hasPosts,
  }));
  const step = nextStep(progress);

  if (!step) {
    return videos.length ? (
      <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/8 p-4 text-sm">
        <PartyPopper className="size-5 shrink-0 text-success" aria-hidden />
        Every video is rendered and has its posts written. Time to post them.
      </div>
    ) : null;
  }

  const video = videos[step.index]!;
  const current = stageOf(progress[step.index]!);
  const reached = current ? STAGES.indexOf(current) : STAGES.length;
  const href = `/projects/${slug}/videos/${step.index + 1}${step.stage === "publish" ? "?tab=publish" : ""}`;

  return (
    <section
      aria-label="Next step"
      className="flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent/6 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wide text-accent-bright uppercase">
          Next step · Video {step.index + 1}
        </p>
        <p className="text-sm">{STAGE_INFO[step.stage].say(video.title)}</p>
        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {STAGES.map((stage, index) => {
            const info = STAGE_INFO[stage];
            const done = index < reached;
            const active = index === reached;
            return (
              <li key={stage} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <span className="h-px w-3 bg-line-strong" aria-hidden />
                ) : null}
                <span
                  className={cx(
                    "flex items-center gap-1 rounded-full px-2 py-0.5",
                    done && "text-success",
                    active && "bg-accent/15 text-accent-bright",
                    !done && !active && "text-faint",
                  )}
                >
                  {done ? (
                    <Check className="size-3" aria-hidden />
                  ) : (
                    <info.icon className="size-3" aria-hidden />
                  )}
                  {info.label}
                  <span className="sr-only">
                    {done ? " (done)" : active ? " (next)" : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {step.stage === "script" ? (
        canWrite ? (
          <Button
            variant="primary"
            className="self-start sm:self-center"
            loading={writing.has(step.index)}
            onClick={() => onWrite(step.index)}
            icon={<Wand2 className="size-4" aria-hidden />}
          >
            Write script
          </Button>
        ) : (
          <p className="max-w-60 text-xs text-faint">
            Add ANTHROPIC_API_KEY to .env to write it with Claude.
          </p>
        )
      ) : (
        <Link
          href={href}
          className={cx(
            buttonClass({ variant: "primary" }),
            "self-start sm:self-center",
          )}
        >
          {step.stage === "publish" ? "Open Publish" : "Open video"}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </section>
  );
};
