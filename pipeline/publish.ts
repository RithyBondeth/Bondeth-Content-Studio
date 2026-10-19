import {
  clampCoverScene,
  defaultCoverScene,
  fitPost,
  PLATFORMS,
  publishKitSchema,
  type PublishKit,
} from "../src/lib/publish";
import type { VideoSpecInput } from "../src/spec/schema";
import { generateStructured } from "./llm";
import { PUBLISH_SYSTEM, publishPrompt } from "./prompts";
import { publishDraftSchema, type PublishDraft } from "./schemas";
import { kitCreator } from "./script";
import type { PlanFile } from "./store";

/**
 * Turns Claude's draft into a publish kit, making every post fit its
 * platform's limits. Keeps the cover scene from the previous kit, if any.
 */
export const draftToPublishKit = (
  draft: PublishDraft,
  spec: VideoSpecInput,
  previous: PublishKit | null,
): PublishKit => {
  const posts = Object.fromEntries(
    PLATFORMS.map((platform) => [platform, fitPost(platform, draft[platform])]),
  ) as NonNullable<PublishKit["posts"]>;
  return publishKitSchema.parse({
    version: 1,
    coverScene: clampCoverScene(
      previous?.coverScene ?? defaultCoverScene(spec.scenes),
      spec.scenes.length,
    ),
    generatedAt: new Date().toISOString(),
    posts,
  });
};

/** Writes the title, post text, call to action, and hashtags for every platform in one call. */
export const createPublishKit = async (
  plan: PlanFile,
  index: number,
  spec: VideoSpecInput,
  previous: PublishKit | null,
): Promise<PublishKit> => {
  const draft = await generateStructured({
    schema: publishDraftSchema,
    system: PUBLISH_SYSTEM,
    prompt: publishPrompt(plan.plan, index, spec, {
      language: spec.language ?? plan.options.language,
      creator: spec.brand ?? kitCreator(plan.brand),
    }),
    label: `publish kit for "${spec.title}"`,
  });
  return draftToPublishKit(draft, spec, previous);
};

/** A kit with no posts yet, so a cover scene can be saved before generating. */
export const blankPublishKit = (spec: VideoSpecInput): PublishKit => ({
  version: 1,
  coverScene: defaultCoverScene(spec.scenes),
});
