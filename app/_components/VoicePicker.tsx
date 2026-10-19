"use client";

import { Check, Pause, Play, RefreshCw, RotateCcw, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { VoiceSetting, VoiceSettings } from "../../src/spec/schema";
import {
  cleanVoiceSettings,
  filterVoices,
  VOICE_SETTING_NAMES,
  VOICE_SETTING_RANGES,
  voiceLabels,
  type VoiceSummary,
} from "../../src/lib/voice";
import { listVoicesAction } from "../actions";
import { Alert, Badge, Button, Input, cx } from "./ui";

type Load =
  | { kind: "loading" }
  | { kind: "ready"; voices: VoiceSummary[] }
  | { kind: "error"; message: string };

/** Plays one voice sample at a time. */
const usePreviewPlayer = () => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  const toggle = (voice: VoiceSummary) => {
    audio.current?.pause();
    if (playing === voice.id || !voice.previewUrl) {
      setPlaying(null);
      return;
    }
    const next = new Audio(voice.previewUrl);
    next.onended = () => setPlaying(null);
    next.onerror = () => setPlaying(null);
    audio.current = next;
    setPlaying(voice.id);
    void next.play().catch(() => setPlaying(null));
  };
  return { playing, toggle };
};

const VoiceRow = ({
  selected,
  title,
  detail,
  labels,
  onSelect,
  preview,
}: {
  selected: boolean;
  title: string;
  detail?: string;
  labels?: string[];
  onSelect: () => void;
  preview?: { playing: boolean; onToggle: () => void; name: string };
}) => (
  <li className="flex items-center gap-1">
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
        selected ? "bg-accent/12 ring-1 ring-accent/30" : "hover:bg-raised",
      )}
    >
      <span
        className={cx(
          "grid size-4 shrink-0 place-items-center rounded-full border",
          selected
            ? "border-accent bg-accent text-white"
            : "border-line-strong",
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {detail ? (
          <span className="block truncate text-xs text-faint">{detail}</span>
        ) : null}
        {labels?.length ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {labels.map((label) => (
              <Badge key={label}>{label}</Badge>
            ))}
          </span>
        ) : null}
      </span>
    </button>
    {preview ? (
      <Button
        variant="ghost"
        size="sm"
        onClick={preview.onToggle}
        aria-label={
          preview.playing
            ? `Stop the ${preview.name} sample`
            : `Play a sample of ${preview.name}`
        }
        title={preview.playing ? "Stop" : "Play a sample"}
        icon={
          preview.playing ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )
        }
      />
    ) : null}
  </li>
);

/**
 * Picks an ElevenLabs voice from the account, with a sample for each, and
 * tunes how it sounds. Leaving it on the first option falls back to
 * `fallback` (the project's voice, or the default from Settings or .env).
 */
export const VoicePicker = ({
  value,
  onChange,
  fallback,
  canList,
}: {
  value: VoiceSetting | undefined;
  onChange: (voice: VoiceSetting | undefined) => void;
  /** The first option: what's used when no voice is picked here. */
  fallback: { title: string; detail: string };
  /** False when there's no ElevenLabs key, so the list can't load. */
  canList: boolean;
}) => {
  const searchId = useId();
  const [load, setLoad] = useState<Load>(
    canList
      ? { kind: "loading" }
      : {
          kind: "error",
          message:
            "Add your ElevenLabs key in Settings to see your voices. You can still paste a voice ID.",
        },
  );
  const [query, setQuery] = useState("");
  const [manualId, setManualId] = useState("");
  const { playing, toggle } = usePreviewPlayer();

  const fetchVoices = async (fresh: boolean) => {
    setLoad({ kind: "loading" });
    const result = await listVoicesAction(fresh);
    setLoad(
      result.ok
        ? { kind: "ready", voices: result.data }
        : { kind: "error", message: result.error },
    );
  };

  useEffect(() => {
    if (canList) void fetchVoices(false);
  }, [canList]);

  const voices = load.kind === "ready" ? load.voices : [];
  const shown = filterVoices(voices, query);
  const known = value && voices.some((voice) => voice.id === value.voiceId);

  const pick = (voice: VoiceSummary) =>
    onChange({
      voiceId: voice.id,
      name: voice.name,
      // Settings carry over, so trying voices keeps the speed you chose.
      ...(value?.settings ? { settings: value.settings } : {}),
    });

  const setSetting = (name: keyof VoiceSettings, next: number) => {
    if (!value) return;
    const settings = cleanVoiceSettings({ ...value.settings, [name]: next });
    onChange({ ...value, ...(settings ? { settings } : {}) });
  };

  const resetSettings = () => {
    if (!value) return;
    const next = { ...value };
    delete next.settings;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <Input
            id={searchId}
            aria-label="Search voices"
            placeholder="Search by name, accent, age…"
            value={query}
            disabled={load.kind !== "ready"}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        {canList ? (
          <Button
            variant="secondary"
            onClick={() => void fetchVoices(true)}
            loading={load.kind === "loading"}
            aria-label="Reload voices"
            title="Reload voices from ElevenLabs"
            icon={<RefreshCw className="size-4" aria-hidden />}
          />
        ) : null}
      </div>

      {load.kind === "error" ? (
        <Alert tone="warning">{load.message}</Alert>
      ) : null}

      <ul
        role="radiogroup"
        aria-label="Voice"
        className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-xl border border-line bg-bg/40 p-1.5"
      >
        <VoiceRow
          selected={!value}
          title={fallback.title}
          detail={fallback.detail}
          onSelect={() => onChange(undefined)}
        />
        {value && !known ? (
          <VoiceRow
            selected
            title={value.name ?? "Voice by ID"}
            detail={value.voiceId}
            onSelect={() => undefined}
          />
        ) : null}
        {load.kind === "loading" ? (
          <li className="px-3 py-2 text-sm text-faint">Loading voices…</li>
        ) : null}
        {load.kind === "ready" && !shown.length ? (
          <li className="px-3 py-2 text-sm text-faint">
            {query
              ? `No voices match "${query}".`
              : "No voices in this account."}
          </li>
        ) : null}
        {shown.map((voice) => (
          <VoiceRow
            key={voice.id}
            selected={value?.voiceId === voice.id}
            title={voice.name}
            detail={voice.description}
            labels={voiceLabels(voice)}
            onSelect={() => pick(voice)}
            preview={
              voice.previewUrl
                ? {
                    playing: playing === voice.id,
                    onToggle: () => toggle(voice),
                    name: voice.name,
                  }
                : undefined
            }
          />
        ))}
      </ul>

      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const id = manualId.trim();
          if (!id) return;
          onChange({
            voiceId: id,
            ...(value?.settings ? { settings: value.settings } : {}),
          });
          setManualId("");
        }}
      >
        <Input
          aria-label="Voice ID"
          placeholder="Or paste a voice ID from the ElevenLabs voice library"
          value={manualId}
          onChange={(event) => setManualId(event.target.value)}
          className="font-mono text-xs"
        />
        <Button type="submit" variant="secondary" disabled={!manualId.trim()}>
          Use
        </Button>
      </form>

      {value ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-muted">
              How it sounds
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={resetSettings}
              disabled={!value.settings}
              icon={<RotateCcw className="size-3.5" aria-hidden />}
            >
              Reset
            </Button>
          </div>
          {VOICE_SETTING_NAMES.map((name) => {
            const range = VOICE_SETTING_RANGES[name];
            const current = value.settings?.[name] ?? range.defaultValue;
            const id = `${searchId}-${name}`;
            return (
              <div key={name} className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <label htmlFor={id} className="w-20 text-[13px] text-muted">
                    {range.label}
                  </label>
                  <input
                    id={id}
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    value={current}
                    onChange={(event) =>
                      setSetting(name, Number(event.target.value))
                    }
                    className="h-1.5 flex-1 cursor-pointer accent-accent"
                  />
                  <span className="w-10 text-right font-mono text-xs text-faint">
                    {name === "speed"
                      ? `${current.toFixed(2)}×`
                      : current.toFixed(2)}
                  </span>
                </div>
                <span className="pl-23 text-xs text-faint">{range.hint}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
