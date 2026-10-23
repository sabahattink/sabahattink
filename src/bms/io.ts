import { isCommandTitle } from "./command.js";
import { REPO, SITE } from "./config.js";
import { type Handled, IssueListSchema, WeatherSchema } from "./schema.js";

const API = "https://api.github.com";
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

export interface QueuedIssue {
  readonly number: number;
  readonly title: string;
  readonly user: string;
  readonly createdAt: string;
}

function headers(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": `${REPO.owner}-building-sk01`,
  };
}

/** Open issues whose title starts with the command prefix, oldest first. The issue list is the queue. */
export async function listQueue(token: string): Promise<QueuedIssue[]> {
  const queue: QueuedIssue[] = [];
  for (let page = 1; page <= 3; page += 1) {
    const url = `${API}/repos/${REPO.owner}/${REPO.name}/issues?state=open&sort=created&direction=asc&per_page=100&page=${page}`;
    const response = await fetch(url, { headers: headers(token), signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`GitHub issues HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    const issues = IssueListSchema.parse(await response.json());
    for (const issue of issues) {
      if (issue.pull_request !== undefined || !isCommandTitle(issue.title)) continue;
      const login = issue.user?.login ?? "ghost";
      queue.push({
        number: issue.number,
        title: issue.title.slice(0, 200),
        user: LOGIN.test(login) ? login : "ghost",
        createdAt: issue.created_at,
      });
    }
    if (issues.length < 100) break;
  }
  return queue.sort((a, b) => a.number - b.number);
}

export async function fetchOutdoor(): Promise<number> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${SITE.latitude}&longitude=${SITE.longitude}&current=temperature_2m`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  return WeatherSchema.parse(await response.json()).current.temperature_2m;
}

export async function replyAndClose(token: string, handled: Handled): Promise<void> {
  const base = `${API}/repos/${REPO.owner}/${REPO.name}/issues/${handled.issue}`;
  const comment = await fetch(`${base}/comments`, {
    method: "POST",
    headers: { ...headers(token), "content-type": "application/json" },
    body: JSON.stringify({ body: handled.reply }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!comment.ok) throw new Error(`Comment on #${handled.issue} failed: HTTP ${comment.status}`);
  const close = await fetch(base, {
    method: "PATCH",
    headers: { ...headers(token), "content-type": "application/json" },
    body: JSON.stringify({ state: "closed", state_reason: handled.close }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!close.ok) throw new Error(`Closing #${handled.issue} failed: HTTP ${close.status}`);
}
