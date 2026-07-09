import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fetchGithubStats } from "./github-data.js";

describe("fetchGithubStats", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("returns computed stats on a successful fetch", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "github-data-test-"));
    const cachePath = path.join(tempDir, "stats-cache.json");
    await writeFile(cachePath, JSON.stringify({ followers: 0, publicRepos: 0, totalStars: 0 }));

    const mockFetch = vi.fn(async (url: string) => {
      if (url.includes("/repos")) {
        return {
          ok: true,
          status: 200,
          json: async () => [{ stargazers_count: 10 }, { stargazers_count: 26 }],
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ followers: 42, public_repos: 27 }),
      } as Response;
    });

    const stats = await fetchGithubStats(mockFetch as unknown as typeof fetch, cachePath);
    expect(stats).toEqual({ followers: 42, publicRepos: 27, totalStars: 36 });
  });

  it("falls back to the cached file when the API call fails", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "github-data-test-"));
    const cachePath = path.join(tempDir, "stats-cache.json");
    const seeded = { followers: 7, publicRepos: 3, totalStars: 11 };
    await writeFile(cachePath, JSON.stringify(seeded));

    const mockFetch = vi.fn(async () => {
      throw new Error("network down");
    });

    const stats = await fetchGithubStats(mockFetch as unknown as typeof fetch, cachePath);
    expect(stats).toEqual(seeded);
  });

  it("throws a clear combined error when the fetch fails and the cache is unreadable", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "github-data-test-"));
    // Deliberately do not create the cache file — cachePath points at a nonexistent file.
    const cachePath = path.join(tempDir, "does-not-exist.json");

    const mockFetch = vi.fn(async () => {
      throw new Error("network down");
    });

    let caughtMessage = "";
    try {
      await fetchGithubStats(mockFetch as unknown as typeof fetch, cachePath);
      throw new Error("expected fetchGithubStats to reject, but it resolved");
    } catch (err) {
      caughtMessage = (err as Error).message;
    }

    expect(caughtMessage).toContain("network down");
    expect(caughtMessage).toContain("cache is unreadable");
  });

  it("throws a clear combined error when the fetch fails and the cache contains invalid JSON", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "github-data-test-"));
    const cachePath = path.join(tempDir, "stats-cache.json");
    await writeFile(cachePath, "{ not valid json");

    const mockFetch = vi.fn(async () => {
      throw new Error("network down");
    });

    let caughtMessage = "";
    try {
      await fetchGithubStats(mockFetch as unknown as typeof fetch, cachePath);
      throw new Error("expected fetchGithubStats to reject, but it resolved");
    } catch (err) {
      caughtMessage = (err as Error).message;
    }

    expect(caughtMessage).toContain("network down");
    expect(caughtMessage).toContain("cache is unreadable");
  });
});
