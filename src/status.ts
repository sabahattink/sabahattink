import { THRESHOLDS } from "./config.js";
import type { RepoScan, Status } from "./schema.js";

const DAY_MS = 86_400_000;

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((Date.parse(toIso) - Date.parse(fromIso)) / DAY_MS);
}

/**
 * Status of a product at a given instant. Fault wins over maintenance:
 * failing checks are a real defect, a quiet repository is only overdue care.
 */
export function statusOf(repo: RepoScan, at: string, staleDays: number = THRESHOLDS.staleDays): Status {
  if (repo.checks === "failing") return "fault";
  if (repo.archived) return "maintenance";
  if (daysBetween(repo.pushedAt, at) > staleDays) return "maintenance";
  return "normal";
}
