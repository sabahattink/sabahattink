import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { replyAndClose } from "./bms/io.js";
import { HandledSchema } from "./bms/schema.js";

async function main(): Promise<void> {
  const repliesPath = process.env.REPLIES_PATH ?? path.join(os.tmpdir(), "bms-replies.json");
  if (!existsSync(repliesPath)) {
    console.log("No replies file; nothing to send.");
    return;
  }
  const replies = z.array(HandledSchema).parse(JSON.parse(readFileSync(repliesPath, "utf8")));
  const token = process.env.GITHUB_TOKEN;
  if (token === undefined || token === "") throw new Error("GITHUB_TOKEN is required");

  let failures = 0;
  for (const reply of replies) {
    try {
      await replyAndClose(token, reply);
      console.log(`#${reply.issue}: replied and closed (${reply.close}).`);
    } catch (error) {
      failures += 1;
      console.error(`#${reply.issue}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // Issues that failed stay open; the next run finds them handled and sends the stored reply again.
  if (failures > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
