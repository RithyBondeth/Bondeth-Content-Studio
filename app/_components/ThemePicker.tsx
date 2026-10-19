"use client";

import { Check, ChevronDown, RotateCcw, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import {
  DEFAULT_THEME_PRESET,
  THEME_FONTS,
  THEME_PRESET_NAMES,
  THEME_PRESETS,
  type ThemeFont,
} from "../../src/theme/presets";
import {
  getContrastIssues,
  resolveTheme,
  type ThemeSetting,
} from "../../src/theme/resolve";
import { Alert, Select, cx } from "./ui";

type ColorKey = "accent" | "background" | "text";

const COLOR_FIELDS: { key: ColorKey; label: string }[] = [
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "text", label: "Text" },
];

const sameTheme = (a: ThemeSetting | undefined, b: ThemeSetting | undefined) =>
  JSON.stringify(a ?? { preset: DEFAULT_THEME_PRESET }) ===
  JSON.stringify(b ?? { preset: DEFAULT_THEME_PRESET });

/** A small picture of a theme: its background, text, and accent. */
const Swatch = ({
  theme,
  label,
  description,
  selected,
  onClick,
}: {
  theme: ThemeSetting;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) => {
  const { colors } = resolveTheme(theme);
  return (
    <button
      type="button"
      aria-pressed={selected}
      title={description}
      onClick={onClick}
      className={cx(
        "group flex flex-col gap-1.5 rounded-xl p-1.5 text-left transition-colors",
        selected ? "bg-accent/10 ring-2 ring-accent" : "hover:bg-raised",
      )}
    >
      <span
        className="relative flex h-14 w-full items-end gap-1.5 overflow-hidden rounded-lg p-2 ring-1 ring-line ring-inset"
        style={{ backgroundColor: colors.background }}
        aria-hidden
      >
        <span
          className="text-lg leading-none font-extrabold"
          style={{ color: colors.text }}
        >
          Aa
        </span>
        <span
          className="mb-0.5 h-2 w-6 rounded-full"
          style={{ backgroundColor: colors.accent }}
        />
        <span
          className="mb-0.5 h-2 w-3 rounded-full"
          style={{ backgroundColor: colors.textMuted, opacity: 0.6 }}
        />
        {selected ? (
          <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-accent text-white">
            <Check className="size-3" />
          </span>
        ) : null}
      </span>
      <span className="truncate px-0.5 text-xs font-medium">{label}</span>
    </button>
  );
};

/**
 * Picks a video's look: a preset, plus optional accent, background, text
 * color, and font. Warns when a custom color is hard to read.
 */
export const ThemePicker = ({
  value,
  onChange,
  brandTheme,
}: {
  value: ThemeSetting | undefined;
  onChange: (theme: ThemeSetting) => void;
  /** The project's brand kit theme, offered as the first choice. */
  brandTheme?: ThemeSetting;
}) => {
  const fontId = useId();
  const current = value ?? { preset: DEFAULT_THEME_PRESET };
  const resolved = resolveTheme(current);
  const customized = Boolean(
    current.accent || current.background || current.text || current.font,
  );
  const [open, setOpen] = useState(customized);
  const issues = getContrastIssues(resolved);
  const matchesBrand = brandTheme ? sameTheme(current, brandTheme) : false;

  const setColor = (key: ColorKey, color: string | undefined) => {
    const next: ThemeSetting = { ...current, [key]: color };
    if (!color) delete next[key];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-1.5">
        {brandTheme ? (
          <Swatch
            theme={brandTheme}
            label="Brand kit"
            description="Your project's brand kit theme"
            selected={matchesBrand}
            onClick={() => onChange(brandTheme)}
          />
        ) : null}
        {THEME_PRESET_NAMES.map((name) => (
          <Swatch
            key={name}
            theme={{ preset: name }}
            label={THEME_PRESETS[name].label}
            description={THEME_PRESETS[name].description}
            selected={!matchesBrand && !customized && current.preset === name}
            onClick={() => onChange({ preset: name })}
          />
        ))}
      </div>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 self-start rounded-lg px-1 text-xs text-muted hover:text-text"
      >
        <ChevronDown
          className={cx("size-3.5 transition-transform", !open && "-rotate-90")}
          aria-hidden
        />
        Customize colors and font
        {customized ? (
          <span className="text-faint">
            · based on {THEME_PRESETS[current.preset].label}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-bg/40 p-3">
          <div className="grid grid-cols-3 gap-2">
            {COLOR_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted">
                  {label}
                </span>
                <div className="flex items-center gap-1">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-line bg-bg/60 p-1 pr-2 hover:border-line-strong">
                    <input
                      type="color"
                      aria-label={`${label} color`}
                      value={resolved.colors[key]}
                      onChange={(event) =>
                        setColor(key, event.target.value.toUpperCase())
                      }
                      className="size-6 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
                    />
                    <span className="truncate font-mono text-[11px] text-faint">
                      {resolved.colors[key]}
                    </span>
                  </label>
                  {current[key] ? (
                    <button
                      type="button"
                      onClick={() => setColor(key, undefined)}
                      aria-label={`Reset ${label.toLowerCase()} color`}
                      title="Use the preset's color"
                      className="grid size-6 shrink-0 place-items-center rounded-md text-faint hover:bg-raised hover:text-text"
                    >
                      <RotateCcw className="size-3" aria-hidden />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={fontId}
              className="text-[11px] font-medium text-muted"
            >
              Font
            </label>
            <Select
              id={fontId}
              value={current.font ?? ""}
              onChange={(event) => {
                const font = event.target.value as ThemeFont | "";
                const next: ThemeSetting = {
                  ...current,
                  font: font || undefined,
                };
                if (!font) delete next.font;
                onChange(next);
              }}
            >
              <option value="">
                Preset font (
                {THEME_FONTS[THEME_PRESETS[current.preset].font].label})
              </option>
              {Object.entries(THEME_FONTS).map(([id, font]) => (
                <option key={id} value={id}>
                  {font.label}: {font.description.toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : null}

      {issues.length ? (
        <Alert
          tone="warning"
          icon={<TriangleAlert className="size-4" aria-hidden />}
        >
          Some text may be hard to read:{" "}
          {issues
            .map(
              (issue) =>
                `${issue.label.toLowerCase()} (${issue.ratio}:1, needs ${issue.minimum}:1)`,
            )
            .join(", ")}
          . Try a darker or lighter color.
        </Alert>
      ) : null}
    </div>
  );
};
