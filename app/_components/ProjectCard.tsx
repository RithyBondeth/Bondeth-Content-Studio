"use client";

import { ArrowUpRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProjectSummary } from "../../studio/server/projects";
import { deleteProjectAction } from "../actions";
import { useConfirm } from "./ConfirmDialog";
import { Menu } from "./Menu";
import { useToast } from "./Toast";
import { relativeTime } from "./ui";

/** A stable hue per project, so each card has its own color. */
const hueFor = (text: string) => {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return 230 + (hash % 110); // Keep within blue → violet → pink.
};

const Progress = ({ project }: { project: ProjectSummary }) => {
  const steps = [
    { label: "Scripted", value: project.scripted },
    { label: "Voiced", value: project.voiced },
    { label: "Rendered", value: project.rendered },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {steps.map((step) => (
        <div key={step.label} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-faint">{step.label}</span>
            <span className="font-mono text-muted">
              {step.value}/{project.videos}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-raised">
            <div
              className="bg-brand h-full rounded-full"
              style={{
                width: `${project.videos ? (step.value / project.videos) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ProjectCard = ({ project }: { project: ProjectSummary }) => {
  const router = useRouter();
  const notify = useToast();
  const { confirm, dialog } = useConfirm();
  const hue = hueFor(project.slug);

  const remove = async () => {
    const ok = await confirm({
      title: `Delete “${project.title}”?`,
      description:
        "This removes its plan, scripts, voice-overs, and rendered videos. You can't undo this.",
      confirmLabel: "Delete project",
      danger: true,
    });
    if (!ok) return;
    const result = await deleteProjectAction(project.slug);
    if (!result.ok) {
      notify({
        tone: "error",
        title: "Couldn't delete the project",
        description: result.error,
      });
      return;
    }
    notify({ tone: "success", title: "Project deleted" });
    router.refresh();
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-2xl hover:shadow-black/40">
      {dialog}
      <div
        className="relative h-24 overflow-hidden"
        style={{
          background: `radial-gradient(120% 140% at 0% 0%, hsl(${hue} 85% 62% / 0.55), transparent 60%), radial-gradient(100% 120% at 100% 100%, hsl(${hue + 40} 80% 55% / 0.35), transparent 60%), var(--color-raised)`,
        }}
      >
        <span className="absolute bottom-3 left-4 text-4xl font-bold tracking-tight text-white/90 drop-shadow">
          {project.title
            .replace(/^example:\s*/i, "")
            .slice(0, 1)
            .toUpperCase()}
        </span>
        <ArrowUpRight
          className="absolute top-3 right-3 size-4 text-white/60 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-medium">
              <Link
                href={`/projects/${project.slug}`}
                className="after:absolute after:inset-0"
              >
                {project.title}
              </Link>
            </h3>
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">
              {project.idea}
            </p>
          </div>
          <Menu
            className="relative z-10 -mt-1 -mr-2"
            label={`Actions for ${project.title}`}
            items={[
              {
                label: "Delete project",
                icon: <Trash2 className="size-4" aria-hidden />,
                danger: true,
                onSelect: () => void remove(),
              },
            ]}
          />
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <Progress project={project} />
          <p className="text-xs text-faint" suppressHydrationWarning>
            {project.videos} videos · {relativeTime(project.createdAt)}
          </p>
        </div>
      </div>
    </article>
  );
};
