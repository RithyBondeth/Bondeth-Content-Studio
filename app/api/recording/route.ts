import { saveRecording } from "../../../pipeline/recording";
import { videoMediaDir } from "../../../studio/server/projects";

/**
 * Uploads a voice-over the creator recorded in the browser for one scene,
 * and returns it as the scene's audio. A route rather than a server action,
 * because server actions cap request bodies at 1 MB.
 *
 * Form fields: `slug`, `index` (0-based video index), `scene` (0-based scene
 * index), `narration` (the text that was read) and `file`.
 * Responds with the SceneAudio, or `{ error }` and a 400.
 */
export const POST = async (request: Request) => {
  try {
    const form = await request.formData();
    const slug = form.get("slug");
    const index = Number(form.get("index"));
    const scene = Number(form.get("scene"));
    const narration = form.get("narration");
    const file = form.get("file");
    if (
      typeof slug !== "string" ||
      typeof narration !== "string" ||
      !(file instanceof File)
    ) {
      throw new Error("Record something first.");
    }
    if (!Number.isInteger(scene) || scene < 0) {
      throw new Error("That scene doesn't exist.");
    }
    const audio = await saveRecording(
      await videoMediaDir(slug, index),
      scene,
      Buffer.from(await file.arrayBuffer()),
      narration,
    );
    return Response.json(audio);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
};
