import { notFound } from "next/navigation";
import { blankPublishKit } from "../../../../../pipeline/publish";
import {
  listPlans,
  loadPlan,
  loadPublishKit,
  loadSpec,
} from "../../../../../pipeline/store";
import { getKeyStatus } from "../../../../../studio/server/env";
import { listCovers, listRenders } from "../../../../../studio/server/projects";
import { inPageWorkspace } from "../../../../../studio/server/session";
import { VideoEditor } from "../../../../_components/editor/VideoEditor";

export const dynamic = "force-dynamic";

export default async function VideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; video: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug, video } = await params;
  const { tab } = await searchParams;
  const index = Number(video) - 1;
  const data = await inPageWorkspace(async () => {
    if (!(await listPlans()).includes(slug)) return null;
    const plan = await loadPlan(slug);
    if (!Number.isInteger(index) || !plan.plan.videos[index]) return null;
    const spec = await loadSpec(plan, index);
    if (!spec) return null;
    return {
      plan,
      spec,
      renders: await listRenders(plan, index),
      publishKit: (await loadPublishKit(plan, index)) ?? blankPublishKit(spec),
      covers: await listCovers(plan, index),
      keys: await getKeyStatus(),
    };
  });
  if (!data) notFound();
  const { plan, spec } = data;

  return (
    <VideoEditor
      slug={slug}
      projectTitle={plan.plan.title}
      index={index}
      videoCount={plan.plan.videos.length}
      initialSpec={spec}
      initialRenders={data.renders}
      initialPublishKit={data.publishKit}
      initialCovers={data.covers}
      keys={data.keys}
      brandTheme={plan.brand?.theme}
      projectVoice={plan.brand?.voice}
      initialTab={tab === "video" || tab === "publish" ? tab : "scene"}
    />
  );
}
