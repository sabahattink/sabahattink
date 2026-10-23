import { z } from "zod";

/** Normalized result of one GitHub scan for one product. */
export const RepoScanSchema = z.object({
  repo: z.string().min(1),
  url: z.url(),
  stars: z.number().int().nonnegative(),
  release: z.string().min(1).nullable(),
  pushedAt: z.iso.datetime(),
  checks: z.enum(["passing", "failing", "pending", "none"]),
  archived: z.boolean(),
});
export type RepoScan = z.infer<typeof RepoScanSchema>;

export const ScanSchema = z.object({
  scannedAt: z.iso.datetime(),
  repos: z.array(RepoScanSchema).min(1),
});
export type Scan = z.infer<typeof ScanSchema>;

export const StatusSchema = z.enum(["normal", "maintenance", "fault"]);
export type Status = z.infer<typeof StatusSchema>;

export const ChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("issued") }),
  z.object({ kind: z.literal("added"), repo: z.string() }),
  z.object({
    kind: z.literal("release"),
    repo: z.string(),
    from: z.string().nullable(),
    to: z.string().nullable(),
  }),
  z.object({ kind: z.literal("status"), repo: z.string(), from: StatusSchema, to: StatusSchema }),
  z.object({ kind: z.literal("stars"), repo: z.string(), from: z.number().int(), to: z.number().int() }),
]);
export type Change = z.infer<typeof ChangeSchema>;

export const RevisionSchema = z.object({
  rev: z.number().int().positive(),
  date: z.iso.date(),
  changes: z.array(ChangeSchema).min(1),
});
export type Revision = z.infer<typeof RevisionSchema>;

/** Persisted in data/state.json; the only memory the generator has between runs. */
export const StateSchema = z.object({
  version: z.literal(1),
  scan: ScanSchema,
  revisions: z.array(RevisionSchema).min(1),
});
export type State = z.infer<typeof StateSchema>;

/** Raw repository node as returned by the GitHub GraphQL API. */
export const RepoNodeSchema = z.object({
  name: z.string(),
  url: z.url(),
  stargazerCount: z.number().int().nonnegative(),
  pushedAt: z.iso.datetime(),
  isArchived: z.boolean(),
  latestRelease: z.object({ tagName: z.string() }).nullable(),
  defaultBranchRef: z
    .object({
      target: z
        .object({
          statusCheckRollup: z
            .object({ state: z.enum(["SUCCESS", "FAILURE", "ERROR", "PENDING", "EXPECTED"]) })
            .nullable()
            .optional(),
        })
        .nullable(),
    })
    .nullable(),
});
export type RepoNode = z.infer<typeof RepoNodeSchema>;

export const GraphQLResponseSchema = z.object({
  data: z.record(z.string(), RepoNodeSchema.nullable()).nullable().optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});
