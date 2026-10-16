import { getKeyStatus } from "../studio/server/env";
import { listProjects } from "../studio/server/projects";
import { Header } from "./_components/Header";
import { KeyStatus } from "./_components/KeyStatus";
import { NewProjectForm } from "./_components/NewProjectForm";
import { ProjectCard } from "./_components/ProjectCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [projects, keys] = [await listProjects(), getKeyStatus()];

  return (
    <>
      <Header>
        <KeyStatus status={keys} />
      </Header>
      <main className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-12 sm:px-6">
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div className="flex flex-col gap-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What do you want to teach?
            </h1>
            <p className="text-muted">
              Describe your idea. Claude plans a video series, writes every
              script, and you edit and render animated explainer videos here.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <NewProjectForm hasClaude={keys.claude} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Your projects</h2>
          {projects.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
              No projects yet. Create a content plan above, or try the example
              project.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
