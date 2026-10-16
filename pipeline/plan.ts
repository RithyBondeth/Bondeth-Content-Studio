import { generateStructured } from "./claude";
import { PLAN_SYSTEM, planPrompt } from "./prompts";
import { contentPlanSchema } from "./schemas";
import {
  savePlan,
  slugify,
  uniquePlanSlug,
  type PlanFile,
  type PlanOptions,
} from "./store";

/** Turns an idea into a content plan and saves it under content/<slug>/plan.json. */
export const createPlan = async (
  idea: string,
  options: PlanOptions,
): Promise<PlanFile> => {
  const plan = await generateStructured({
    schema: contentPlanSchema,
    system: PLAN_SYSTEM,
    prompt: planPrompt(idea, options),
    label: "content plan",
  });

  const file: PlanFile = {
    version: 1,
    slug: await uniquePlanSlug(slugify(plan.title)),
    idea,
    createdAt: new Date().toISOString(),
    options,
    plan,
  };
  await savePlan(file);
  return file;
};
