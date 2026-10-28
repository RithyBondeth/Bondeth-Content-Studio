"use client";

import { ImageIcon, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import type {
  ImageLayout,
  ImageMotion,
  SceneOf,
} from "../../../src/spec/schema";
import type { StockImage } from "../../../pipeline/images";
import {
  generateImageAction,
  pickStockImageAction,
  searchImagesAction,
} from "../../actions";
import { AiTag, SETUP, SetupLink, useCanSetUp } from "../AiChoice";
import { useToast } from "../Toast";
import { Button, cx, Field, Input, Select, Textarea } from "../ui";

type ImageScene = SceneOf<"image">;

/** Which video the image belongs to, so it's stored next to its voice-overs. */
export type ImageContext = {
  slug: string;
  videoIndex: number;
  /** Whether OPENAI_API_KEY is set. */
  canGenerate: boolean;
  /** Whether PEXELS_API_KEY is set; Openverse is searched otherwise. */
  hasPexels: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp";

const LAYOUTS: { value: ImageLayout; label: string }[] = [
  { value: "full", label: "Fill the screen" },
  { value: "framed", label: "On a card" },
];

const MOTIONS: { value: ImageMotion; label: string }[] = [
  { value: "zoom-in", label: "Slow zoom in" },
  { value: "zoom-out", label: "Slow zoom out" },
  { value: "pan-left", label: "Pan left" },
  { value: "pan-right", label: "Pan right" },
  { value: "none", label: "Still" },
];

type Source = "stock" | "generate" | "upload";

const SOURCES: { value: Source; label: string; icon: typeof Search }[] = [
  { value: "stock", label: "Stock photo", icon: Search },
  { value: "upload", label: "Upload", icon: Upload },
  { value: "generate", label: "AI image", icon: Sparkles },
];

/** Where the browser can load a spec image from: public/ is served at the site root. */
const previewUrl = (src: string) =>
  /^[a-z]+:/i.test(src) ? src : `/${src.replace(/^\/+/, "")}`;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Searches stock photos and uses the one that's clicked. */
const StockPicker = ({
  scene,
  context,
  onChange,
}: {
  scene: ImageScene;
  context: ImageContext;
  onChange: (scene: ImageScene) => void;
}) => {
  const notify = useToast();
  const [query, setQuery] = useState(scene.search ?? scene.alt);
  const [results, setResults] = useState<StockImage[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);

  const search = async () => {
    setSearching(true);
    const result = await searchImagesAction(query, scene.layout);
    setSearching(false);
    if (result.ok) {
      setResults(result.data);
    } else {
      notify({
        tone: "error",
        title: "Couldn't search for images",
        description: result.error,
      });
    }
  };

  const pick = async (image: StockImage) => {
    setPicking(image.id);
    const result = await pickStockImageAction(
      context.slug,
      context.videoIndex,
      image,
    );
    setPicking(null);
    if (result.ok) {
      onChange({
        ...scene,
        src: result.data.src,
        credit: result.data.credit,
        search: query,
      });
    } else {
      notify({
        tone: "error",
        title: "Couldn't use that image",
        description: result.error,
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <Input
          aria-label="Search stock photos"
          placeholder="e.g. rainforest canopy"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          loading={searching}
          disabled={!query.trim()}
          icon={<Search className="size-4" aria-hidden />}
        >
          Search
        </Button>
      </form>
      {results ? (
        results.length ? (
          <div className="grid grid-cols-3 gap-2">
            {results.map((image) => (
              <button
                key={image.id}
                type="button"
                title={image.credit}
                disabled={picking !== null}
                onClick={() => void pick(image)}
                className={cx(
                  "relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-raised transition-all hover:border-accent disabled:cursor-wait",
                  picking === image.id && "ring-2 ring-accent",
                  picking !== null && picking !== image.id && "opacity-50",
                )}
              >
                <img
                  src={image.thumbnail}
                  alt={image.alt}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-faint">
            No photos found. Try fewer or simpler words.
          </p>
        )
      ) : null}
      <p className="text-xs text-faint">
        {context.hasPexels
          ? "Photos from Pexels, free to use. The photographer is credited on the image."
          : "Openly licensed photos from Openverse that allow commercial use and changes. The creator and license are credited on the image."}
      </p>
    </div>
  );
};

/** Generates an AI illustration from a prompt. */
const Generator = ({
  scene,
  context,
  onChange,
}: {
  scene: ImageScene;
  context: ImageContext;
  onChange: (scene: ImageScene) => void;
}) => {
  const notify = useToast();
  const id = useId();
  const [prompt, setPrompt] = useState(scene.prompt ?? scene.alt);
  const canSetUp = useCanSetUp();
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    const result = await generateImageAction(
      context.slug,
      context.videoIndex,
      prompt,
      scene.layout,
    );
    setGenerating(false);
    if (result.ok) {
      onChange({
        ...scene,
        src: result.data,
        prompt,
        credit: "AI-generated illustration",
      });
    } else {
      notify({
        tone: "error",
        title: "Couldn't generate the image",
        description: result.error,
      });
    }
  };

  if (!context.canGenerate) {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-line p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <AiTag /> AI images aren&apos;t set up yet
        </p>
        <p className="text-[13px] leading-relaxed text-muted">
          {canSetUp ? (
            <>
              Add your OpenAI API key to draw pictures with AI.{" "}
              <SetupLink setup={SETUP.images} service="AI images" />. Until
              then, pick a free stock photo or upload your own.
            </>
          ) : (
            "This studio hasn't turned on AI images. Pick a free stock photo or upload your own."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Prompt"
        htmlFor={id}
        hint="Describe the picture. It's drawn as a flat illustration with no text. Takes about 20 seconds."
      >
        <Textarea
          id={id}
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </Field>
      <Button
        variant="secondary"
        className="self-start"
        loading={generating}
        disabled={!prompt.trim()}
        icon={<Sparkles className="size-4" aria-hidden />}
        onClick={() => void generate()}
      >
        {scene.src && scene.prompt ? "Generate again" : "Generate"}
      </Button>
    </div>
  );
};

/** Uploads an image from the computer. */
const Uploader = ({
  scene,
  context,
  onChange,
}: {
  scene: ImageScene;
  context: ImageContext;
  onChange: (scene: ImageScene) => void;
}) => {
  const notify = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.set("slug", context.slug);
    form.set("index", String(context.videoIndex));
    form.set("file", file);
    try {
      const response = await fetch("/api/image", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as {
        src?: string;
        error?: string;
      };
      if (!response.ok || !result.src) {
        throw new Error(result.error ?? `Upload failed (${response.status}).`);
      }
      onChange({ ...scene, src: result.src, credit: undefined });
    } catch (error) {
      notify({
        tone: "error",
        title: "Couldn't upload the image",
        description: errorMessage(error),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="secondary"
        className="self-start"
        loading={uploading}
        icon={<Upload className="size-4" aria-hidden />}
        onClick={() => fileInput.current?.click()}
      >
        Choose an image
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <p className="text-xs text-faint">
        JPEG, PNG or WebP, up to 20 MB. Only use images you have the rights to,
        and add a credit if the license asks for one.
      </p>
    </div>
  );
};

/** The image scene's picture, where it comes from, and how it's shown. */
export const ImageFields = ({
  scene,
  context,
  onChange,
}: {
  scene: ImageScene;
  context: ImageContext;
  onChange: (scene: ImageScene) => void;
}) => {
  const [source, setSource] = useState<Source>(
    scene.prompt && context.canGenerate ? "generate" : "stock",
  );
  const altId = useId();
  const captionId = useId();
  const creditId = useId();
  const layoutId = useId();
  const motionId = useId();
  const optional = (value: string) => (value.trim() ? value : undefined);

  return (
    <>
      <div className="flex gap-3">
        <div className="relative grid aspect-[3/4] w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-raised">
          {scene.src ? (
            <img
              src={previewUrl(scene.src)}
              alt={scene.alt}
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-6 text-faint" aria-hidden />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm">
            {scene.src ? "Image chosen" : "No image yet"}
          </p>
          <p className="text-xs leading-relaxed text-faint">
            {scene.src
              ? (scene.credit ?? "Your image.")
              : context.canGenerate
                ? "Pick a stock photo, upload your own, or have AI draw one. A placeholder shows until then."
                : "Pick a free stock photo or upload your own. A placeholder shows until then."}
          </p>
          {scene.src ? (
            <Button
              size="sm"
              variant="danger"
              className="self-start"
              icon={<Trash2 className="size-3.5" aria-hidden />}
              onClick={() =>
                onChange({ ...scene, src: undefined, credit: undefined })
              }
            >
              Remove image
            </Button>
          ) : null}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Image source"
        className="grid grid-cols-3 gap-1 rounded-xl border border-line p-1"
      >
        {SOURCES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={source === option.value}
            onClick={() => setSource(option.value)}
            className={cx(
              "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors",
              source === option.value
                ? "bg-raised text-text"
                : "text-faint hover:text-muted",
            )}
          >
            <option.icon
              className={cx(
                "size-3.5",
                option.value === "generate" && "text-accent-bright",
              )}
              aria-hidden
            />
            {option.label}
          </button>
        ))}
      </div>
      {source === "stock" ? (
        <StockPicker scene={scene} context={context} onChange={onChange} />
      ) : source === "generate" ? (
        <Generator scene={scene} context={context} onChange={onChange} />
      ) : (
        <Uploader scene={scene} context={context} onChange={onChange} />
      )}

      <Field
        label="Description"
        htmlFor={altId}
        hint="What the image shows. Used to find or generate one."
      >
        <Input
          id={altId}
          value={scene.alt}
          onChange={(event) => onChange({ ...scene, alt: event.target.value })}
        />
      </Field>
      <Field label="Caption" htmlFor={captionId}>
        <Input
          id={captionId}
          value={scene.caption ?? ""}
          placeholder="Optional. A few words shown with the image"
          onChange={(event) =>
            onChange({ ...scene, caption: optional(event.target.value) })
          }
        />
      </Field>
      <Field
        label="Credit"
        htmlFor={creditId}
        hint="Shown small on the image. Stock photos fill this in."
      >
        <Input
          id={creditId}
          value={scene.credit ?? ""}
          placeholder="Optional"
          onChange={(event) =>
            onChange({ ...scene, credit: optional(event.target.value) })
          }
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Layout" htmlFor={layoutId}>
          <Select
            id={layoutId}
            value={scene.layout ?? "full"}
            onChange={(event) =>
              onChange({
                ...scene,
                layout: event.target.value as ImageLayout,
              })
            }
          >
            {LAYOUTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Camera move" htmlFor={motionId}>
          <Select
            id={motionId}
            value={scene.motion ?? "zoom-in"}
            onChange={(event) =>
              onChange({
                ...scene,
                motion: event.target.value as ImageMotion,
              })
            }
          >
            {MOTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </>
  );
};
