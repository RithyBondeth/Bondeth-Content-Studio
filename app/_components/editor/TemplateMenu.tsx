"use client";

import { Check } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SceneType } from "../../../src/spec/schema";
import { cx } from "../ui";
import { SCENE_META, SCENE_TYPE_ORDER } from "./scene-meta";

/**
 * A button that opens every scene template, with what each one shows. Used
 * to add a scene and to switch a scene to another template.
 */
export const TemplateMenu = ({
  trigger,
  label,
  current,
  placement,
  onPick,
}: {
  /** The button's content. It gets `open` so it can show the menu's state. */
  trigger: (open: boolean) => ReactNode;
  label: string;
  /** The template in use, marked in the list. */
  current?: SceneType;
  /** Open above the button (at the bottom of a list) or below it. */
  placement: "above" | "below";
  onPick: (type: SceneType) => void;
}) => {
  const [open, setOpen] = useState(false);
  // Where the menu actually opens: the preferred side, unless the other has
  // more room, and how tall it can get there before it scrolls.
  const [fit, setFit] = useState<{ side: "above" | "below"; room: number }>({
    side: placement,
    room: 0,
  });
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const margin = 16;
    const above = rect.top - margin;
    const below = window.innerHeight - rect.bottom - margin;
    const preferred = placement === "above" ? above : below;
    const other = placement === "above" ? below : above;
    const side =
      preferred >= 420 || preferred >= other
        ? placement
        : placement === "above"
          ? "below"
          : "above";
    setFit({ side, room: Math.max(240, side === "above" ? above : below) });
  }, [open, placement]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) =>
      !ref.current?.contains(event.target as Node) && setOpen(false);
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
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="w-full"
      >
        {trigger(open)}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          style={fit.room ? { maxHeight: fit.room } : undefined}
          className={cx(
            "animate-rise-in absolute z-30 grid w-full min-w-72 grid-cols-2 gap-1 overflow-y-auto rounded-2xl border border-line-strong bg-raised p-1.5 shadow-2xl shadow-black/60",
            fit.side === "above" ? "bottom-full mb-2" : "top-full mt-2",
            placement === "above" ? "inset-x-0" : "right-0 sm:w-[28rem]",
          )}
        >
          {SCENE_TYPE_ORDER.map((type) => {
            const meta = SCENE_META[type];
            const active = type === current;
            return (
              <button
                key={type}
                type="button"
                role="menuitemradio"
                aria-checked={current ? active : undefined}
                onClick={() => {
                  setOpen(false);
                  onPick(type);
                }}
                className={cx(
                  "relative flex flex-col items-start gap-1.5 rounded-xl p-2.5 text-left transition-colors hover:bg-hover",
                  active && "bg-hover",
                )}
              >
                <span
                  className="grid size-7 place-items-center rounded-lg"
                  style={{ background: `${meta.color}1f`, color: meta.color }}
                >
                  <meta.icon className="size-3.5" aria-hidden />
                </span>
                <span className="text-[13px] font-medium">{meta.label}</span>
                <span className="text-[11px] leading-snug text-faint">
                  {meta.description}
                </span>
                {active ? (
                  <Check
                    className="absolute top-2.5 right-2.5 size-3.5 text-accent-bright"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
