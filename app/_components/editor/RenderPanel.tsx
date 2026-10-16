"use client";

import { Clapperboard, Download, Monitor, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import type { VideoFormat } from "../../../src/lib/formats";
import type { RenderFile } from "../../../studio/server/projects";
import type { RenderJob } from "../../../studio/server/render-jobs";
import {
  getRenderJobAction,
  listRendersAction,
  startRenderAction,
} from "../../actions";
import { Alert, Button, ProgressBar } from "../ui";

const FORMAT_LABEL: Record<VideoFormat, string> = {
  vertical: "Vertical 9:16",
  landscape: "Landscape 16:9",
};

const jobLabel = (job: RenderJob) =>
  job.status === "queued"
    ? "Waiting for another render to finish…"
    : job.status === "bundling"
      ? "Preparing…"
      : `Rendering ${Math.round(job.progress * 100)}%`;

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
  const [renders, setRenders] = useState(initialRenders);
  const [jobs, setJobs] = useState<Partial<Record<VideoFormat, RenderJob>>>({});
  const [error, setError] = useState<string | null>(null);
  const active = Object.values(jobs).filter(
    (job): job is RenderJob => !!job && !["done", "error"].includes(job.status),
  );

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
        }
        if (updated.status === "error")
          setError(updated.error ?? "Render failed.");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [active, slug, index]);

  const start = async (format: VideoFormat) => {
    setError(null);
    if (!(await beforeRender())) return;
    const result = await startRenderAction(slug, index, format);
    if (result.ok)
      setJobs((current) => ({ ...current, [format]: result.data }));
    else setError(result.error);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Clapperboard className="size-4 text-accent-bright" aria-hidden />
        Export
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {(["vertical", "landscape"] as const).map((format) => {
          const job = jobs[format];
          const running = !!job && !["done", "error"].includes(job.status);
          return (
            <Button
              key={format}
              size="sm"
              loading={running}
              onClick={() => void start(format)}
              icon={
                format === "vertical" ? (
                  <Smartphone className="size-3.5" aria-hidden />
                ) : (
                  <Monitor className="size-3.5" aria-hidden />
                )
              }
            >
              {format === "vertical" ? "Vertical" : "Landscape"}
            </Button>
          );
        })}
      </div>
      {active.map((job) => (
        <div key={job.id} className="flex flex-col gap-1.5" aria-live="polite">
          <div className="flex justify-between text-xs text-muted">
            <span>{FORMAT_LABEL[job.format]}</span>
            <span>{jobLabel(job)}</span>
          </div>
          <ProgressBar
            value={
              job.status === "rendering"
                ? job.progress
                : job.status === "bundling"
                  ? 0.05
                  : 0
            }
          />
        </div>
      ))}
      {error ? <Alert>{error}</Alert> : null}
      {renders.length ? (
        <ul className="flex flex-col gap-1.5">
          {renders.map((render) => (
            <li
              key={render.format}
              className="flex items-center justify-between gap-2 rounded-lg bg-raised px-3 py-2 text-sm"
            >
              <a
                href={render.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col hover:text-accent-bright"
              >
                <span>{FORMAT_LABEL[render.format]}</span>
                <span className="text-xs text-faint">
                  {new Date(render.updatedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </a>
              <a
                href={`${render.url}&download`}
                className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-text"
                aria-label={`Download ${FORMAT_LABEL[render.format]}`}
                title="Download"
              >
                <Download className="size-4" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-faint">
          Rendering runs on this computer and takes about as long as the video.
        </p>
      )}
    </div>
  );
};
