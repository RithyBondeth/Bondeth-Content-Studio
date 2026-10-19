"use client";

import {
  Check,
  CircleAlert,
  Copy,
  Download,
  ImageIcon,
  Package,
  Loader2,
  Megaphone,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BUNDLE_PIECE_LABELS, type BundlePiece } from "../../../src/lib/bundle";
import { FORMAT_NAMES, type VideoFormat } from "../../../src/lib/formats";
import {
  charCount,
  checkPost,
  clampCoverScene,
  composePost,
  parseHashtagInput,
  PLATFORM_RULES,
  PLATFORMS,
  type Platform,
  type PlatformPost,
  type PublishKit,
} from "../../../src/lib/publish";
import type { Scene } from "../../../src/spec/schema";
import type { RenderFile } from "../../../studio/server/projects";
import type { RenderJob } from "../../../studio/server/render-jobs";
import {
  bundleStatusAction,
  generatePublishKitAction,
  getRenderJobAction,
  listCoversAction,
  savePublishKitAction,
  startCoverAction,
} from "../../actions";
import { useConfirm } from "../ConfirmDialog";
import { useToast } from "../Toast";
import {
  Alert,
  Button,
  Field,
  Input,
  ProgressBar,
  Select,
  Textarea,
  cx,
} from "../ui";
import { SCENE_META } from "./scene-meta";

const SAVE_DELAY = 700;

const isActive = (job: RenderJob | undefined): job is RenderJob =>
  !!job && !["done", "error"].includes(job.status);

/** "120 / 2,200", red when over. */
const Counter = ({ count, limit }: { count: number; limit: number }) => (
  <span
    className={cx(
      "font-mono text-[11px] whitespace-nowrap",
      count > limit ? "text-danger" : "text-faint",
    )}
  >
    {count.toLocaleString()} / {limit.toLocaleString()}
  </span>
);

/** Copies text and shows a tick for a moment. */
const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const notify = useToast();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Button
      size="xs"
      variant="ghost"
      disabled={!text.trim()}
      icon={
        copied ? (
          <Check className="size-3.5 text-success" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )
      }
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => setCopied(true),
          () => notify({ tone: "error", title: "Couldn't copy to clipboard" }),
        )
      }
    >
      {copied ? "Copied" : label}
    </Button>
  );
};

const sceneLabel = (scene: Scene, index: number) => {
  const words = scene.narration.trim().split(/\s+/).slice(0, 6).join(" ");
  return `${index + 1}. ${SCENE_META[scene.type].label}${words ? ` · ${words}…` : ""}`;
};

const PostFields = ({
  platform,
  post,
  onChange,
}: {
  platform: Platform;
  post: PlatformPost;
  onChange: (post: PlatformPost) => void;
}) => {
  const rules = PLATFORM_RULES[platform];
  // Hashtags are typed as free text and tidied up when the box loses focus.
  const [tagText, setTagText] = useState(post.hashtags.join(" "));
  const full = composePost(post);
  const problems = checkPost(platform, post);
  const id = `publish-${platform}`;

  return (
    <div className="flex flex-col gap-3">
      {rules.titleLimit !== null ? (
        <Field
          label="Title"
          htmlFor={`${id}-title`}
          aside={
            <span className="flex items-center gap-1">
              <Counter
                count={charCount(post.title ?? "")}
                limit={rules.titleLimit}
              />
              <CopyButton text={post.title ?? ""} label="Copy" />
            </span>
          }
        >
          <Input
            id={`${id}-title`}
            value={post.title ?? ""}
            onChange={(event) =>
              onChange({ ...post, title: event.target.value })
            }
          />
        </Field>
      ) : null}
      <Field label={rules.textLabel} htmlFor={`${id}-text`}>
        <Textarea
          id={`${id}-text`}
          rows={5}
          value={post.text}
          onChange={(event) => onChange({ ...post, text: event.target.value })}
        />
      </Field>
      <Field label="Call to action" htmlFor={`${id}-cta`}>
        <Input
          id={`${id}-cta`}
          value={post.callToAction}
          onChange={(event) =>
            onChange({ ...post, callToAction: event.target.value })
          }
        />
      </Field>
      <Field
        label="Hashtags"
        htmlFor={`${id}-tags`}
        hint={`Aim for ${rules.hashtags.min}-${rules.hashtags.max}. Separate them with spaces.`}
        aside={
          <span
            className={cx(
              "font-mono text-[11px]",
              post.hashtags.length > rules.hashtags.max
                ? "text-danger"
                : "text-faint",
            )}
          >
            {post.hashtags.length} / {rules.hashtags.max}
          </span>
        }
      >
        <Input
          id={`${id}-tags`}
          value={tagText}
          onChange={(event) => {
            setTagText(event.target.value);
            onChange({
              ...post,
              hashtags: parseHashtagInput(event.target.value),
            });
          }}
          onBlur={() => setTagText(post.hashtags.join(" "))}
        />
      </Field>
      <div className="flex items-center justify-between gap-2 rounded-xl bg-bg/60 px-3 py-2">
        <span className="flex flex-col">
          <span className="text-[13px]">
            Full {rules.textLabel.toLowerCase()}
          </span>
          <span className="text-[11px] text-faint">
            Text, call to action and hashtags
          </span>
        </span>
        <span className="flex items-center gap-1">
          <Counter count={charCount(full)} limit={rules.textLimit} />
          <CopyButton text={full} label="Copy post" />
        </span>
      </div>
      {problems.length ? (
        <Alert tone="warning" icon={<CircleAlert className="size-4" />}>
          {problems.map((problem) => (
            <p key={problem}>{problem}</p>
          ))}
        </Alert>
      ) : null}
    </div>
  );
};

export const PublishPanel = ({
  slug,
  index,
  scenes,
  initialKit,
  initialCovers,
  canGenerate,
  beforeGenerate,
}: {
  slug: string;
  index: number;
  scenes: Scene[];
  /** A kit with no posts when publish.json doesn't exist yet. */
  initialKit: PublishKit;
  initialCovers: RenderFile[];
  /** Whether a Claude API key is set. */
  canGenerate: boolean;
  /** Called before generating or exporting, e.g. to save pending edits. */
  beforeGenerate: () => Promise<boolean>;
}) => {
  const notify = useToast();
  const { confirm, dialog } = useConfirm();
  const [kit, setKit] = useState(initialKit);
  const [tab, setTab] = useState<Platform>("tiktok");
  const [generating, setGenerating] = useState(false);
  const [covers, setCovers] = useState(initialCovers);
  const [jobs, setJobs] = useState<Partial<Record<VideoFormat, RenderJob>>>({});
  const active = Object.values(jobs).filter(isActive);
  const [bundleMissing, setBundleMissing] = useState<Partial<
    Record<Platform, BundlePiece[]>
  > | null>(null);
  const [downloading, setDownloading] = useState(false);
  const coverScene = clampCoverScene(kit.coverScene, scenes.length);

  // --- Saving: edits are saved a moment after you stop typing. ---
  const skipNextSave = useRef(true);
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void savePublishKitAction(slug, index, kit).then((result) => {
        if (!result.ok)
          notify({
            tone: "error",
            title: "Couldn't save the publish kit",
            description: result.error,
          });
      });
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [kit, slug, index, notify]);

  const updatePost = useCallback(
    (platform: Platform, post: PlatformPost) =>
      setKit((current) =>
        current.posts
          ? { ...current, posts: { ...current.posts, [platform]: post } }
          : current,
      ),
    [],
  );

  const generate = async () => {
    if (
      kit.posts &&
      !(await confirm({
        title: "Write new posts?",
        description:
          "Claude rewrites the titles, text and hashtags for every platform. Your edits here will be replaced.",
        confirmLabel: "Regenerate",
      }))
    )
      return;
    if (!(await beforeGenerate())) return;
    setGenerating(true);
    const result = await generatePublishKitAction(slug, index, coverScene);
    setGenerating(false);
    if (!result.ok) {
      notify({
        tone: "error",
        title: "Couldn't write the posts",
        description: result.error,
      });
      return;
    }
    // The server already saved it.
    skipNextSave.current = true;
    setKit(result.data);
    notify({ tone: "success", title: "Posts ready for every platform" });
  };

  // --- Posting bundles: checked again when the tab, posts, or covers change, since renders finish elsewhere. ---
  const hasPosts = !!kit.posts;
  useEffect(() => {
    let cancelled = false;
    void bundleStatusAction(slug, index).then((result) => {
      if (!cancelled && result.ok) setBundleMissing(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, index, tab, hasPosts, covers]);

  const downloadBundle = async () => {
    setDownloading(true);
    try {
      // Save pending edits first, so the zip has the latest script and posts.
      if (!(await beforeGenerate())) return;
      const saved = await savePublishKitAction(slug, index, kit);
      if (!saved.ok) {
        notify({
          tone: "error",
          title: "Couldn't save the publish kit",
          description: saved.error,
        });
        return;
      }
      const link = document.createElement("a");
      link.href = `/api/bundle/${encodeURIComponent(slug)}/${index + 1}/${tab}`;
      link.download = "";
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  // --- Covers: exported on this computer, like renders. ---
  useEffect(() => {
    if (!active.length) return;
    const timer = setInterval(async () => {
      for (const job of active) {
        const result = await getRenderJobAction(job.id);
        if (!result.ok || !result.data) continue;
        const updated = result.data;
        setJobs((current) => ({ ...current, [updated.format]: updated }));
        if (updated.status === "done") {
          const list = await listCoversAction(slug, index);
          if (list.ok) setCovers(list.data);
        }
        if (updated.status === "error") {
          notify({
            tone: "error",
            title: "Couldn't export the cover",
            description: updated.error,
          });
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [active, slug, index, notify]);

  const exportCovers = async () => {
    if (!(await beforeGenerate())) return;
    for (const format of FORMAT_NAMES) {
      const result = await startCoverAction(slug, index, format, coverScene);
      if (result.ok)
        setJobs((current) => ({ ...current, [format]: result.data }));
      else {
        notify({
          tone: "error",
          title: "Couldn't export the cover",
          description: result.error,
        });
        return;
      }
    }
  };

  const rules = PLATFORM_RULES[tab];
  const cover = covers.find((file) => file.format === rules.format);
  const coverJob = jobs[rules.format];
  const post = kit.posts?.[tab];
  const missing = bundleMissing?.[tab] ?? [];

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/70 p-4"
      aria-labelledby="publish-heading"
    >
      {dialog}
      <div className="flex items-center justify-between gap-2">
        <h3 id="publish-heading" className="text-sm font-medium">
          Publish
        </h3>
        {kit.posts ? (
          <Button
            size="xs"
            variant="ghost"
            loading={generating}
            disabled={!canGenerate}
            title={canGenerate ? undefined : "Add ANTHROPIC_API_KEY to .env"}
            icon={<RefreshCw className="size-3.5" aria-hidden />}
            onClick={() => void generate()}
          >
            {generating ? "Writing…" : "Regenerate"}
          </Button>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Platforms"
        className="grid grid-cols-4 gap-1 rounded-xl bg-bg/60 p-1"
      >
        {PLATFORMS.map((platform) => {
          const hasProblems =
            !!kit.posts && checkPost(platform, kit.posts[platform]).length > 0;
          return (
            <button
              key={platform}
              type="button"
              role="tab"
              id={`publish-tab-${platform}`}
              aria-selected={tab === platform}
              aria-controls="publish-tabpanel"
              onClick={() => setTab(platform)}
              className={cx(
                "relative rounded-lg px-1.5 py-1.5 text-[12px] leading-tight transition-colors",
                tab === platform
                  ? "bg-raised font-medium text-text"
                  : "text-muted hover:text-text",
              )}
            >
              {PLATFORM_RULES[platform].label}
              {hasProblems ? (
                <span
                  className="absolute top-1 right-1 size-1.5 rounded-full bg-warning"
                  aria-label="needs attention"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="publish-tabpanel"
        aria-labelledby={`publish-tab-${tab}`}
        className="flex flex-col gap-4"
      >
        {post ? (
          <PostFields
            key={tab}
            platform={tab}
            post={post}
            onChange={(next) => updatePost(tab, next)}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-4 py-5 text-center">
            <Megaphone className="size-5 text-accent-bright" aria-hidden />
            <p className="text-[13px] leading-relaxed text-muted">
              Write the titles, captions, calls to action and hashtags for
              TikTok, Shorts, Reels and YouTube in one go.
            </p>
            <Button
              size="sm"
              variant="primary"
              loading={generating}
              disabled={!canGenerate}
              icon={<Sparkles className="size-4" aria-hidden />}
              onClick={() => void generate()}
            >
              {generating ? "Writing posts…" : "Write posts"}
            </Button>
            {canGenerate ? null : (
              <p className="text-[11px] text-faint">
                Add ANTHROPIC_API_KEY to .env to write posts with Claude.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <Field
            label="Cover image"
            htmlFor="publish-cover-scene"
            hint={`Upload it as the ${rules.label} cover. ${rules.format === "vertical" ? "9:16" : "16:9"} PNG.`}
          >
            <Select
              id="publish-cover-scene"
              value={coverScene}
              onChange={(event) =>
                setKit((current) => ({
                  ...current,
                  coverScene: Number(event.target.value),
                }))
              }
            >
              {scenes.map((scene, sceneIndex) => (
                <option key={sceneIndex} value={sceneIndex}>
                  {sceneLabel(scene, sceneIndex)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-start gap-3">
            <div
              className={cx(
                "grid shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-bg/60",
                rules.format === "vertical" ? "h-32 w-[72px]" : "h-[72px] w-32",
              )}
            >
              {cover ? (
                <img
                  src={cover.url}
                  alt={`${rules.format} cover`}
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon className="size-5 text-faint" aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Button
                size="sm"
                disabled={active.length > 0}
                icon={
                  active.length ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <ImageIcon className="size-4" aria-hidden />
                  )
                }
                onClick={() => void exportCovers()}
              >
                {active.length
                  ? coverJob?.status === "bundling"
                    ? "Preparing…"
                    : "Exporting…"
                  : cover
                    ? "Export again"
                    : "Export covers"}
              </Button>
              {isActive(coverJob) ? (
                <ProgressBar
                  value={coverJob.status === "rendering" ? 0.7 : 0.15}
                />
              ) : null}
              {cover ? (
                <a
                  href={`${cover.url}&download`}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-text"
                >
                  <Download className="size-3.5" aria-hidden />
                  Download {rules.format} cover
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px]">Download for posting</span>
            <span className="text-[11px] leading-relaxed text-faint">
              One zip for {rules.label}: the {rules.format} video, cover, post
              text and captions (SRT and WebVTT).
            </span>
          </span>
          {missing.length ? (
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-warning">
              <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
              <span>
                Not ready yet:{" "}
                {missing
                  .map((piece) => BUNDLE_PIECE_LABELS[piece].toLowerCase())
                  .join(", ")}
                . The zip leaves {missing.length === 1 ? "it" : "them"} out and
                says how to make {missing.length === 1 ? "it" : "them"} in
                README.txt.
              </span>
            </p>
          ) : null}
          <Button
            size="sm"
            loading={downloading}
            icon={<Package className="size-4" aria-hidden />}
            onClick={() => void downloadBundle()}
          >
            Download {rules.label} bundle
          </Button>
        </div>
      </div>
    </section>
  );
};
