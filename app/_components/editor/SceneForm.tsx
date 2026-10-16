"use client";

import { Mic, Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import { SUPPORTED_LANGUAGES } from "../../../src/lib/languages";
import { countWords, estimateNarrationSeconds } from "../../../src/lib/timing";
import type { Scene, SceneType, Transition } from "../../../src/spec/schema";
import { Badge, Button, Field, Input, Select, Textarea } from "../ui";
import { SCENE_META, SCENE_TYPE_ORDER } from "./scene-meta";

type SceneFormProps = {
  scene: Scene;
  index: number;
  onChange: (scene: Scene) => void;
  onChangeType: (type: SceneType) => void;
};

const QUICK_EMOJI = [
  "💡",
  "🔥",
  "✅",
  "❌",
  "🤔",
  "📈",
  "💰",
  "🧠",
  "⚡",
  "🌍",
  "🎯",
  "👋",
];

/** Edits a list of strings as one item per line. */
const LinesField = ({
  label,
  value,
  onChange,
  hint,
  rows = 4,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
  rows?: number;
}) => {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint ?? "One per line."}>
      <Textarea
        id={id}
        rows={rows}
        value={value.join("\n")}
        // Keep empty lines while typing; they're dropped when there's text on both sides.
        onChange={(event) => onChange(event.target.value.split("\n"))}
        onBlur={(event) =>
          onChange(event.target.value.split("\n").filter((line) => line.trim()))
        }
      />
    </Field>
  );
};

const TextField = ({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  hint,
  mono,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
}) => {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      {multiline ? (
        <Textarea
          id={id}
          rows={3}
          value={value ?? ""}
          placeholder={placeholder}
          className={mono ? "font-mono text-xs" : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
};

const TRANSITION_OPTIONS: { value: Transition; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "wipe", label: "Wipe" },
  { value: "zoom", label: "Zoom" },
  { value: "cut", label: "Cut" },
];

/** Empty optional strings are stored as "not set". */
const optional = (value: string) => (value.trim() ? value : undefined);

const TypeFields = ({
  scene,
  onChange,
}: {
  scene: Scene;
  onChange: (scene: Scene) => void;
}) => {
  switch (scene.type) {
    case "title":
      return (
        <>
          <TextField
            label="Heading"
            value={scene.heading}
            onChange={(heading) => onChange({ ...scene, heading })}
          />
          <TextField
            label="Subheading"
            value={scene.subheading}
            placeholder="Optional"
            onChange={(value) =>
              onChange({ ...scene, subheading: optional(value) })
            }
          />
        </>
      );
    case "statement":
      return (
        <>
          <TextField
            label="Text"
            multiline
            value={scene.text}
            onChange={(text) => onChange({ ...scene, text })}
          />
          <LinesField
            label="Highlighted words"
            rows={2}
            value={scene.highlight ?? []}
            hint="Words or phrases from the text to color. One per line."
            onChange={(highlight) => onChange({ ...scene, highlight })}
          />
        </>
      );
    case "list":
      return (
        <>
          <TextField
            label="Heading"
            value={scene.heading}
            onChange={(heading) => onChange({ ...scene, heading })}
          />
          <LinesField
            label="Items"
            value={scene.items}
            hint="One per line, up to 6."
            onChange={(items) => onChange({ ...scene, items })}
          />
          <Field label="Style">
            <Select
              value={scene.style ?? "bullets"}
              onChange={(event) =>
                onChange({
                  ...scene,
                  style: event.target.value as typeof scene.style,
                })
              }
            >
              <option value="bullets">Bullets</option>
              <option value="numbered">Numbered</option>
              <option value="checks">Checkmarks</option>
            </Select>
          </Field>
        </>
      );
    case "stat":
      return (
        <>
          <TextField
            label="Number"
            value={scene.value}
            hint={
              'Shown big. Leading digits count up, e.g. "73%", "$1.2M", "10x".'
            }
            onChange={(value) => onChange({ ...scene, value })}
          />
          <TextField
            label="Label"
            value={scene.label}
            onChange={(label) => onChange({ ...scene, label })}
          />
          <TextField
            label="Source"
            value={scene.source}
            placeholder="Optional, but recommended"
            onChange={(value) =>
              onChange({ ...scene, source: optional(value) })
            }
          />
        </>
      );
    case "quote":
      return (
        <>
          <TextField
            label="Quote"
            multiline
            value={scene.quote}
            onChange={(quote) => onChange({ ...scene, quote })}
          />
          <TextField
            label="Author"
            value={scene.author}
            placeholder="Optional"
            onChange={(value) =>
              onChange({ ...scene, author: optional(value) })
            }
          />
        </>
      );
    case "comparison":
      return (
        <>
          <TextField
            label="Heading"
            value={scene.heading}
            placeholder="Optional"
            onChange={(value) =>
              onChange({ ...scene, heading: optional(value) })
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {(["left", "right"] as const).map((side) => (
              <div
                key={side}
                className="flex flex-col gap-3 rounded-xl border border-line p-3"
              >
                <TextField
                  label={
                    side === "left" ? "Left side" : "Right side (highlighted)"
                  }
                  value={scene[side].label}
                  onChange={(label) =>
                    onChange({ ...scene, [side]: { ...scene[side], label } })
                  }
                />
                <LinesField
                  label="Points"
                  rows={3}
                  value={scene[side].points}
                  hint="One per line, up to 4."
                  onChange={(points) =>
                    onChange({ ...scene, [side]: { ...scene[side], points } })
                  }
                />
              </div>
            ))}
          </div>
        </>
      );
    case "code":
      return (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Language">
              <Select
                value={scene.language}
                onChange={(event) =>
                  onChange({
                    ...scene,
                    language: event.target.value as typeof scene.language,
                  })
                }
              >
                {SUPPORTED_LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </Select>
            </Field>
            <TextField
              label="File name"
              value={scene.fileName}
              placeholder="Optional"
              onChange={(value) =>
                onChange({ ...scene, fileName: optional(value) })
              }
            />
          </div>
          <div className="flex flex-col gap-3">
            {scene.steps.map((step, stepIndex) => (
              <div
                key={stepIndex}
                className="flex flex-col gap-2 rounded-xl border border-line p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tracking-wide text-muted uppercase">
                    Step {stepIndex + 1}
                  </span>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={scene.steps.length === 1}
                    aria-label={`Remove step ${stepIndex + 1}`}
                    onClick={() =>
                      onChange({
                        ...scene,
                        steps: scene.steps.filter((_, i) => i !== stepIndex),
                      })
                    }
                    icon={<Trash2 className="size-3.5" aria-hidden />}
                  />
                </div>
                <Textarea
                  aria-label={`Step ${stepIndex + 1} code`}
                  rows={Math.min(
                    14,
                    Math.max(4, step.code.split("\n").length + 1),
                  )}
                  value={step.code}
                  spellCheck={false}
                  className="font-mono text-xs"
                  onChange={(event) =>
                    onChange({
                      ...scene,
                      steps: scene.steps.map((s, i) =>
                        i === stepIndex
                          ? { ...s, code: event.target.value }
                          : s,
                      ),
                    })
                  }
                />
                <Input
                  aria-label={`Step ${stepIndex + 1} highlighted lines`}
                  placeholder='Lines to highlight, e.g. "2,4-6"'
                  value={step.highlight ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...scene,
                      steps: scene.steps.map((s, i) =>
                        i === stepIndex
                          ? { ...s, highlight: optional(event.target.value) }
                          : s,
                      ),
                    })
                  }
                />
              </div>
            ))}
            <Button
              size="sm"
              onClick={() =>
                onChange({
                  ...scene,
                  steps: [
                    ...scene.steps,
                    { code: scene.steps.at(-1)?.code ?? "" },
                  ],
                })
              }
              icon={<Plus className="size-3.5" aria-hidden />}
            >
              Add step
            </Button>
          </div>
        </>
      );
    case "cta":
      return (
        <>
          <TextField
            label="Heading"
            value={scene.heading}
            onChange={(heading) => onChange({ ...scene, heading })}
          />
          <TextField
            label="Button text"
            value={scene.action}
            onChange={(action) => onChange({ ...scene, action })}
          />
        </>
      );
  }
};

const Section = ({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface/60 p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-faint">{description}</p>
        ) : null}
      </div>
      {aside}
    </div>
    {children}
  </section>
);

const TemplatePicker = ({
  value,
  onChange,
}: {
  value: SceneType;
  onChange: (type: SceneType) => void;
}) => (
  <div
    role="radiogroup"
    aria-label="Scene template"
    className="grid grid-cols-4 gap-1.5 @xl:grid-cols-8"
  >
    {SCENE_TYPE_ORDER.map((type) => {
      const meta = SCENE_META[type];
      const active = type === value;
      return (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={active}
          title={meta.description}
          onClick={() => onChange(type)}
          className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[11px] transition-all ${
            active
              ? "border-transparent text-text"
              : "border-line text-faint hover:border-line-strong hover:text-muted"
          }`}
          style={
            active
              ? {
                  background: `${meta.color}1a`,
                  boxShadow: `inset 0 0 0 1px ${meta.color}80`,
                }
              : undefined
          }
        >
          <meta.icon
            className="size-4"
            style={{ color: active ? meta.color : undefined }}
            aria-hidden
          />
          <span className="truncate">
            {meta.label === "Call to action" ? "CTA" : meta.label}
          </span>
        </button>
      );
    })}
  </div>
);

export const SceneForm = ({
  scene,
  index,
  onChange,
  onChangeType,
}: SceneFormProps) => {
  const narrationId = useId();
  const emojiId = useId();
  const transitionId = useId();
  const words = countWords(scene.narration);
  const meta = SCENE_META[scene.type];

  return (
    <div className="@container flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          className="grid size-9 place-items-center rounded-xl"
          style={{ background: `${meta.color}1f`, color: meta.color }}
        >
          <meta.icon className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="font-medium">Scene {index + 1}</h2>
          <p className="text-xs text-faint">{meta.description}</p>
        </div>
      </div>

      <TemplatePicker value={scene.type} onChange={onChangeType} />

      <Section
        title="Voice-over"
        description="What the narrator says. Captions follow it word by word."
        aside={
          scene.audio ? (
            <Badge tone="success">
              <Mic className="size-3" aria-hidden />
              Recorded
            </Badge>
          ) : (
            <Badge>Not recorded</Badge>
          )
        }
      >
        <Field
          label="Narration"
          htmlFor={narrationId}
          aside={
            <span className="font-mono text-[11px] text-faint">
              {words} words · ~
              {estimateNarrationSeconds(scene.narration).toFixed(1)}s
            </span>
          }
        >
          <Textarea
            id={narrationId}
            rows={4}
            value={scene.narration}
            placeholder="What the voice-over says during this scene."
            onChange={(event) =>
              onChange({ ...scene, narration: event.target.value })
            }
          />
        </Field>
      </Section>

      <Section
        title="On screen"
        description="The text and visuals viewers see."
      >
        <TypeFields scene={scene} onChange={onChange} />
      </Section>

      <Section title="Style & timing">
        <Field
          label="Emoji"
          htmlFor={emojiId}
          hint="Optional. Shown as the scene's visual."
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              id={emojiId}
              value={scene.emoji ?? ""}
              onChange={(event) =>
                onChange({ ...scene, emoji: optional(event.target.value) })
              }
              className="w-14 text-center text-lg"
            />
            {QUICK_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`Use ${emoji}`}
                aria-pressed={scene.emoji === emoji}
                onClick={() =>
                  onChange({
                    ...scene,
                    emoji: scene.emoji === emoji ? undefined : emoji,
                  })
                }
                className={`grid size-9 place-items-center rounded-xl text-lg transition-all hover:scale-110 hover:bg-raised ${
                  scene.emoji === emoji
                    ? "bg-accent/20 ring-1 ring-accent/50"
                    : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Field>

        {index > 0 ? (
          <Field
            label="Transition in"
            htmlFor={transitionId}
            hint="How this scene replaces the one before it."
          >
            <Select
              id={transitionId}
              className="w-40"
              value={scene.transition ?? "fade"}
              onChange={(event) =>
                onChange({
                  ...scene,
                  transition: event.target.value as Transition,
                })
              }
            >
              {TRANSITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field
          label="Length"
          hint="Leave empty to fit the voice-over automatically."
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              step={0.5}
              aria-label="Scene length in seconds"
              placeholder="Auto"
              className="w-28"
              value={scene.durationInSeconds ?? ""}
              onChange={(event) => {
                const value = Number(event.target.value);
                onChange({
                  ...scene,
                  durationInSeconds:
                    event.target.value && value > 0 ? value : undefined,
                });
              }}
            />
            <span className="text-sm text-muted">seconds</span>
          </div>
        </Field>
      </Section>
    </div>
  );
};
