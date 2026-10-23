import { PRODUCTS } from "./config.js";
import type { Change } from "./schema.js";

/** "recall-context@0.2.1" -> "v0.2.1", "v1.4.0" -> "v1.4.0". */
export function formatRelease(tag: string | null): string {
  if (tag === null) return "no release";
  const afterAt = tag.slice(tag.lastIndexOf("@") + 1);
  const bare = afterAt.replace(/^v/i, "");
  return /^\d/.test(bare) ? `v${bare}` : afterAt;
}

export function shortName(repo: string): string {
  return PRODUCTS.find((p) => p.repo === repo)?.short ?? repo;
}


export function describeChange(change: Change): string {
  switch (change.kind) {
    case "issued":
      return "Sheet issued";
    case "added":
      return `${shortName(change.repo)} added`;
    case "release":
      return change.to === null
        ? `${shortName(change.repo)} release withdrawn`
        : `${shortName(change.repo)} ${formatRelease(change.to)} released`;
    case "status":
      if (change.to === "normal") return `${shortName(change.repo)} back to normal`;
      if (change.to === "fault") return `${shortName(change.repo)} checks failing`;
      return `${shortName(change.repo)} maintenance due`;
    case "stars":
      return `${shortName(change.repo)} ${change.to} stars`;
  }
}
