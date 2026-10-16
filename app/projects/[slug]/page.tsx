import { notFound } from "next/navigation";
import { listPlans, loadPlan } from "../../../pipeline/store";
import { getKeyStatus } from "../../../studio/server/env";
import { getVideoSummaries } from "../../../studio/server/projects";
import { ProjectView } from "./ProjectView";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await listPlans()).includes(slug)) notFound();

  const plan = await loadPlan(slug);
  const videos = await getVideoSummaries(plan);
  return <ProjectView plan={plan} videos={videos} keys={getKeyStatus()} />;
}
