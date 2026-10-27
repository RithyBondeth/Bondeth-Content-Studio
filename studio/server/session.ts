import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { runInWorkspace } from "../../pipeline/config";
import { getAuthMode, isAdmin } from "../auth-mode";
import { getAuth } from "./auth";

export type User = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

/** The signed-in person, or null (always null without accounts). */
export const getUser = async (): Promise<User | null> => {
  if (getAuthMode().kind !== "accounts") return null;
  const session = await (
    await getAuth()
  ).api.getSession({ headers: await headers() });
  return session?.user ?? null;
};

/** Whether the current person can see and change the API keys. */
export const canManageKeys = async () =>
  getAuthMode().kind === "accounts" ? isAdmin((await getUser())?.email) : true;

const workspaceFor = async (): Promise<
  { ok: true; id: string | undefined } | { ok: false }
> => {
  const mode = getAuthMode();
  if (mode.kind === "open") return { ok: true, id: undefined };
  if (mode.kind === "misconfigured") return { ok: false };
  const user = await getUser();
  return user ? { ok: true, id: user.id } : { ok: false };
};

/**
 * Runs `task` in the signed-in person's workspace, so every project, file,
 * and render it touches is theirs. For server actions and API routes: throws
 * when nobody is signed in. Without accounts it runs in the shared folders.
 */
export const inWorkspace = async <T>(task: () => Promise<T>): Promise<T> => {
  const workspace = await workspaceFor();
  if (!workspace.ok) throw new Error("Sign in first.");
  return runInWorkspace(workspace.id, task);
};

/** The same for pages: sends anyone not signed in to the sign-in page. */
export const inPageWorkspace = async <T>(
  task: () => Promise<T>,
): Promise<T> => {
  const workspace = await workspaceFor();
  if (!workspace.ok) redirect("/login");
  return runInWorkspace(workspace.id, task);
};

/**
 * Whether a file path (split into segments, relative to out/ or
 * public/content/) belongs to the current person. With accounts, their files
 * all sit under a folder named by their id; without, every path is shared.
 */
export const ownsPath = async (segments: string[]) => {
  const workspace = await workspaceFor();
  if (!workspace.ok) return false;
  return workspace.id === undefined || segments[0] === workspace.id;
};

/**
 * Wraps an API route handler so it runs in the signed-in person's workspace,
 * or answers 401 when nobody is signed in.
 */
export const workspaceRoute =
  <Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) =>
  async (...args: Args): Promise<Response> => {
    const workspace = await workspaceFor();
    if (!workspace.ok) {
      return Response.json({ error: "Sign in first." }, { status: 401 });
    }
    return runInWorkspace(workspace.id, () => handler(...args));
  };
