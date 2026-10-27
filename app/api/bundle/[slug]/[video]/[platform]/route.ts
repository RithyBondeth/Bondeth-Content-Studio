import { buildBundle } from "../../../../../../pipeline/bundle";
import { listPlans, loadPlan } from "../../../../../../pipeline/store";
import { PLATFORMS, type Platform } from "../../../../../../src/lib/publish";
import { workspaceRoute } from "../../../../../../studio/server/session";

export const dynamic = "force-dynamic";

/**
 * Builds and downloads one platform's posting bundle: a zip with the video,
 * cover, post text, and captions. `video` is 1-based, like the editor's URL.
 */
export const GET = workspaceRoute(
  async (
    _request: Request,
    {
      params,
    }: { params: Promise<{ slug: string; video: string; platform: string }> },
  ) => {
    const { slug, video, platform } = await params;
    const index = Number(video) - 1;
    if (
      !(PLATFORMS as readonly string[]).includes(platform) ||
      !(await listPlans()).includes(slug)
    ) {
      return new Response("Not found", { status: 404 });
    }
    const plan = await loadPlan(slug);
    if (!Number.isInteger(index) || !plan.plan.videos[index]) {
      return new Response("Not found", { status: 404 });
    }

    try {
      const { fileName, zip } = await buildBundle(
        plan,
        index,
        platform as Platform,
      );
      return new Response(new Uint8Array(zip), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": String(zip.length),
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      console.error(error);
      return new Response(
        error instanceof Error ? error.message : "Couldn't build the bundle.",
        { status: 500 },
      );
    }
  },
);
