"use client";

import { ArrowDown, ArrowUp, Copy, Mic, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { needsReRecord } from "../../../src/lib/recording";
import type { SceneType, VideoSpecInput } from "../../../src/spec/schema";
import { Kbd, cx } from "../ui";
import { SCENE_META, sceneSummary } from "./scene-meta";
import { TemplateMenu } from "./TemplateMenu";

type SceneListProps = {
  scenes: VideoSpecInput["scenes"];
  durations: (number | null)[];
  selected: number;
  /** The scene under the preview's playhead, if it's playing. */
  playing: number | null;
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
      "grid size-6 place-items-center rounded-md text-faint transition-colors hover:bg-bg disabled:pointer-events-none disabled:opacity-25",
      danger ? "hover:text-danger" : "hover:text-text",
    )}
  >
    {children}
  </button>
);

const AddSceneMenu = ({ onAdd }: { onAdd: (type: SceneType) => void }) => (
  <TemplateMenu
    label="Add scene"
    placement="above"
    onPick={onAdd}
    trigger={(open) => (
      <span
        className={cx(
          "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm transition-colors",
          open
            ? "border-accent/60 bg-accent/8 text-accent-bright"
            : "border-line-strong text-muted hover:border-accent/50 hover:text-text",
        )}
      >
        <Plus className="size-4" aria-hidden />
        Add scene
      </span>
    )}
  />
);

export const SceneList = ({
  scenes,
  durations,
  selected,
  playing,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onAdd,
}: SceneListProps) => {
  const longest = Math.max(1, ...durations.map((duration) => duration ?? 0));
  const selectedRef = useRef<HTMLDivElement>(null);
  const previousSelected = useRef(selected);

  // Keep the selected scene in view when it changes, e.g. from the keyboard.
  // Comparing with the previous value (rather than skipping the first run)
  // keeps opening the editor from scrolling the page, even when React runs
  // effects twice in development.
  useEffect(() => {
    if (previousSelected.current === selected) return;
    previousSelected.current = selected;
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-1.5" aria-label="Scenes">
        {scenes.map((scene, index) => {
          const meta = SCENE_META[scene.type];
          const isSelected = index === selected;
          const duration = durations[index];
          return (
            <li key={index}>
              <div
                ref={isSelected ? selectedRef : undefined}
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
                  "group relative flex cursor-pointer gap-3 overflow-hidden rounded-xl border p-3 transition-all",
                  isSelected
                    ? "border-accent/60 bg-accent/8 shadow-[0_0_0_3px_rgb(124_92_255/0.12)]"
                    : "border-line bg-surface/60 hover:border-line-strong hover:bg-raised/60",
                )}
              >
                <span
                  className="absolute inset-y-0 left-0 w-0.5"
                  style={{ background: meta.color }}
                  aria-hidden
                />
                <div className="flex w-6 shrink-0 flex-col items-center gap-1.5 pt-0.5">
                  <span className="font-mono text-xs text-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {playing === index ? (
                    <span
                      className="flex h-3 items-end gap-px"
                      aria-label="Playing"
                    >
                      {[0, 1, 2].map((bar) => (
                        <span
                          key={bar}
                          className="w-0.5 animate-pulse rounded-full bg-accent-bright"
                          style={{
                            height: `${6 + bar * 3}px`,
                            animationDelay: `${bar * 150}ms`,
                          }}
                        />
                      ))}
                    </span>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <meta.icon
                      className="size-3.5 shrink-0"
                      style={{ color: meta.color }}
                      aria-hidden
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    {needsReRecord(scene) ? (
                      <Mic
                        className="size-3 text-warning"
                        aria-label="Re-record needed: the narration changed"
                      />
                    ) : scene.audio ? (
                      <Mic
                        className="size-3 text-success"
                        aria-label="Voice recorded"
                      />
                    ) : null}
                    <span className="ml-auto font-mono text-[11px] text-faint">
                      {duration !== null && duration !== undefined
                        ? `${duration.toFixed(1)}s`
                        : "–"}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[13px] leading-snug">
                    {scene.emoji ? (
                      <span className="mr-1">{scene.emoji}</span>
                    ) : null}
                    {sceneSummary(scene) || (
                      <span className="text-faint">Untitled</span>
                    )}
                  </p>
                  <div className="h-0.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full opacity-70"
                      style={{
                        width: `${((duration ?? 0) / longest) * 100}%`,
                        background: meta.color,
                      }}
                    />
                  </div>
                </div>
                <div
                  className={cx(
                    "absolute top-2 right-2 flex gap-0.5 rounded-lg border border-line bg-raised p-0.5 shadow-lg transition-opacity",
                    "pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100",
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
      <p className="hidden items-center justify-center gap-1.5 text-[11px] text-faint lg:flex">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        to switch scenes ·<Kbd>Space</Kbd>
        to play
      </p>
    </div>
  );
};
