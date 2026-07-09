import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface GithubStats {
  followers: number;
  publicRepos: number;
  totalStars: number;
}

const USERNAME = "sabahattink";
const CACHE_PATH = path.join(process.cwd(), "assets", "stats-cache.json");

interface GithubUserResponse {
  followers: number;
  public_repos: number;
}

interface GithubRepoResponse {
  stargazers_count: number;
}

export async function fetchGithubStats(
  fetchImpl: typeof fetch = fetch,
  cachePath: string = CACHE_PATH
): Promise<GithubStats> {
  try {
    const [userRes, reposRes] = await Promise.all([
      fetchImpl(`https://api.github.com/users/${USERNAME}`),
      fetchImpl(`https://api.github.com/users/${USERNAME}/repos?per_page=100`),
    ]);

    if (!userRes.ok || !reposRes.ok) {
      throw new Error(`GitHub API returned ${userRes.status}/${reposRes.status}`);
    }

    const user = (await userRes.json()) as GithubUserResponse;
    const repos = (await reposRes.json()) as GithubRepoResponse[];
    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

    const stats: GithubStats = {
      followers: user.followers,
      publicRepos: user.public_repos,
      totalStars,
    };

    await writeFile(cachePath, JSON.stringify(stats, null, 2) + "\n");
    return stats;
  } catch (err) {
    console.warn(
      `[github-data] Live fetch failed (${(err as Error).message}); falling back to cached stats.`
    );
    try {
      const cached = await readFile(cachePath, "utf-8");
      return JSON.parse(cached) as GithubStats;
    } catch (cacheErr) {
      throw new Error(
        `GitHub fetch failed (${(err as Error).message}) and cache is unreadable (${(cacheErr as Error).message})`
      );
    }
  }
}
