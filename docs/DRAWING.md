# How the profile works

The profile header is an as-built system riser drawing, regenerated from live GitHub data.

1. `src/scan.ts` asks the GitHub GraphQL API for each product in `src/config.ts`: stars, latest release, last push, default-branch check status. The response is validated with Zod; anything missing fails the run.
2. `src/revisions.ts` compares the scan with `data/state.json`. A new release, a star count change or a status change opens a new revision. A quiet day changes nothing, so nothing is committed.
3. `src/render/sheet.ts` draws the sheet as a pure function of that state. Same state, same bytes. Changed products get a revision cloud and a delta with the revision number.
4. `src/render/readme.ts` writes the same state into the README project table, between the `projects` markers.

Statuses: no push for 90 days is **maintenance due** (amber). Failing default-branch checks is a **fault** (red, blinking LED). An archived product counts as maintenance due.

## Commands

```bash
pnpm install
pnpm test                # unit tests, including a check that every label fits its symbol
pnpm generate:offline    # preview from fixtures/scan.json; never touches data/state.json
GITHUB_TOKEN=... pnpm generate   # live scan, what the workflow runs daily
```

## Adding a product

Add an entry to `PRODUCTS` in `src/config.ts`. Workstation symbols narrow automatically; `pnpm test` fails if a label no longer fits, before anything reaches GitHub. The next scan records it as a revision with an "added" change.

Fonts: B612 and B612 Mono (SIL OFL), embedded from `@fontsource`. `src/render/metrics.ts` holds their advance widths for the fit checks; regenerate it if the font packages change major version.

## Building SK-01

The second drawing is a building anyone can operate. Commands are GitHub issues with a fixed grammar:

```
bms: <office|meeting|server|lobby> setpoint <value>
bms: <office|meeting|server|lobby> lights <on|off>
bms: ack
```

The README generates prefilled links for each command, so visitors never type them.

1. `src/bms/io.ts` reads open issues whose title starts with `bms:`. The issue list is the queue; there is no other inbox.
2. `src/bms/command.ts` matches the title against the grammar above. Nothing else from the issue is read, and nothing from it reaches a shell.
3. `src/bms/engine.ts` applies the command at the issue's creation time: range and step checks, a per-operator rate limit (the owner is exempt), and the alarm cycle normal, active unacknowledged, active acknowledged, returned unacknowledged. Replies use BACnet error names: `VALUE_OUT_OF_RANGE`, `UNKNOWN_OBJECT`, `SERVICE_REQUEST_DENIED`, `UNRECOGNIZED_SERVICE`.
4. `src/bms/thermal.ts` is a first-order model per room against a live Open-Meteo outdoor temperature. The proportional loop settles near, not on, the setpoint; the server room's load puts it over its 27 °C limit at the top of its setpoint range.
5. `data/bms.json` holds the state. The workflow commits it, then posts replies and closes the issues. If the push fails, the issues stay open and are processed again; already-handled issues get their stored reply, never a second write.

Settings: Issues must be enabled on this repository. The workflow needs `contents: write` and `issues: write`, which it requests itself.

```bash
pnpm operate:offline     # preview from fixtures/building.json; never touches data/bms.json
```

Weather data by [Open-Meteo.com](https://open-meteo.com/), CC BY 4.0.
