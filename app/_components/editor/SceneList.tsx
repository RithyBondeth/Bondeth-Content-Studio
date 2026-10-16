"use client";

import { ArrowDown, ArrowUp, Copy, Mic, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SceneType, VideoSpecInput } from "../../../src/spec/schema";
import { cx } from "../ui";
import { SCENE_META, SCENE_TYPE_ORDER, sceneSummary } from "./scene-meta";

type SceneListProps = {
  scenes: VideoSpecInput["scenes"];
  durations: (number | null)[];
  selected: number;
  onSelect: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onAdd: (type: SceneType) => void;
};

const IconButton = ({
  label,
  onClick,
  disabled,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  danger?: boolean;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    className={cx(
      "rounded p-1 text-faint transition-colors hover:bg-bg disabled:pointer-events-none disabled:opacity-30",
      danger ? "hover:text-danger" : "hover:text-text",
    )}
  >
    {children}
  </button>
);

const AddSceneMenu = ({ onAdd }: { onAdd: (type: SceneType) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2.5 text-sm text-muted transition-colors hover:border-faint hover:text-text"
      >
        <Plus className="size-4" aria-hidden />
        Add scene
      </button>
      {open ? (
        <div className="absolute inset-x-0 bottom-full z-30 mb-2 grid gap-1 rounded-xl border border-line bg-raised p-1.5 shadow-2xl">
          {SCENE_TYPE_ORDER.map((type) => {
            const meta = SCENE_META[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onAdd(type);
                  setOpen(false);
                }}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-bg"
              >
                <meta.icon
                  className="size-4 shrink-0 text-accent-bright"
                  aria-hidden
                />
                <span className="flex flex-col">
                  <span className="text-sm">{meta.label}</span>
                  <span className="text-xs text-faint">{meta.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export const SceneList = ({
  scenes,
  durations,
  selected,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onAdd,
}: SceneListProps) => (
  <div className="flex flex-col gap-2">
    <ol className="flex flex-col gap-1.5" aria-label="Scenes">
      {scenes.map((scene, index) => {
        const meta = SCENE_META[scene.type];
        const isSelected = index === selected;
        const duration = durations[index];
        return (
          <li key={index}>
            <div
              role="button"
              tabIndex={0}
              aria-current={isSelected}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(index);
                }
              }}
              className={cx(
                "group flex cursor-pointer flex-col gap-1 rounded-xl border p-2.5 transition-colors",
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-transparent hover:bg-raised",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="w-4 text-xs text-faint tabular-nums">
                  {index + 1}
                </span>
                <meta.icon
                  className="size-3.5 shrink-0 text-accent-bright"
                  aria-hidden
                />
                <span className="text-xs font-medium text-muted">
                  {meta.label}
                </span>
                {scene.audio ? (
                  <Mic
                    className="size-3 text-success"
                    aria-label="Voice recorded"
                  />
                ) : null}
                <span className="ml-auto text-xs text-faint tabular-nums">
                  {duration !== null && duration !== undefined
                    ? `${duration.toFixed(1)}s`
                    : ""}
                </span>
              </div>
              <p className="line-clamp-2 pl-6 text-sm">
                {scene.emoji ? `${scene.emoji} ` : ""}
                {sceneSummary(scene)}
              </p>
              <div
                className={cx(
                  "flex justify-end gap-0.5 pl-6",
                  isSelected
                    ? "flex"
                    : "hidden group-hover:flex group-focus-within:flex",
                )}
              >
                <IconButton
                  label="Move up"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp className="size-3.5" aria-hidden />
                </IconButton>
                <IconButton
                  label="Move down"
                  onClick={() => onMove(index, 1)}
                  disabled={index === scenes.length - 1}
                >
                  <ArrowDown className="size-3.5" aria-hidden />
                </IconButton>
                <IconButton
                  label="Duplicate"
                  onClick={() => onDuplicate(index)}
                >
                  <Copy className="size-3.5" aria-hidden />
                </IconButton>
                <IconButton
                  label="Delete"
                  onClick={() => onDelete(index)}
                  disabled={scenes.length === 1}
                  danger
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </IconButton>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
    <AddSceneMenu onAdd={onAdd} />
  </div>
);
