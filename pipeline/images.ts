import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ImageLayout, SceneOf, VideoSpecInput } from "../src/spec/schema";
import { config } from "./config";
import { exists, publicPath } from "./store";

/** One result from a stock photo search. */
export type StockImage = {
  id: string;
  provider: "pexels" | "openverse";
  /** A small preview, for the picker. */
  thumbnail: string;
  /** The full image to download. */
  url: string;
  width: number;
  height: number;
  alt: string;
  /** Who made it and under what license, shown on the image. */
  credit: string;
};

/** Images we store, by content type. Remotion's <Img> loads all of these. */
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const USER_AGENT =
  "BondethContentStudio/0.1 (+https://github.com/RithyBondeth/Bondeth-Content-Studio)";

/** "Tall" pictures suit full-frame scenes on vertical videos; framed ones sit on a wider card. */
const orientationFor = (layout: ImageLayout | undefined) =>
  layout === "framed" ? "landscape" : "portrait";

const LICENSE_NAMES: Record<string, string> = {
  cc0: "CC0",
  pdm: "Public domain",
};

/** "Photo: Title by Creator (CC BY 2.0)", or as much of it as is known. */
export const openverseCredit = (image: {
  title?: string | null;
  creator?: string | null;
  license: string;
  license_version?: string | null;
}) => {
  const license =
    LICENSE_NAMES[image.license] ??
    `CC ${image.license.toUpperCase()}${image.license_version ? ` ${image.license_version}` : ""}`;
  const title = image.title?.trim();
  const creator = image.creator?.trim();
  const work = [title ? `"${title}"` : "Photo", creator ? `by ${creator}` : ""]
    .filter(Boolean)
    .join(" ");
  return `${work} (${license})`;
};

type OpenverseResult = {
  id: string;
  title: string | null;
  url: string;
  thumbnail: string;
  creator: string | null;
  license: string;
  license_version: string | null;
  width: number | null;
  height: number | null;
};

/** Openly licensed images from Openverse. Needs no key; results allow commercial use and changes. */
const searchOpenverse = async (
  query: string,
  orientation: "portrait" | "landscape",
): Promise<StockImage[]> => {
  const params = new URLSearchParams({
    q: query,
    page_size: "20",
    // Commercial use and adaptation: the videos crop, move and caption every image.
    license_type: "commercial,modification",
    extension: "jpg,png",
    aspect_ratio: orientation === "portrait" ? "tall" : "wide",
  });
  const response = await fetch(
    `https://api.openverse.org/v1/images/?${params}`,
    { headers: { "User-Agent": USER_AGENT } },
  );
  if (!response.ok) {
    throw new Error(
      `Openverse returned ${response.status} ${response.statusText}.`,
    );
  }
  const data = (await response.json()) as { results: OpenverseResult[] };
  return data.results.map((result) => ({
    id: result.id,
    provider: "openverse",
    thumbnail: result.thumbnail,
    url: result.url,
    width: result.width ?? 0,
    height: result.height ?? 0,
    alt: result.title ?? query,
    credit: openverseCredit(result),
  }));
};

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  photographer: string;
  alt: string;
  src: { large2x: string; medium: string };
};

/** Stock photos from Pexels, when PEXELS_API_KEY is set. */
const searchPexels = async (
  query: string,
  orientation: "portrait" | "landscape",
  apiKey: string,
): Promise<StockImage[]> => {
  const params = new URLSearchParams({
    query,
    per_page: "20",
    orientation,
  });
  const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: apiKey },
  });
  if (!response.ok) {
    throw new Error(
      `Pexels returned ${response.status} ${response.statusText}.`,
    );
  }
  const data = (await response.json()) as { photos: PexelsPhoto[] };
  return data.photos.map((photo) => ({
    id: String(photo.id),
    provider: "pexels",
    thumbnail: photo.src.medium,
    url: photo.src.large2x,
    width: photo.width,
    height: photo.height,
    alt: photo.alt || query,
    credit: `Photo by ${photo.photographer} on Pexels`,
  }));
};

/** Searches stock photos: Pexels when there's a key, Openverse otherwise. */
export const searchStockImages = async (
  query: string,
  layout?: ImageLayout,
): Promise<StockImage[]> => {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Type what the image should show.");
  }
  const orientation = orientationFor(layout);
  const pexelsKey = process.env.PEXELS_API_KEY;
  return pexelsKey
    ? searchPexels(trimmed, orientation, pexelsKey)
    : searchOpenverse(trimmed, orientation);
};

/**
 * Stores an image in a video's media folder (relative to public/) and
 * returns its src. Named by content, so the same image is stored once.
 */
export const saveImage = async (
  mediaDir: string,
  bytes: Buffer,
  contentType: string,
): Promise<string> => {
  const extension =
    IMAGE_TYPES[contentType.split(";")[0]!.trim().toLowerCase()];
  if (!extension) {
    throw new Error("Use a JPEG, PNG or WebP image.");
  }
  if (bytes.length === 0) {
    throw new Error("That image is empty.");
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error(`Images can be up to ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
  }
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const src = path.posix.join(mediaDir, `image-${hash}.${extension}`);
  const file = publicPath(src);
  if (!(await exists(file))) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes);
  }
  return src;
};

/** Downloads a web image into the media folder and returns its src. */
export const downloadImage = async (
  url: string,
  mediaDir: string,
): Promise<string> => {
  if (!/^https:\/\//i.test(url)) {
    throw new Error("Images can only be downloaded over HTTPS.");
  }
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(
      `Couldn't download the image (${response.status} ${response.statusText}).`,
    );
  }
  const length = Number(response.headers.get("content-length"));
  if (length > MAX_IMAGE_BYTES) {
    throw new Error(`Images can be up to ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
  }
  return saveImage(
    mediaDir,
    Buffer.from(await response.arrayBuffer()),
    response.headers.get("content-type") ?? "",
  );
};

/** Keeps generated pictures in the videos' style, and free of garbled text. */
const ILLUSTRATION_STYLE =
  "Style: a clean, modern flat illustration with soft lighting and rich colors on a dark navy background. No text, letters, numbers, logos or watermarks.";

export const canGenerateImages = () => Boolean(process.env.OPENAI_API_KEY);

/** Generates an illustration with OpenAI's image model and stores it. */
export const generateImage = async (
  prompt: string,
  mediaDir: string,
  layout?: ImageLayout,
): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env to generate images, or pick a stock photo.",
    );
  }
  if (!prompt.trim()) {
    throw new Error("Describe the image to generate.");
  }
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.imageModel,
      prompt: `${prompt.trim()}\n\n${ILLUSTRATION_STYLE}`,
      n: 1,
      size: orientationFor(layout) === "portrait" ? "1024x1536" : "1536x1024",
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenAI returned ${response.status} ${response.statusText}: ${detail.slice(0, 300)}`,
    );
  }
  const data = (await response.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const image = data.data?.[0];
  if (image?.b64_json) {
    return saveImage(
      mediaDir,
      Buffer.from(image.b64_json, "base64"),
      "image/png",
    );
  }
  if (image?.url) {
    return downloadImage(image.url, mediaDir);
  }
  throw new Error("OpenAI returned no image.");
};

export type ImagesResult = {
  spec: VideoSpecInput;
  found: number;
  /** One message per image scene that still has no image. */
  failures: string[];
};

/** Finds a picture for one image scene: an AI illustration when it has a prompt and a key, a stock photo otherwise. */
const findImage = async (
  scene: SceneOf<"image">,
  mediaDir: string,
): Promise<Pick<SceneOf<"image">, "src" | "credit">> => {
  if (scene.prompt && canGenerateImages()) {
    return {
      src: await generateImage(scene.prompt, mediaDir, scene.layout),
      credit: undefined,
    };
  }
  const [first] = await searchStockImages(
    scene.search ?? scene.alt,
    scene.layout,
  );
  if (!first) {
    throw new Error(`no stock photos match "${scene.search ?? scene.alt}"`);
  }
  return {
    src: await downloadImage(first.url, mediaDir),
    credit: first.credit,
  };
};

/**
 * Gives every image scene without a picture one. Scenes that already have
 * an image keep it. A scene whose image can't be found keeps its
 * placeholder, and the reason is reported instead of failing the video.
 * `mediaDir` is relative to public/.
 */
export const addImages = async (
  spec: VideoSpecInput,
  mediaDir: string,
  onProgress?: (message: string) => void,
): Promise<ImagesResult> => {
  let found = 0;
  const failures: string[] = [];
  const scenes = [];
  for (const [index, scene] of spec.scenes.entries()) {
    if (scene.type !== "image" || scene.src) {
      scenes.push(scene);
      continue;
    }
    onProgress?.(
      `Scene ${index + 1}/${spec.scenes.length}: finding an image of ${scene.alt}`,
    );
    try {
      scenes.push({ ...scene, ...(await findImage(scene, mediaDir)) });
      found++;
    } catch (error) {
      failures.push(
        `Scene ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
      scenes.push(scene);
    }
  }
  return { spec: { ...spec, scenes }, found, failures };
};
