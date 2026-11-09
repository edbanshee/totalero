// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { normalizeBasePath } from "./scripts/deployment.mjs";
import type { ConfigEnv } from "vite";

export default (env: ConfigEnv) => {
  const { mode } = env;
  const pages = mode === "pages";
  const railway = mode === "railway";
  // Build-time only; ordinary Lovable builds keep the existing Worker target.
  const base = pages ? normalizeBasePath(process.env['VITE_BASE_PATH']) : "/";
  return defineConfig({
    vite: { base },
    ...(pages || railway ? { nitro: { preset: "node-server" } } : {}),
    tanstackStart: {
      server: { entry: "server" },
      router: { basepath: base },
      ...(pages ? {
        // Render only a data-free shell. Financial state loads in the browser.
        spa: { enabled: true, prerender: { outputPath: "/_shell" } },
        prerender: { autoStaticPathsDiscovery: false, crawlLinks: false, failOnError: true },
      } : {}),
    },
  })(env);
};
