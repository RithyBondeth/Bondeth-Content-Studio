import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { VideoFormat } from "../src/lib/formats";
import type { VideoSpecInput } from "../src/spec/schema";

/** Runs the Remotion CLI with the spec passed as input props. */
const runRemotion = async (spec: VideoSpecInput, args: string[]) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "content-studio-"));
  const propsFile = path.join(tempDir, "props.json");
  await fs.writeFile(propsFile, JSON.stringify({ spec }));

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.platform === "win32" ? "npx.cmd" : "npx",
        ["remotion", ...args, `--props=${propsFile}`],
        { stdio: "inherit" },
      );
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Remotion exited with code ${code}.`)),
      );
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

/** Renders a spec to MP4. */
export const renderVideo = async (
  spec: VideoSpecInput,
  format: VideoFormat,
  outputFile: string,
) => {
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await runRemotion(spec, [
    "render",
    `explainer-${format}`,
    outputFile,
    "--log=error",
  ]);
};

/** Opens Remotion Studio with the spec loaded into the explainer compositions. */
export const openStudio = (spec: VideoSpecInput) =>
  runRemotion(spec, ["studio"]);
