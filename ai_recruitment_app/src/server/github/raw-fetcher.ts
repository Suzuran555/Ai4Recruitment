import { env } from "~/env";

/**
 * Parsed GitHub repository information
 */
export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch: string;
}

/**
 * Parse GitHub repository URL
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo/tree/branch
 */
export function parseGitHubUrl(url: string): GitHubRepoInfo {
  try {
    const urlObj = new URL(url);

    if (!urlObj.hostname.includes("github.com")) {
      throw new Error("Not a GitHub URL");
    }

    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2) {
      throw new Error("Invalid GitHub URL format");
    }

    const owner = pathParts[0]!;
    let repo = pathParts[1]!;

    // Remove .git suffix if present
    if (repo.endsWith(".git")) {
      repo = repo.slice(0, -4);
    }

    // Extract branch if present in URL (e.g., /tree/branch-name)
    let branch = "main";
    const treeIndex = pathParts.indexOf("tree");
    if (treeIndex !== -1 && pathParts[treeIndex + 1]) {
      branch = pathParts[treeIndex + 1]!;
    }

    return { owner, repo, branch };
  } catch (error) {
    throw new Error(
      `Failed to parse GitHub URL: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Fetch raw file content from public GitHub repository
 * @param owner Repository owner
 * @param repo Repository name
 * @param filePath Path to file (e.g., "src/App.tsx")
 * @param branch Branch name (default: "main")
 * @returns File content as string
 */
export async function fetchGitHubFile(
  owner: string,
  repo: string,
  filePath: string,
  branch = "main"
): Promise<string> {
  // Construct raw content URL
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

  // Prepare headers (add token if available for higher rate limits)
  const headers: Record<string, string> = {
    "User-Agent": "AI-Recruitment-App",
  };

  if (env.GITHUB_TOKEN) {
    headers.Authorization = `token ${env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(rawUrl, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${filePath}`);
      }
      if (response.status === 403) {
        throw new Error(
          "GitHub rate limit exceeded or repository is private"
        );
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const content = await response.text();
    return content;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch file from GitHub");
  }
}

/**
 * Fetch multiple files from a GitHub repository
 * @param repoUrl Full GitHub repository URL
 * @param filePaths Array of file paths to fetch
 * @param branch Branch name (optional, defaults to parsed from URL or "main")
 * @returns Object mapping file paths to their content
 */
export async function fetchMultipleFiles(
  repoUrl: string,
  filePaths: string[],
  branch?: string
): Promise<Record<string, string>> {
  const repoInfo = parseGitHubUrl(repoUrl);
  const targetBranch = branch ?? repoInfo.branch;

  const results: Record<string, string> = {};
  const errors: string[] = [];

  // Fetch files in parallel
  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const content = await fetchGitHubFile(
          repoInfo.owner,
          repoInfo.repo,
          filePath,
          targetBranch
        );
        results[filePath] = content;
      } catch (error) {
        errors.push(
          `${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    })
  );

  // Log errors but don't fail if some files succeed
  if (errors.length > 0) {
    console.warn("Some files failed to fetch:", errors);
  }

  return results;
}

/**
 * Simple in-memory cache for file contents (optional optimization)
 */
const fileCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch file with caching
 */
export async function fetchGitHubFileWithCache(
  owner: string,
  repo: string,
  filePath: string,
  branch = "main"
): Promise<string> {
  const cacheKey = `${owner}/${repo}/${branch}/${filePath}`;
  const cached = fileCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }

  const content = await fetchGitHubFile(owner, repo, filePath, branch);

  fileCache.set(cacheKey, { content, timestamp: Date.now() });

  return content;
}

/**
 * Clear file cache (useful for testing or manual refresh)
 */
export function clearFileCache(): void {
  fileCache.clear();
}
