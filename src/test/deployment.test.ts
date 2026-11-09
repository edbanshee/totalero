import { QueryClient } from "@tanstack/react-query";
import { createRouter, createMemoryHistory } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { normalizeBasePath, repositoryBase } from "../../scripts/deployment.mjs";
import { routeTree } from "@/routeTree.gen";

describe("GitHub Pages deployment", () => {
  it("uses the repository name as the project website base", () => {
    expect(repositoryBase("jesus/totalero")).toBe("/totalero/");
  });
  it("uses root for an account website", () => {
    expect(repositoryBase("jesus/jesus.github.io")).toBe("/");
  });
  it("uses root when a custom domain is configured", () => {
    expect(repositoryBase("jesus/totalero", "finanzas.example.com")).toBe("/");
  });
  it("normalizes base slashes", () => {
    expect(normalizeBasePath("totalero")).toBe("/totalero/");
    expect(normalizeBasePath()).toBe("/");
    expect(() => normalizeBasePath("../totalero")).toThrow();
  });
  it("matches the welcome page beneath the repository base", () => {
    const router = createRouter({ routeTree, basepath: "/totalero/", context: { queryClient: new QueryClient() } });
    const location = router.parseLocation(createMemoryHistory({ initialEntries: ["/totalero/"] }).location);
    expect(location.pathname).toBe("/");
    expect(router.matchRoutes(location.pathname).at(-1)?.routeId).toBe("/");
  });
  it("matches the dashboard beneath the repository base", () => {
    const router = createRouter({ routeTree, basepath: "/totalero/", context: { queryClient: new QueryClient() } });
    const location = router.parseLocation(createMemoryHistory({ initialEntries: ["/totalero/app/"] }).location);
    expect(location.pathname).toBe("/app/");
    expect(router.matchRoutes(location.pathname).at(-1)?.routeId).toBe("/app");
    expect(router.buildLocation({ to: "/app" }).href).toBe("/totalero/app");
  });
});