export type GithubOwnerRepo = { owner: string; repo: string };

function stripGitSuffix(s: string) {
  return s.endsWith(".git") ? s.slice(0, -4) : s;
}

function clean(s: string) {
  return s.trim().replace(/^@/, "");
}

/**
 * Parse a GitHub repository identifier from a user-provided string.
 *
 * Accepts:
 * - "owner/repo"
 * - "https://github.com/owner/repo"
 * - "github.com/owner/repo"
 * - "https://github.com/owner/repo/tree/main/path"
 * - "git@github.com:owner/repo.git"
 */
export function parseGithubRepo(input: string): GithubOwnerRepo {
  const trimmed = clean(input);
  if (!trimmed) throw new Error("Empty GitHub repo input");

  // SSH form: git@github.com:owner/repo(.git)
  const sshMatch = trimmed.match(
    /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i,
  );
  if (sshMatch) {
    const owner = clean(sshMatch[1] ?? "");
    const repo = stripGitSuffix(clean(sshMatch[2] ?? ""));
    if (!owner || !repo) throw new Error("Invalid GitHub repo input");
    return { owner, repo };
  }

  // Plain owner/repo form
  if (!trimmed.includes("://") && /^[^/]+\/[^/]+$/.test(trimmed)) {
    const [owner, repoRaw] = trimmed.split("/");
    const repo = stripGitSuffix(clean(repoRaw ?? ""));
    if (!owner || !repo) throw new Error("Invalid GitHub repo input");
    return { owner: clean(owner), repo };
  }

  // URL-ish form
  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("Invalid GitHub URL");
  }

  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    throw new Error("URL is not a github.com URL");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const owner = clean(segments[0] ?? "");
  const repo = stripGitSuffix(clean(segments[1] ?? ""));
  if (!owner || !repo)
    throw new Error("GitHub repo URL must include /owner/repo");
  return { owner, repo };
}

/**
 * Parse a GitHub owner/login from input like:
 * - "octocat"
 * - "@octocat"
 * - "https://github.com/octocat"
 */
export function parseGithubOwner(input: string): string {
  const trimmed = clean(input);
  if (!trimmed) return "";

  // If it looks like a URL, pull the first path segment.
  if (trimmed.includes("/") && trimmed.includes(".")) {
    try {
      const url = new URL(
        trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
      );
      if (url.hostname === "github.com" || url.hostname === "www.github.com") {
        return clean(url.pathname.split("/").filter(Boolean)[0] ?? "");
      }
    } catch {
      // fall through
    }
  }

  // If it looks like "github.com/foo" without scheme
  if (trimmed.startsWith("github.com/")) {
    return clean(
      trimmed.slice("github.com/".length).split("/").filter(Boolean)[0] ?? "",
    );
  }

  // Plain login.
  return clean(trimmed.split("/").filter(Boolean)[0] ?? "");
}
