import path from "node:path";
import { OUT_ROOT } from "../../../../pipeline/config";
import { downloadUrl } from "../../../../pipeline/storage";
import { serveFile } from "../../../../studio/server/serve-file";
import { ownsPath } from "../../../../studio/server/session";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".srt": "application/x-subrip",
  ".vtt": "text/vtt",
  ".zip": "application/zip",
};

/**
 * Serves rendered videos, cover images, caption files, and bundles from out/,
 * with range support so videos can seek. Only the person's own files.
 */
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) => {
  const segments = (await params).path;
  if (!(await ownsPath(segments))) {
    return new Response("Not found", { status: 404 });
  }
  // With a bucket, the download comes straight from it.
  const file = path.resolve(OUT_ROOT, ...segments);
  if (file.startsWith(OUT_ROOT + path.sep)) {
    const url = await downloadUrl(file, {
      download: new URL(request.url).searchParams.has("download"),
    });
    if (url) return Response.redirect(url, 302);
  }
  return serveFile(request, OUT_ROOT, segments, CONTENT_TYPES);
};
