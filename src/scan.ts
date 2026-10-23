import { GraphQLResponseSchema, type RepoNode, type RepoScan, type Scan, ScanSchema } from "./schema.js";

const ENDPOINT = "https://api.github.com/graphql";

const FRAGMENT = `
fragment Product on Repository {
  name
  url
  stargazerCount
  pushedAt
  isArchived
  latestRelease { tagName }
  defaultBranchRef { target { ... on Commit { statusCheckRollup { state } } } }
}`;

export function buildQuery(owner: string, repos: readonly string[]): string {
  const fields = repos
    .map((repo, i) => `  r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}) { ...Product }`)
    .join("\n");
  return `query Products {\n${fields}\n}\n${FRAGMENT}`;
}

export function normalizeNode(node: RepoNode): RepoScan {
  const rollup = node.defaultBranchRef?.target?.statusCheckRollup?.state ?? null;
  const checks =
    rollup === null
      ? "none"
      : rollup === "SUCCESS"
        ? "passing"
        : rollup === "FAILURE" || rollup === "ERROR"
          ? "failing"
          : "pending";
  return {
    repo: node.name,
    url: node.url,
    stars: node.stargazerCount,
    release: node.latestRelease?.tagName ?? null,
    pushedAt: node.pushedAt,
    checks,
    archived: node.isArchived,
  };
}

/** Pure: validated GraphQL payload in, normalized scan out. Throws on anything missing. */
export function parseResponse(payload: unknown, repos: readonly string[], scannedAt: string): Scan {
  const parsed = GraphQLResponseSchema.parse(payload);
  if (parsed.errors !== undefined && parsed.errors.length > 0) {
    throw new Error(`GitHub GraphQL errors: ${parsed.errors.map((e) => e.message).join("; ")}`);
  }
  const data = parsed.data ?? {};
  const scanned = repos.map((repo, i) => {
    const node = data[`r${i}`];
    if (node === undefined || node === null) throw new Error(`Repository not returned by GitHub: ${repo}`);
    return normalizeNode(node);
  });
  return ScanSchema.parse({ scannedAt, repos: scanned });
}

export async function fetchScan(options: {
  token: string;
  owner: string;
  repos: readonly string[];
  now: Date;
}): Promise<Scan> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `bearer ${options.token}`,
      "content-type": "application/json",
      "user-agent": `${options.owner}-profile-generator`,
    },
    body: JSON.stringify({ query: buildQuery(options.owner, options.repos) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`GitHub GraphQL HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const scannedAt = `${options.now.toISOString().slice(0, 19)}Z`;
  return parseResponse(await response.json(), options.repos, scannedAt);
}
