import { OUT_DIR } from "../../../../pipeline/config";
import { serveFile } from "../../../../studio/server/serve-file";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".srt": "application/x-subrip",
  ".vtt": "text/vtt",
  ".zip": "application/zip",
};

/** Serves rendered videos, cover images, caption files, and bundles from out/, with range support so videos can seek. */
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) => serveFile(request, OUT_DIR, (await params).path, CONTENT_TYPES);
