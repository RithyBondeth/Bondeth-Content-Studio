"use client";

import { useEffect, useRef } from "react";
import { cx } from "./ui";

/** Distance between block centres, and each block's size, in CSS pixels. */
const PITCH = 28;
const SIZE = 22;
const RADIUS = 5;
/** How far the pointer's glow reaches. */
const REACH = 130;

const easeOutBack = (t: number) => {
  const c = 1.4;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

type Block = {
  x: number;
  y: number;
  delay: number;
  heat: number;
  landed: boolean;
};

/**
 * The block grid behind page headers, drawn on a canvas. With `intro`, the
 * blocks drop into place row by row when the page opens, each flashing as
 * it lands. Blocks light up around the pointer and leave a short trail, and
 * now and then one glows on its own. Reduced motion gets a still grid.
 */
export const BlockField = ({
  intro = false,
  className,
}: {
  intro?: boolean;
  className?: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let blocks: Block[] = [];
    let width = 0;
    let height = 0;
    const start = performance.now();
    const pointer = { x: -1e4, y: -1e4 };
    let colors = { lit: "#70b5f9", unlit: "rgb(255 255 255 / 0.045)" };

    const readColors = () => {
      const root = document.documentElement;
      const lit = getComputedStyle(root)
        .getPropertyValue("--color-accent-bright")
        .trim();
      const light = root.dataset.theme === "light";
      colors = {
        lit: lit || "#70b5f9",
        unlit: light ? "rgb(10 102 194 / 0.06)" : "rgb(255 255 255 / 0.045)",
      };
    };

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      // Columns are centred on the page, like the content above them.
      const half = Math.ceil(width / 2 / PITCH) + 1;
      const rows = Math.ceil(height / PITCH);
      blocks = [];
      for (let row = 0; row < rows; row++)
        for (let column = -half; column <= half; column++)
          blocks.push({
            x: width / 2 + column * PITCH - SIZE / 2,
            y: row * PITCH + (PITCH - SIZE) / 2,
            delay: row * 45 + Math.abs(column) * 14 + Math.random() * 160,
            heat: 0,
            landed: false,
          });
    };

    const DROP = 650;
    let frame = 0;
    let visible = true;
    let lastSpark = 0;

    const draw = (now: number) => {
      const elapsed = now - start;
      context.clearRect(0, 0, width, height);
      for (const block of blocks) {
        let y = block.y;
        let alpha = 1;
        if (intro && !still) {
          const t = (elapsed - block.delay) / DROP;
          if (t <= 0) continue;
          if (t < 1) {
            y -= (1 - easeOutBack(t)) * PITCH * 1.6;
            alpha = Math.min(1, t * 2.5);
          } else if (!block.landed) {
            block.landed = true;
            block.heat = Math.max(block.heat, 0.6); // A flash as it lands.
          }
        }
        if (!still) {
          const dx = block.x + SIZE / 2 - pointer.x;
          const dy = block.y + SIZE / 2 - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < REACH)
            block.heat = Math.max(
              block.heat,
              (1 - distance / REACH) ** 2 * 0.9,
            );
        }
        context.globalAlpha = alpha;
        context.fillStyle = colors.unlit;
        context.beginPath();
        context.roundRect(block.x, y, SIZE, SIZE, RADIUS);
        context.fill();
        if (block.heat > 0.01) {
          context.globalAlpha = alpha * block.heat * 0.7;
          context.fillStyle = colors.lit;
          context.fill();
          block.heat *= 0.95;
        } else block.heat = 0;
      }
      context.globalAlpha = 1;
      // Now and then a block in the upper rows glows on its own.
      if (!still && now - lastSpark > 450 && blocks.length) {
        lastSpark = now;
        const upper = blocks.filter((block) => block.y < height * 0.45);
        const pick = upper[Math.floor(Math.random() * upper.length)];
        if (pick) pick.heat = Math.max(pick.heat, 0.55);
      }
    };

    const loop = (now: number) => {
      if (frame % 60 === 0) readColors();
      draw(now);
      frame++;
      raf = visible && !still ? requestAnimationFrame(loop) : 0;
    };

    readColors();
    layout();
    let raf = requestAnimationFrame(loop);

    const resize = new ResizeObserver(() => {
      layout();
      if (still) draw(performance.now());
    });
    resize.observe(canvas);

    // Pause while the header is scrolled out of view.
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible && !raf && !still) raf = requestAnimationFrame(loop);
    });
    seen.observe(canvas);

    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const leave = () => {
      pointer.x = pointer.y = -1e4;
    };
    // Theme changes repaint the still grid straight away.
    const theme = new MutationObserver(() => {
      readColors();
      if (still) draw(performance.now());
    });
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      seen.disconnect();
      theme.disconnect();
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, [intro]);

  return (
    <div
      className={cx(
        "block-field pointer-events-none absolute inset-x-0 top-0",
        className,
      )}
      aria-hidden
    >
      <canvas ref={ref} className="size-full" />
    </div>
  );
};
