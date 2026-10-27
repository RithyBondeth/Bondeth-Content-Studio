"use client";

import { Download, Monitor, Play, Smartphone, X } from "lucide-react";
import { BlockSpinner } from "../Blocks";
import { useEffect, useState } from "react";
import type { VideoFormat } from "../../../src/lib/formats";
import type { RenderFile } from "../../../studio/server/projects";
import type { RenderJob } from "../../../studio/server/render-jobs";
import {
  getRenderJobAction,
  listRendersAction,
  startRenderAction,
} from "../../actions";
import { useToast } from "../Toast";
import { ProgressBar, cx, relativeTime } from "../ui";

const FORMAT_INFO: Record<
  VideoFormat,
  { label: string; detail: string; icon: typeof Smartphone }
> = {
  vertical: {
    label: "Vertical",
    detail: "9:16 · Shorts, TikTok, Reels",
    icon: Smartphone,
  },
  landscape: { label: "Landscape", detail: "16:9 · YouTube", icon: Monitor },
};

const jobLabel = (job: RenderJob) =>
  job.status === "queued"
    ? "Waiting for another render…"
    : job.status === "bundling"
      ? "Preparing…"
      : `${Math.round(job.progress * 100)}%`;

const isActive = (job: RenderJob | undefined): job is RenderJob =>
  !!job && !["done", "error"].includes(job.status);

const VideoModal = ({
  render,
  onClose,
}: {
  render: RenderFile;
  onClose: () => void;
}) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[80] grid place-items-center bg-black/80 p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="animate-rise-in relative flex max-h-full flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <video
          src={render.url}
          controls
          autoPlay
          className={cx(
            "rounded-2xl shadow-2xl",
            render.format === "vertical"
              ? "max-h-[80vh]"
              : "max-h-[75vh] max-w-[85vw]",
          )}
        />
        <div className="flex items-center gap-2">
          <a
            href={`${render.url}&download`}
            className="flex h-9 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm text-white backdrop-blur hover:bg-white/20"
          >
            <Download className="size-4" aria-hidden />
            Download
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm text-white backdrop-blur hover:bg-white/20"
          >
            <X className="size-4" aria-hidden />
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const RenderPanel = ({
  slug,
  index,
  initialRenders,
  beforeRender,
}: {
  slug: string;
  index: number;
  initialRenders: RenderFile[];
  /** Called before a render starts, e.g. to save pending edits. */
  beforeRender: () => Promise<boolean>;
}) => {
  const notify = useToast();
  const [renders, setRenders] = useState(initialRenders);
  const [jobs, setJobs] = useState<Partial<Record<VideoFormat, RenderJob>>>({});
  const [watching, setWatching] = useState<RenderFile | null>(null);
  const active = Object.values(jobs).filter(isActive);

  useEffect(() => {
    if (!active.length) return;
    const timer = setInterval(async () => {
      for (const job of active) {
        const result = await getRenderJobAction(job.id);
        if (!result.ok || !result.data) continue;
        const updated = result.data;
        setJobs((current) => ({ ...current, [updated.format]: updated }));
        if (updated.status === "done") {
          const list = await listRendersAction(slug, index);
          if (list.ok) setRenders(list.data);
          notify({
            tone: "success",
            title: `${FORMAT_INFO[updated.format].label} video is ready`,
          });
        }
        if (updated.status === "error") {
          notify({
            tone: "error",
            title: "Render failed",
            description: updated.error,
          });
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [active, slug, index, notify]);

  const start = async (format: VideoFormat) => {
    if (!(await beforeRender())) return;
    const result = await startRenderAction(slug, index, format);
    if (result.ok)
      setJobs((current) => ({ ...current, [format]: result.data }));
    else
      notify({
        tone: "error",
        title: "Couldn't start the render",
        description: result.error,
      });
  };

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/70 p-4"
      aria-labelledby="export-heading"
    >
      {watching ? (
        <VideoModal render={watching} onClose={() => setWatching(null)} />
      ) : null}
      <div className="flex items-baseline justify-between">
        <h3 id="export-heading" className="text-sm font-medium">
          Export
        </h3>
        <span className="text-[11px] text-faint">Renders on this computer</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["vertical", "landscape"] as const).map((format) => {
          const info = FORMAT_INFO[format];
          const job = jobs[format];
          const running = isActive(job);
          return (
            <button
              key={format}
              type="button"
              disabled={running}
              onClick={() => void start(format)}
              className="group flex flex-col items-start gap-2 rounded-xl border border-line bg-raised/60 p-3 text-left transition-all hover:border-accent/50 hover:bg-raised disabled:cursor-progress"
            >
              <span className="flex w-full items-center justify-between">
                <info.icon className="size-4 text-accent-bright" aria-hidden />
                {running ? (
                  <BlockSpinner className="size-3.5 text-accent-bright" />
                ) : null}
              </span>
              <span className="text-sm font-medium">
                {running ? jobLabel(job) : `Render ${info.label.toLowerCase()}`}
              </span>
              <span className="text-[11px] leading-snug text-faint">
                {info.detail}
              </span>
              {running ? (
                <ProgressBar
                  value={
                    job.status === "rendering"
                      ? job.progress
                      : job.status === "bundling"
                        ? 0.04
                        : 0
                  }
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {renders.length ? (
        <ul className="flex flex-col gap-1.5">
          {renders.map((render) => {
            const info = FORMAT_INFO[render.format];
            return (
              <li
                key={render.format}
                className="flex items-center gap-2 rounded-xl bg-bg/60 p-1.5 pr-2"
              >
                <button
                  type="button"
                  onClick={() => setWatching(render)}
                  className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left hover:bg-raised"
                >
                  <span className="bg-brand grid size-8 shrink-0 place-items-center rounded-lg">
                    <Play
                      className="size-3.5 fill-white text-white"
                      aria-hidden
                    />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[13px]">{info.label} video</span>
                    <span
                      className="text-[11px] text-faint"
                      suppressHydrationWarning
                    >
                      Rendered {relativeTime(render.updatedAt)}
                    </span>
                  </span>
                </button>
                <a
                  href={`${render.url}&download`}
                  className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-text"
                  aria-label={`Download ${info.label} video`}
                  title="Download"
                >
                  <Download className="size-4" aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
};
