import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Rendering runs in a separate worker process (pipeline/render-worker.ts);
  // keep Remotion's bundler and renderer out of the Next.js server bundle.
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer"],
  devIndicators: false,
};

export default nextConfig;
