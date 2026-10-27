import { saveMusicUpload } from "../../../studio/server/projects";
import { workspaceRoute } from "../../../studio/server/session";

/**
 * Uploads a music track for one video. A route rather than a server action,
 * because server actions cap request bodies at 1 MB.
 *
 * Form fields: `slug`, `index` (0-based video index) and `file`.
 * Responds with `{ src }`, or `{ error }` and a 400.
 */
export const POST = workspaceRoute(async (request: Request) => {
  try {
    const form = await request.formData();
    const slug = form.get("slug");
    const index = Number(form.get("index"));
    const file = form.get("file");
    if (typeof slug !== "string" || !(file instanceof File)) {
      throw new Error("Choose a file to upload.");
    }
    const src = await saveMusicUpload(
      slug,
      index,
      file.name,
      Buffer.from(await file.arrayBuffer()),
    );
    return Response.json({ src });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
});
