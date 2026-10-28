import path from "node:path";
import { PUBLIC_DIR } from "../../../pipeline/config";
import { downloadUrl } from "../../../pipeline/storage";
import { serveFile } from "../../../studio/server/serve-file";
import { ownsPath } from "../../../studio/server/session";

const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
};

/**
 * Voice-overs, recordings, and images made while the studio runs. The dev
 * server serves them from public/ itself, but `next start` only serves what
 * was in public/ at build time, so in production they come through here.
 * With accounts, only from the person's own workspace folder.
 */
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) => {
  const segments = (await params).path;
  if (!(await ownsPath(segments))) {
    return new Response("Not found", { status: 404 });
  }
  const root = path.join(PUBLIC_DIR, "content");
  // With a bucket, the file comes straight from it.
  const file = path.resolve(root, ...segments);
  if (file.startsWith(root + path.sep)) {
    const url = await downloadUrl(file);
    if (url) return Response.redirect(url, 302);
  }
  return serveFile(request, root, segments, CONTENT_TYPES);
};
