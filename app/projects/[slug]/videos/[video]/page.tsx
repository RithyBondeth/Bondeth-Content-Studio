import { notFound } from "next/navigation";
import { listPlans, loadPlan, loadSpec } from "../../../../../pipeline/store";
import { getKeyStatus } from "../../../../../studio/server/env";
import { listRenders } from "../../../../../studio/server/projects";
import { VideoEditor } from "../../../../_components/editor/VideoEditor";

export const dynamic = "force-dynamic";

export default async function VideoPage({
  params,
}: {
  params: Promise<{ slug: string; video: string }>;
}) {
  const { slug, video } = await params;
  if (!(await listPlans()).includes(slug)) notFound();
  const plan = await loadPlan(slug);
  const index = Number(video) - 1;
  if (!Number.isInteger(index) || !plan.plan.videos[index]) notFound();

  const spec = await loadSpec(plan, index);
  if (!spec) notFound();

  return (
    <VideoEditor
      slug={slug}
      projectTitle={plan.plan.title}
      index={index}
      videoCount={plan.plan.videos.length}
      initialSpec={spec}
      initialRenders={await listRenders(plan, index)}
      keys={getKeyStatus()}
      brandTheme={plan.brand?.theme}
      projectVoice={plan.brand?.voice}
    />
  );
}
