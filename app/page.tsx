import { Clapperboard, FileText, Lightbulb, Mic } from "lucide-react";
import { getKeyStatus } from "../studio/server/env";
import { listProjects } from "../studio/server/projects";
import { Header } from "./_components/Header";
import { KeyStatus } from "./_components/KeyStatus";
import { NewProjectForm } from "./_components/NewProjectForm";
import { ProjectCard } from "./_components/ProjectCard";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: Lightbulb,
    title: "Plan",
    text: "Claude turns your idea into a series with an audience, themes, and hooks.",
  },
  {
    icon: FileText,
    title: "Script",
    text: "Every video is written scene by scene. Edit anything with a live preview.",
  },
  {
    icon: Mic,
    title: "Voice",
    text: "ElevenLabs records natural narration, with captions synced word by word.",
  },
  {
    icon: Clapperboard,
    title: "Export",
    text: "Render vertical and landscape videos, ready for any platform.",
  },
];

export default async function HomePage() {
  const [projects, keys] = [await listProjects(), getKeyStatus()];

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div
        className="bg-stage pointer-events-none absolute inset-x-0 top-0 h-[720px]"
        aria-hidden
      />
      <div
        className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[720px]"
        aria-hidden
      />
      <Header>
        <KeyStatus status={keys} />
      </Header>

      <main className="relative mx-auto flex max-w-6xl flex-col gap-20 px-4 pt-16 pb-24 sm:px-6 sm:pt-24">
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-10">
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent-bright">
              <span className="size-1.5 rounded-full bg-accent-bright" />
              AI studio for explainer videos
            </span>
            <h1 className="text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-6xl">
              Turn what you know into{" "}
              <span className="text-gradient">videos people finish</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-pretty text-muted sm:text-lg">
              Describe an idea. Get a content plan, scripts, voice-over, and
              animated videos, and stay in control of every scene.
            </p>
          </div>
          <NewProjectForm hasClaude={keys.claude} />
        </section>

        <section aria-labelledby="how-it-works" className="flex flex-col gap-6">
          <h2 id="how-it-works" className="sr-only">
            How it works
          </h2>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="relative flex flex-col gap-3 rounded-2xl border border-line bg-surface/50 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl bg-accent/12 text-accent-bright ring-1 ring-accent/20 ring-inset">
                    <step.icon className="size-4" aria-hidden />
                  </span>
                  <span className="font-mono text-xs text-faint">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-[13px] leading-relaxed text-muted">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="projects" className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <h2 id="projects" className="text-xl font-medium tracking-tight">
              Your projects
            </h2>
            {projects.length ? (
              <span className="text-sm text-faint">
                {projects.length} total
              </span>
            ) : null}
          </div>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
              <Clapperboard className="size-6 text-faint" aria-hidden />
              <p className="font-medium">No projects yet</p>
              <p className="max-w-sm text-sm text-muted">
                Describe an idea above to plan your first series.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
