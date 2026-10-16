import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { OUT_DIR } from "../../../../pipeline/config";

/** Serves rendered videos from out/, with range support so videos can seek. */
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) => {
  const { path: segments } = await params;
  const file = path.resolve(OUT_DIR, ...segments);
  if (!file.startsWith(OUT_DIR + path.sep) || !file.endsWith(".mp4")) {
    return new Response("Not found", { status: 404 });
  }

  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile()) {
    return new Response("Not found", { status: 404 });
  }

  const download = new URL(request.url).searchParams.has("download");
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
  };
  if (download) {
    headers["Content-Disposition"] =
      `attachment; filename="${path.basename(file)}"`;
  }

  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1]
      ? Number(range[1])
      : Math.max(0, stat.size - Number(range[2]));
    const end =
      range[1] && range[2]
        ? Math.min(Number(range[2]), stat.size - 1)
        : stat.size - 1;
    if (start > end || start >= stat.size) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${stat.size}` },
      });
    }
    const stream = createReadStream(file, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = createReadStream(file);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: { ...headers, "Content-Length": String(stat.size) },
  });
};
