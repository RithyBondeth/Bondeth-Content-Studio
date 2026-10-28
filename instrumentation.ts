/** Runs once when the server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { resumeRenderQueue } = await import("./studio/server/render-jobs");
    resumeRenderQueue();
  }
}
