import { saveTake } from "../../../../pipeline/recording";
import { videoMediaDir } from "../../../../studio/server/projects";
import { workspaceRoute } from "../../../../studio/server/session";

/**
 * Uploads one voice-over take covering the whole video, recorded in the
 * browser or uploaded, and plans where to split it into scenes. A route
 * rather than a server action, because server actions cap request bodies
 * at 1 MB.
 *
 * Form fields: `slug`, `index` (0-based video index), `narrations` (a JSON
 * array with each scene's narration), optional `hints` (a JSON array of the
 * times, in seconds, Next scene was clicked while recording) and `file`.
 * Responds with `{ take, src, durationInSeconds, pauses, cuts }`, where
 * `cuts` are indexes into `pauses`, or `{ error }` and a 400.
 */
export const POST = workspaceRoute(async (request: Request) => {
  try {
    const form = await request.formData();
    const slug = form.get("slug");
    const index = Number(form.get("index"));
    const narrations = parseJson(form.get("narrations"));
    const hints = parseJson(form.get("hints"));
    const file = form.get("file");
    if (typeof slug !== "string" || !(file instanceof File)) {
      throw new Error("Record something first.");
    }
    if (
      !Array.isArray(narrations) ||
      !narrations.every((narration) => typeof narration === "string")
    ) {
      throw new Error("The scenes are missing. Reload the page and try again.");
    }
    const take = await saveTake(
      await videoMediaDir(slug, index),
      Buffer.from(await file.arrayBuffer()),
      narrations,
      Array.isArray(hints) && hints.every(Number.isFinite) ? hints : undefined,
    );
    return Response.json(take);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
});

const parseJson = (value: FormDataEntryValue | null): unknown => {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};
