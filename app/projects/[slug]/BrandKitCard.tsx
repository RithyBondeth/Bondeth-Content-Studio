"use client";

import { Check, Palette, Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { PlanFile } from "../../../pipeline/store";
import { brand as defaultBrand } from "../../../src/brand";
import { describeScenes } from "../../../src/lib/voice";
import type { BrandKit } from "../../../src/spec/schema";
import { THEME_PRESETS } from "../../../src/theme/presets";
import { resolveTheme } from "../../../src/theme/resolve";
import { projectVoiceChangesAction, updateBrandKitAction } from "../../actions";
import { ThemePicker } from "../../_components/ThemePicker";
import { useToast } from "../../_components/Toast";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Skeleton,
} from "../../_components/ui";
import { VoicePicker } from "../../_components/VoicePicker";
import type { VoiceChange } from "../../../studio/server/projects";

// The player only runs in the browser.
const BrandPreview = dynamic(
  () => import("./BrandPreview").then((module) => module.BrandPreview),
  {
    ssr: false,
    loading: () => <Skeleton className="aspect-video w-full rounded-[14px]" />,
  },
);

const ThemeDots = ({ kit }: { kit: BrandKit | undefined }) => {
  const { colors } = resolveTheme(kit?.theme);
  return (
    <span className="flex -space-x-1.5" aria-hidden>
      {[colors.background, colors.accent, colors.text].map((color, index) => (
        <span
          key={index}
          className="size-5 rounded-full ring-2 ring-surface"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
};

/**
 * The project's identity: the creator's name, handle, and website, and the
 * theme new videos start with. Edited with a live sample video.
 */
export const BrandKitCard = ({
  plan,
  canListVoices,
}: {
  plan: PlanFile;
  /** False without an ElevenLabs key; the voice can still be pasted in. */
  canListVoices: boolean;
}) => {
  const router = useRouter();
  const notify = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BrandKit>(plan.brand ?? {});
  const [saving, setSaving] = useState(false);
  const kit = plan.brand;

  const set = (key: "name" | "handle" | "website", value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  // The preview shows what a video would: only the fields that are filled in.
  const previewBrand = useMemo(() => {
    const filled = Object.fromEntries(
      (["name", "handle", "website"] as const)
        .map((key) => [key, draft[key]?.trim()])
        .filter(([, value]) => value),
    );
    return Object.keys(filled).length ? filled : undefined;
  }, [draft]);

  // Recorded scenes the new voice would redo, worked out as it changes.
  const [voiceChanges, setVoiceChanges] = useState<VoiceChange[]>([]);
  const draftVoiceKey = JSON.stringify(draft.voice ?? null);
  const savedVoiceKey = JSON.stringify(kit?.voice ?? null);
  useEffect(() => {
    if (!editing || draftVoiceKey === savedVoiceKey) {
      setVoiceChanges([]);
      return;
    }
    let current = true;
    const timer = setTimeout(() => {
      void projectVoiceChangesAction(
        plan.slug,
        JSON.parse(draftVoiceKey) ?? undefined,
      ).then((result) => {
        if (current) setVoiceChanges(result.ok ? result.data : []);
      });
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [editing, draftVoiceKey, savedVoiceKey, plan.slug]);

  const save = async () => {
    setSaving(true);
    const result = await updateBrandKitAction(plan.slug, draft);
    setSaving(false);
    if (!result.ok) {
      notify({
        tone: "error",
        title: "Couldn't save the brand kit",
        description: result.error,
      });
      return;
    }
    notify({
      tone: "success",
      title: "Brand kit saved",
      description: voiceChanges.length
        ? "New videos will start with this theme. Record each video's voice again to use the new voice."
        : "New videos will start with this theme.",
    });
    setEditing(false);
    router.refresh();
  };

  if (!editing) {
    const who = kit ? [kit.name, kit.handle, kit.website].filter(Boolean) : [];
    return (
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-raised text-accent-bright">
            <Palette className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-medium">Brand kit</h2>
            <p className="flex items-center gap-2 truncate text-sm text-muted">
              {kit ? (
                <>
                  <ThemeDots kit={kit} />
                  {THEME_PRESETS[resolveTheme(kit.theme).preset].label}
                  {kit.theme &&
                  (kit.theme.accent ||
                    kit.theme.background ||
                    kit.theme.text ||
                    kit.theme.font)
                    ? " (customized)"
                    : ""}
                  {who.length ? ` · ${who.join(" · ")}` : ""}
                  {kit.voice
                    ? ` · Voice: ${kit.voice.name ?? kit.voice.voiceId}`
                    : ""}
                </>
              ) : (
                `Not set up yet: videos use the default look and ${defaultBrand.handle}.`
              )}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setDraft(kit ?? {});
            setEditing(true);
          }}
          icon={<Pencil className="size-4" aria-hidden />}
        >
          {kit ? "Edit brand kit" : "Set up brand kit"}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="animate-rise-in flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Brand kit</h2>
          <p className="text-sm text-muted">
            Your name and links appear on every video&apos;s closing screen. New
            videos start with this theme.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={() => void save()}
            icon={<Check className="size-4" aria-hidden />}
          >
            Save brand kit
          </Button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Field label="Name" htmlFor="brand-name">
            <Input
              id="brand-name"
              value={draft.name ?? ""}
              placeholder="Ms. Rivera's Science Class"
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Handle" htmlFor="brand-handle">
              <Input
                id="brand-handle"
                value={draft.handle ?? ""}
                placeholder="@yourname"
                onChange={(e) => set("handle", e.target.value)}
              />
            </Field>
            <Field label="Website" htmlFor="brand-website">
              <Input
                id="brand-website"
                value={draft.website ?? ""}
                placeholder="yoursite.com"
                onChange={(e) => set("website", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Theme">
            <ThemePicker
              value={draft.theme}
              onChange={(theme) =>
                setDraft((current) => ({ ...current, theme }))
              }
            />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-muted">Preview</span>
          <BrandPreview
            title={plan.plan.title}
            theme={draft.theme}
            brand={previewBrand}
          />
          <p className="text-xs text-faint">
            Existing videos keep their own theme; change it from each
            video&apos;s Theme setting.
          </p>
          {/* Without ElevenLabs there's no voice to pick: you narrate each scene yourself. */}
          {canListVoices ? (
            <Field
              label="Voice"
              hint="Play a sample to hear each voice. The sliders change the recording, not the sample."
            >
              <VoicePicker
                value={draft.voice}
                onChange={(voice) =>
                  setDraft((current) => {
                    const next = { ...current, voice };
                    if (!voice) delete next.voice;
                    return next;
                  })
                }
                fallback={{
                  title: "Default voice",
                  detail: "ELEVENLABS_VOICE_ID from .env, or George",
                }}
                canList={canListVoices}
              />
            </Field>
          ) : null}
          {voiceChanges.length ? (
            <Alert tone="info">
              <p>With this voice, recording again will redo:</p>
              <ul className="mt-1 list-disc pl-5">
                {voiceChanges.map((change) => (
                  <li key={change.index}>
                    Video {change.index + 1}, {change.title}:{" "}
                    {describeScenes(change.scenes).toLowerCase()}
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}
        </div>
      </div>
    </Card>
  );
};
