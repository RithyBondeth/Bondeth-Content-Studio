"use client";

import {
  ChevronDown,
  CircleAlert,
  Mic,
  Plus,
  Shapes,
  Trash2,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { findUnmatchedCues, moveCuesWithItems } from "../../../src/lib/cues";
import { ICON_NAMES, type IconName } from "../../../src/lib/icon-names";
import { ICONS } from "../../../src/lib/icons";
import { SUPPORTED_LANGUAGES } from "../../../src/lib/languages";
import { isSelfRecorded, needsReRecord } from "../../../src/lib/recording";
import { countWords, estimateNarrationSeconds } from "../../../src/lib/timing";
import type {
  ChartPoint,
  DiagramLayout,
  DiagramNode,
  Scene,
  SceneType,
  Transition,
} from "../../../src/spec/schema";
import {
  Alert,
  Badge,
  Button,
  buttonClass,
  cx,
  Field,
  Input,
  Select,
  Textarea,
} from "../ui";
import { ImageFields, type ImageContext } from "./ImageFields";
import { SCENE_META } from "./scene-meta";
import { TemplateMenu } from "./TemplateMenu";
import { VoiceRecorder } from "./VoiceRecorder";

type SceneFormProps = {
  scene: Scene;
  index: number;
  imageContext: ImageContext;
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

const CUE_PLACEHOLDER = "Words from the narration";

/** A cue input that warns when its words aren't in the narration. */
const CueInput = ({
  unmatched,
  ...props
}: React.ComponentProps<typeof Input> & { unmatched: boolean }) => {
  const warningId = useId();
  return (
    <div className="flex flex-col gap-1">
      <Input
        {...props}
        aria-invalid={unmatched || undefined}
        aria-describedby={unmatched ? warningId : undefined}
        className={unmatched ? "border-warning/50" : undefined}
      />
      {unmatched ? (
        <p
          id={warningId}
          className="flex items-center gap-1.5 text-xs text-warning"
        >
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          Not found in narration, so it uses fixed timing.
        </p>
      ) : null}
    </div>
  );
};

/** One cue input per list item, kept in the same order as the items. */
const ItemCuesField = ({
  items,
  cues,
  unmatched,
  onChange,
}: {
  items: string[];
  cues: string[] | undefined;
  unmatched: Set<string>;
  onChange: (cues: string[] | undefined) => void;
}) => (
  <Field
    label="Cues"
    hint="Optional. Each item appears when the narrator says these words, in order."
  >
    <div className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <CueInput
          key={index}
          aria-label={`Cue for item ${index + 1}`}
          placeholder={item.trim() || CUE_PLACEHOLDER}
          value={cues?.[index] ?? ""}
          unmatched={unmatched.has(`cues.${index}`)}
          onChange={(event) => {
            const next = items.map((_, i) =>
              i === index ? event.target.value : (cues?.[i] ?? ""),
            );
            onChange(next.some((cue) => cue.trim()) ? next : undefined);
          }}
        />
      ))}
    </div>
  </Field>
);

/** A labeled single cue, for stat and comparison scenes. */
const CueField = ({
  value,
  hint,
  unmatched,
  onChange,
}: {
  value: string | undefined;
  hint: string;
  unmatched: boolean;
  onChange: (value: string | undefined) => void;
}) => {
  const id = useId();
  return (
    <Field label="Cue" htmlFor={id} hint={hint}>
      <CueInput
        id={id}
        value={value ?? ""}
        placeholder={CUE_PLACEHOLDER}
        unmatched={unmatched}
        onChange={(event) => onChange(optional(event.target.value))}
      />
    </Field>
  );
};

/**
 * A number input that lets people type freely ("", "-", "5.") and only
 * reports finished numbers. It follows outside changes, such as undo.
 */
const NumberInput = ({
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: number;
  onChange: (value: number) => void;
}) => {
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setText(String(value));
  }
  return (
    <Input
      {...props}
      type="number"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        const next = event.target.valueAsNumber;
        if (Number.isFinite(next)) {
          setShown(next);
          onChange(next);
        }
      }}
      onBlur={() => setText(String(value))}
    />
  );
};

const MIN_CHART_POINTS = 2;
const MAX_CHART_POINTS = 6;

/** One row per chart point: its label, value, and cue. */
const ChartPointsField = ({
  points,
  unmatched,
  onChange,
}: {
  points: ChartPoint[];
  unmatched: Set<string>;
  onChange: (points: ChartPoint[]) => void;
}) => {
  const update = (index: number, change: Partial<ChartPoint>) =>
    onChange(
      points.map((point, i) => (i === index ? { ...point, ...change } : point)),
    );
  return (
    <Field
      label="Data"
      hint={`${MIN_CHART_POINTS} to ${MAX_CHART_POINTS} points, with values of 0 or more. Each point appears when the narrator says its cue, if it has one.`}
    >
      <div className="flex flex-col gap-2">
        {points.map((point, index) => (
          <div
            key={index}
            className="flex flex-col gap-1.5 rounded-xl border border-line p-2"
          >
            <div className="flex items-center gap-1.5">
              <Input
                aria-label={`Point ${index + 1} label`}
                placeholder="Label"
                value={point.label}
                onChange={(event) =>
                  update(index, { label: event.target.value })
                }
              />
              <NumberInput
                aria-label={`Point ${index + 1} value`}
                className="w-28 shrink-0"
                min={0}
                step="any"
                value={point.value}
                onChange={(value) =>
                  update(index, { value: Math.max(0, value) })
                }
              />
              <Button
                size="sm"
                variant="danger"
                disabled={points.length <= MIN_CHART_POINTS}
                aria-label={`Remove point ${index + 1}`}
                onClick={() => onChange(points.filter((_, i) => i !== index))}
                icon={<Trash2 className="size-3.5" aria-hidden />}
              />
            </div>
            <CueInput
              aria-label={`Cue for point ${index + 1}`}
              placeholder={`Cue: ${CUE_PLACEHOLDER.toLowerCase()}`}
              value={point.cue ?? ""}
              unmatched={unmatched.has(`points.${index}.cue`)}
              onChange={(event) =>
                update(index, { cue: optional(event.target.value) })
              }
            />
          </div>
        ))}
        <Button
          size="sm"
          disabled={points.length >= MAX_CHART_POINTS}
          onClick={() =>
            onChange([
              ...points,
              { label: "", value: points.at(-1)?.value ?? 0 },
            ])
          }
          icon={<Plus className="size-3.5" aria-hidden />}
        >
          Add point
        </Button>
      </div>
    </Field>
  );
};

const MIN_DIAGRAM_NODES = 2;
const MAX_DIAGRAM_NODES = 6;

const DIAGRAM_LAYOUTS: { value: DiagramLayout; label: string }[] = [
  { value: "flow", label: "Flow: steps joined by arrows" },
  { value: "cycle", label: "Cycle: steps that loop back" },
  { value: "hub", label: "Hub: the first node in the middle" },
];

/** "book-open" → "Book open". */
const iconLabel = (name: IconName) =>
  name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");

/** One row per diagram node: its icon, label, and cue. */
const DiagramNodesField = ({
  nodes,
  unmatched,
  onChange,
}: {
  nodes: DiagramNode[];
  unmatched: Set<string>;
  onChange: (nodes: DiagramNode[]) => void;
}) => {
  const update = (index: number, change: Partial<DiagramNode>) =>
    onChange(
      nodes.map((node, i) => (i === index ? { ...node, ...change } : node)),
    );
  return (
    <Field
      label="Nodes"
      hint={`${MIN_DIAGRAM_NODES} to ${MAX_DIAGRAM_NODES}, in order. Each appears when the narrator says its cue, if it has one.`}
    >
      <div className="flex flex-col gap-2">
        {nodes.map((node, index) => {
          const Icon = node.icon ? ICONS[node.icon] : null;
          return (
            <div
              key={index}
              className="flex flex-col gap-1.5 rounded-xl border border-line p-2"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-accent/60 text-accent-bright"
                  aria-hidden
                >
                  {Icon ? (
                    <Icon className="size-4" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </span>
                <Select
                  aria-label={`Node ${index + 1} icon`}
                  className="w-36 shrink-0"
                  value={node.icon ?? ""}
                  onChange={(event) =>
                    update(index, {
                      icon: (event.target.value || undefined) as
                        IconName | undefined,
                    })
                  }
                >
                  <option value="">Number</option>
                  {ICON_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {iconLabel(name)}
                    </option>
                  ))}
                </Select>
                <Input
                  aria-label={`Node ${index + 1} label`}
                  placeholder="Label"
                  value={node.label}
                  onChange={(event) =>
                    update(index, { label: event.target.value })
                  }
                />
                <Button
                  size="sm"
                  variant="danger"
                  disabled={nodes.length <= MIN_DIAGRAM_NODES}
                  aria-label={`Remove node ${index + 1}`}
                  onClick={() => onChange(nodes.filter((_, i) => i !== index))}
                  icon={<Trash2 className="size-3.5" aria-hidden />}
                />
              </div>
              <CueInput
                aria-label={`Cue for node ${index + 1}`}
                placeholder={`Cue: ${CUE_PLACEHOLDER.toLowerCase()}`}
                value={node.cue ?? ""}
                unmatched={unmatched.has(`nodes.${index}.cue`)}
                onChange={(event) =>
                  update(index, { cue: optional(event.target.value) })
                }
              />
            </div>
          );
        })}
        <Button
          size="sm"
          disabled={nodes.length >= MAX_DIAGRAM_NODES}
          onClick={() => onChange([...nodes, { label: "" }])}
          icon={<Plus className="size-3.5" aria-hidden />}
        >
          Add node
        </Button>
      </div>
    </Field>
  );
};

const TypeFields = ({
  scene,
  imageContext,
  onChange,
}: {
  scene: Scene;
  imageContext: ImageContext;
  onChange: (scene: Scene) => void;
}) => {
  // Paths like "cues.1" or "left.cue" for cues that aren't in the narration.
  const unmatched = useMemo(() => new Set(findUnmatchedCues(scene)), [scene]);

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
            onChange={(items) =>
              onChange({
                ...scene,
                items,
                cues: moveCuesWithItems(scene.items, items, scene.cues),
              })
            }
          />
          <ItemCuesField
            items={scene.items}
            cues={scene.cues}
            unmatched={unmatched}
            onChange={(cues) => onChange({ ...scene, cues })}
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
          <CueField
            value={scene.cue}
            hint="Optional. The number counts up when the narrator says these words."
            unmatched={unmatched.has("cue")}
            onChange={(cue) => onChange({ ...scene, cue })}
          />
        </>
      );
    case "chart":
      return (
        <>
          <TextField
            label="Heading"
            value={scene.heading}
            onChange={(heading) => onChange({ ...scene, heading })}
          />
          <ChartPointsField
            points={scene.points}
            unmatched={unmatched}
            onChange={(points) => onChange({ ...scene, points })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Style">
              <Select
                value={scene.style ?? "bar"}
                onChange={(event) =>
                  onChange({
                    ...scene,
                    style: event.target.value as typeof scene.style,
                  })
                }
              >
                <option value="bar">Bars</option>
                <option value="line">Line</option>
              </Select>
            </Field>
            <TextField
              label="Unit"
              value={scene.unit}
              placeholder='Optional, e.g. "%", "x", "km", "$"'
              onChange={(value) =>
                onChange({ ...scene, unit: optional(value) })
              }
            />
          </div>
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
                <CueField
                  value={scene[side].cue}
                  hint="Optional. This side appears when the narrator says these words."
                  unmatched={unmatched.has(`${side}.cue`)}
                  onChange={(cue) =>
                    onChange({ ...scene, [side]: { ...scene[side], cue } })
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
                {stepIndex > 0 ? (
                  <CueInput
                    aria-label={`Step ${stepIndex + 1} cue`}
                    placeholder="Cue: words from the narration where this step starts"
                    value={step.cue ?? ""}
                    unmatched={unmatched.has(`steps.${stepIndex}.cue`)}
                    onChange={(event) =>
                      onChange({
                        ...scene,
                        steps: scene.steps.map((s, i) =>
                          i === stepIndex
                            ? { ...s, cue: optional(event.target.value) }
                            : s,
                        ),
                      })
                    }
                  />
                ) : null}
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
    case "image":
      return (
        <ImageFields scene={scene} context={imageContext} onChange={onChange} />
      );
    case "diagram":
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
          <Field label="Layout">
            <Select
              value={scene.layout ?? "flow"}
              onChange={(event) =>
                onChange({
                  ...scene,
                  layout: event.target.value as DiagramLayout,
                })
              }
            >
              {DIAGRAM_LAYOUTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <DiagramNodesField
            nodes={scene.nodes}
            unmatched={unmatched}
            onChange={(nodes) => onChange({ ...scene, nodes })}
          />
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

export const SceneForm = ({
  scene,
  index,
  imageContext,
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
          className="grid size-9 shrink-0 place-items-center rounded-xl"
          style={{ background: `${meta.color}1f`, color: meta.color }}
        >
          <meta.icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">
            Scene {index + 1} · {meta.label}
          </h2>
          <p className="truncate text-xs text-faint">{meta.description}</p>
        </div>
        <TemplateMenu
          label="Change template"
          placement="below"
          current={scene.type}
          onPick={onChangeType}
          trigger={(open) => (
            <span
              className={cx(
                buttonClass({ variant: "secondary", size: "sm" }),
                open && "border-accent/60 text-accent-bright",
              )}
            >
              <Shapes className="size-3.5" aria-hidden />
              Change template
              <ChevronDown
                className={cx(
                  "size-3.5 transition-transform",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </span>
          )}
        />
      </div>

      <Section
        title="Voice-over"
        description="What the narrator says. Captions follow it word by word."
        aside={
          needsReRecord(scene) ? (
            <Badge tone="warning">
              <Mic className="size-3" aria-hidden />
              Re-record needed
            </Badge>
          ) : isSelfRecorded(scene.audio) ? (
            <Badge tone="success">
              <Mic className="size-3" aria-hidden />
              Your voice
            </Badge>
          ) : scene.audio ? (
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
        {needsReRecord(scene) ? (
          <Alert tone="warning">
            The narration changed after you recorded it, so your recording and
            captions no longer match. Re-record this scene, or remove the
            recording to use an ElevenLabs voice.
          </Alert>
        ) : null}
        <VoiceRecorder
          slug={imageContext.slug}
          videoIndex={imageContext.videoIndex}
          sceneIndex={index}
          narration={scene.narration}
          audio={scene.audio}
          onChange={(audio) => {
            const next = { ...scene, audio };
            if (!audio) delete next.audio;
            onChange(next);
          }}
        />
      </Section>

      <Section
        title="On screen"
        description="The text and visuals viewers see."
      >
        <TypeFields
          scene={scene}
          imageContext={imageContext}
          onChange={onChange}
        />
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
