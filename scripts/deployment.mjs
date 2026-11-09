/** Shared browser-safe deployment path rules. */
export function normalizeBasePath(value = "/") {
  const path = value.trim().replace(/^\/+|\/+$/g, "");
  if (!path) return "/";
  if (!/^[A-Za-z0-9._-]+$/.test(path) || path === "." || path === "..") {
    throw new Error("The Pages base must be / or a single repository name.");
  }
  return `/${path}/`;
}

export function repositoryBase(repository, customDomain = "") {
  if (customDomain.trim()) return "/";
  const [owner, name, ...extra] = repository.split("/");
  if (!owner || !name || extra.length) throw new Error("Expected owner/repository.");
  return name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? "/" : normalizeBasePath(name);
}