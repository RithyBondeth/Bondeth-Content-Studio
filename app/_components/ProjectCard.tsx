"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProjectSummary } from "../../studio/server/projects";
import { deleteProjectAction } from "../actions";

const Stat = ({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label: string;
}) => (
  <div className="flex flex-col">
    <span className="text-sm font-semibold">
      {value}
      <span className="text-faint">/{total}</span>
    </span>
    <span className="text-xs text-faint">{label}</span>
  </div>
);

export const ProjectCard = ({ project }: { project: ProjectSummary }) => {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (
      !window.confirm(
        `Delete "${project.title}"? This removes its scripts, voice-overs, and videos.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    const result = await deleteProjectAction(project.slug);
    if (!result.ok) {
      window.alert(result.error);
      setDeleting(false);
      return;
    }
    router.refresh();
  };

  return (
    <div className="group relative flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-faint">
      <Link
        href={`/projects/${project.slug}`}
        className="absolute inset-0 rounded-2xl"
        aria-label={`Open ${project.title}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{project.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{project.idea}</p>
        </div>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={deleting}
          className="relative z-10 rounded-md p-1.5 text-faint opacity-0 transition hover:bg-raised hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Delete ${project.title}`}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      <div className="flex gap-6">
        <Stat
          value={project.scripted}
          total={project.videos}
          label="scripted"
        />
        <Stat value={project.voiced} total={project.videos} label="voiced" />
        <Stat
          value={project.rendered}
          total={project.videos}
          label="rendered"
        />
      </div>
      <p className="text-xs text-faint">
        Created{" "}
        {new Date(project.createdAt).toLocaleDateString(undefined, {
          dateStyle: "medium",
        })}
      </p>
    </div>
  );
};
