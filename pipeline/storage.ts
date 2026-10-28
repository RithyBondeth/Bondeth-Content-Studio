import fs from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { OUT_ROOT, PUBLIC_DIR } from "./config";

/**
 * Durable storage for media and renders. The server's disk is always the
 * working copy (rendering and audio tools need real files); when a bucket is
 * set up (Cloudflare R2, or any S3-compatible service), every new file is
 * also stored there, files this server doesn't have are fetched from it, and
 * downloads come straight from the bucket.
 *
 * Without a bucket every function here is a no-op over the local disk.
 */

type Env = Record<string, string | undefined>;

export type BucketConfig = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export const bucketConfig = (env: Env = process.env): BucketConfig | null => {
  const {
    S3_ENDPOINT: endpoint,
    S3_BUCKET: bucket,
    S3_ACCESS_KEY_ID: accessKeyId,
    S3_SECRET_ACCESS_KEY: secretAccessKey,
  } = env;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    endpoint: endpoint.replace(/\/+$/, ""),
    bucket,
    region: env.S3_REGION || "auto",
    accessKeyId,
    secretAccessKey,
  };
};

const MEDIA_ROOT = path.join(PUBLIC_DIR, "content");

/**
 * The bucket key for a local file: `media/...` for voice-overs, images, and
 * music, `out/...` for renders. Null for anything else, which stays local.
 */
export const keyFor = (file: string): string | null => {
  const absolute = path.resolve(file);
  for (const [prefix, dir] of [
    ["media", MEDIA_ROOT],
    ["out", OUT_ROOT],
  ] as const) {
    const relative = path.relative(dir, absolute);
    if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
      return `${prefix}/${relative.split(path.sep).join("/")}`;
    }
  }
  return null;
};

const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".srt": "application/x-subrip",
  ".vtt": "text/vtt",
  ".zip": "application/zip",
  ".json": "application/json",
};

const contentType = (key: string) =>
  CONTENT_TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";

const objectUrl = (config: BucketConfig, key: string) =>
  `${config.endpoint}/${encodeURIComponent(config.bucket)}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

const clients = new Map<string, AwsClient>();
const client = (config: BucketConfig) => {
  const id = `${config.accessKeyId}@${config.region}`;
  let found = clients.get(id);
  if (!found) {
    found = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: "s3",
      region: config.region,
    });
    clients.set(id, found);
  }
  return found;
};

const localExists = (file: string) =>
  fs.stat(file).then(
    (stat) => stat.isFile(),
    () => false,
  );

const bucketFor = (file: string) => {
  const config = bucketConfig();
  const key = config ? keyFor(file) : null;
  return config && key ? { config, key } : null;
};

const request = async (
  config: BucketConfig,
  key: string,
  init: RequestInit,
): Promise<Response> => {
  const response = await client(config).fetch(objectUrl(config, key), init);
  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Storage ${init.method ?? "GET"} ${key} failed (${response.status}). ${detail.slice(0, 200)}`,
    );
  }
  return response;
};

/** Call after writing a media file or render: stores it in the bucket too. */
export const saved = async (file: string) => {
  const target = bucketFor(file);
  if (!target) return;
  await request(target.config, target.key, {
    method: "PUT",
    body: await fs.readFile(file),
    headers: { "Content-Type": contentType(target.key) },
  });
};

/** When it was last changed, and whether it exists at all, here or in the bucket. */
export const statAnywhere = async (
  file: string,
): Promise<{ mtime: Date } | null> => {
  const local = await fs.stat(file).catch(() => null);
  if (local?.isFile()) return { mtime: local.mtime };
  const target = bucketFor(file);
  if (!target) return null;
  const response = await request(target.config, target.key, {
    method: "HEAD",
  });
  if (response.status === 404) return null;
  const modified = response.headers.get("last-modified");
  return { mtime: modified ? new Date(modified) : new Date() };
};

export const existsAnywhere = async (file: string) =>
  (await statAnywhere(file)) !== null;

/**
 * Makes sure the file is on this server's disk, fetching it from the bucket
 * if it's only there. False when it doesn't exist anywhere.
 */
export const ensureLocal = async (file: string): Promise<boolean> => {
  if (await localExists(file)) return true;
  const target = bucketFor(file);
  if (!target) return false;
  const response = await request(target.config, target.key, {
    method: "GET",
  });
  if (response.status === 404) return false;
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.download`;
  await fs.writeFile(temporary, Buffer.from(await response.arrayBuffer()));
  await fs.rename(temporary, file);
  return true;
};

/**
 * A short-lived link to the file in the bucket, for the browser to load
 * directly. Null without a bucket or when the bucket doesn't have it.
 */
export const downloadUrl = async (
  file: string,
  options: { download?: boolean; expiresIn?: number } = {},
): Promise<string | null> => {
  const target = bucketFor(file);
  if (!target) return null;
  const head = await request(target.config, target.key, { method: "HEAD" });
  if (head.status === 404) return null;
  return presign(target.config, target.key, options);
};

export const presign = async (
  config: BucketConfig,
  key: string,
  { download = false, expiresIn = 15 * 60 } = {},
) => {
  const url = new URL(objectUrl(config, key));
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  if (download) {
    url.searchParams.set(
      "response-content-disposition",
      `attachment; filename="${path.posix.basename(key)}"`,
    );
  }
  const signed = await client(config).sign(url.toString(), {
    method: "GET",
    aws: { signQuery: true },
  });
  return signed.url;
};

/** Every key under a prefix, following the listing's pages. */
const listKeys = async (config: BucketConfig, prefix: string) => {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const url = new URL(
      `${config.endpoint}/${encodeURIComponent(config.bucket)}`,
    );
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", prefix);
    if (token) url.searchParams.set("continuation-token", token);
    const response = await client(config).fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Storage list ${prefix} failed (${response.status}).`);
    }
    const xml = await response.text();
    for (const match of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) {
      keys.push(decodeXml(match[1]!));
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? decodeXml(
          /<NextContinuationToken>([^<]*)<\/NextContinuationToken>/.exec(
            xml,
          )?.[1] ?? "",
        ) || undefined
      : undefined;
  } while (token);
  return keys;
};

const decodeXml = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** Deletes a folder here and its copies in the bucket. */
export const removeDir = async (dir: string) => {
  await fs.rm(dir, { recursive: true, force: true });
  const target = bucketFor(path.join(dir, "x"));
  if (!target) return;
  const prefix = target.key.slice(0, -1);
  for (const key of await listKeys(target.config, prefix)) {
    await request(target.config, key, { method: "DELETE" });
  }
};

/**
 * Every media file a video spec points at: the `src` of voice-overs, images,
 * and music, wherever they sit. Links to other sites (with a scheme) are left
 * out; they're fetched as they are.
 */
export const mediaSources = (spec: unknown): string[] => {
  const found = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (key === "src" && typeof child === "string") {
          if (child && !/^[a-z]+:/i.test(child)) found.add(child);
        } else walk(child);
      }
    }
  };
  walk(spec);
  return [...found];
};
