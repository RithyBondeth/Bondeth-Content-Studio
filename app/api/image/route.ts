import { saveImage } from "../../../pipeline/images";
import { videoMediaDir } from "../../../studio/server/projects";

/**
 * Uploads an image for one video's image scene. A route rather than a server
 * action, because server actions cap request bodies at 1 MB.
 *
 * Form fields: `slug`, `index` (0-based video index) and `file`.
 * Responds with `{ src }`, or `{ error }` and a 400.
 */
export const POST = async (request: Request) => {
  try {
    const form = await request.formData();
    const slug = form.get("slug");
    const index = Number(form.get("index"));
    const file = form.get("file");
    if (typeof slug !== "string" || !(file instanceof File)) {
      throw new Error("Choose an image to upload.");
    }
    const src = await saveImage(
      await videoMediaDir(slug, index),
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
    return Response.json({ src });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
};
