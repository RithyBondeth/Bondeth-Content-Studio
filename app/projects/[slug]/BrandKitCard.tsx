"use client";

import { Check, Palette, Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { PlanFile } from "../../../pipeline/store";
import { brand as defaultBrand } from "../../../src/brand";
import type { BrandKit } from "../../../src/spec/schema";
import { THEME_PRESETS } from "../../../src/theme/presets";
import { resolveTheme } from "../../../src/theme/resolve";
import { updateBrandKitAction } from "../../actions";
import { ThemePicker } from "../../_components/ThemePicker";
import { useToast } from "../../_components/Toast";
import { Button, Card, Field, Input, Skeleton } from "../../_components/ui";

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
export const BrandKitCard = ({ plan }: { plan: PlanFile }) => {
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
      description: "New videos will start with this theme.",
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
        </div>
      </div>
    </Card>
  );
};
