import { notFound } from "next/navigation";
import { listPlans, loadPlan } from "../../../pipeline/store";
import { getKeyStatus } from "../../../studio/server/env";
import { getVideoSummaries } from "../../../studio/server/projects";
import { inPageWorkspace } from "../../../studio/server/session";
import { ProjectView } from "./ProjectView";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await inPageWorkspace(async () => {
    if (!(await listPlans()).includes(slug)) return null;
    const plan = await loadPlan(slug);
    return {
      plan,
      videos: await getVideoSummaries(plan),
      keys: await getKeyStatus(),
    };
  });
  if (!data) notFound();
  return <ProjectView {...data} />;
}
