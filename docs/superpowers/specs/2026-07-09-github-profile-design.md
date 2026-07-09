# GitHub Profile Design — sabahattink/sabahattink

**Date:** 2026-07-09
**Status:** Approved (brainstorming phase) — pending spec review
**Repo:** `H:\10_ENGINEERING\sabahattink` (github.com/sabahattink/sabahattink)

## 1. Intent

Redesign the GitHub profile README as a single, coherent engineering-document experience — not a resume, not a marketing landing page. Visual language draws from engineering drawings, Apple documentation, and Stripe's technical writing register: restrained, asymmetric, editorial, evidence-based. Every claim about the person must be authentic — no invented companies, experience, or metrics.

## 2. Content Structure & Narrative

Final section order (locked):

1. **Hero** — SVG, name + role + spec rail
2. **Mission** — *Why do I build software?* (2–3 sentences)
3. **Selected Projects** — markdown, 6 projects
4. **Engineering Principles** — *What do I believe?* (short bullet list)
5. **Engineering Utilities** — evidence that the principles above are applied in practice (real markdown table)
6. **How I Build Software** — *How do I work?* (process narrative: internal tool → proven in production → documented → released)
7. **Tech Stack** — supporting reference, deliberately placed late ("technologies support the story rather than define it")
8. **Current Focus** — short list, carried from existing README's "Current Interests"
9. **Open Source** — philosophy paragraph, largely reused from the current README (already strong, reviewed positively)
10. **Closing** — a strong closing statement. **No traditional Contact section.** GitHub already surfaces profile links (followers, socials via GitHub's own profile chrome); the README does not duplicate them.

### Section differentiation rule (hard constraint)

Mission, Engineering Principles, and How I Build Software must answer three different questions with zero overlap:

| Section | Question | Content type |
|---|---|---|
| Mission | Why do I build software? | Personal purpose, 2–3 sentences |
| Engineering Principles | What do I believe? | Short, punchy bullet list of values |
| How I Build Software | How do I work? | Process narrative (method, not values) |

**Test:** if a sentence could fit in more than one section, it belongs in the wrong one. Engineering Principles → Engineering Utilities → How I Build Software stay adjacent so the reader gets *belief → proof → process* as one continuous argument, uninterrupted by Tech Stack or Current Focus.

## 3. Selected Projects (verified against GitHub API)

| Project | Repo | Notes |
|---|---|---|
| LLM Gateway | `github.com/sabahattink/llm-gateway` | Previously linked to `scuton-technology/llm-gateway`, which now 301-redirects here. Org `scuton-technology` no longer exists (404 on `/orgs/scuton-technology`). Use the personal-account URL directly. |
| CodeDiag | `github.com/sabahattink/codediag` | "Diagnose your code before you ship. One command, five analyzers, one score." |
| Antigravity Fullstack HQ | `github.com/sabahattink/antigravity-fullstack-hq` | "Permission-first CLAUDE.md + agent stack for Claude Code and Google Antigravity — 10 agents, 28 skills, one-command install" |
| vault-os | `github.com/sabahattink/vault-os` | Added during brainstorming — the personal knowledge/automation system (Telegram bot, nightly agent, Whisper transcription, Obsidian daily notes). Strong, currently-in-production story. |
| MailTest | *(no link)* | No public repo found under `sabahattink` at time of writing. Keep as description-only, matching the previous README's treatment. Revisit if/when it's public. |
| KalkanOS | *(no link, "coming soon")* | Not yet built. Shown as the 6th project with a "coming" marker, no repo reference. |

**Open question (non-blocking, flagged for the user):** `you-design`, `siteforge`, `clawforge`, `commit-story`, and `claude-dev-team` exist on the account but were excluded from both Selected Projects and Engineering Utilities during brainstorming — they're more substantial than a one-line utility but weren't scoped as "featured." Left out of this spec; revisit in a future iteration if desired.

## 4. Engineering Utilities

Renamed from the working title "Also Shipped." Real markdown, not badges, not an SVG panel — every entry must stay individually clickable and searchable.

- Quiet `### Engineering Utilities` heading (not visually competing with `## Selected Projects`)
- One italic line beneath: "Smaller tools, shipped and maintained the same way."
- Dense 4-column markdown table (Tool | What it does | Tool | What it does), 2–4 word descriptions, 7 rows for 14 tools
- Tool name as inline code + link to its repo

| Tool | Description | Tool | Description |
|---|---|---|---|
| `safe-json` | Safe JSON parse/stringify | `retry-fn` | Async retry, backoff |
| `kill-port` | Kill port process | `git-whoami` | Git identity check |
| `slug-gen` | Unicode slug generator | `ai-commit` | AI commit messages |
| `dotenv-guard` | Prevent env leaks | `port-finder` | Find available port |
| `ghx` | Missing GitHub CLI | `ms-convert` | Time ⇄ milliseconds |
| `cron-explain` | Explain cron expressions | `license-gen` | Generate LICENSE files |
| `json-diff-cli` | JSON diff viewer | `readme-forge` | AI README generator |

## 5. Visual System

### 5.1 Color — "Editorial Mono"

Near-grayscale neutrals + one confident accent. Chosen over "Blueprint" (too literally cool-blue-technical) and "Warm Paper" (distinctive but riskier contrast/legibility). Dark-mode-first, light-mode verified.

| Token | Dark | Light |
|---|---|---|
| `bg` | `#0a0a0a` | `#ffffff` |
| `surface` | `#171717` | `#f5f5f5` |
| `neutral-mid` | `#a1a1a1` | `#525252` |
| `neutral-high` | `#f2f2f2` | `#0a0a0a` |
| `accent` | `#7c6cf6` | `#6d28d9` |
| `success` | `#4ade80` | `#15803d` |
| `warning` | `#f5a524` | `#b45309` |
| `hairline` | `#242424` | `#e5e5e5` |

All pairs must meet WCAG AA contrast; verify programmatically in the generator (not just eyeballed).

### 5.2 Hero — "B2: Spec Header"

Approved composition (see `hero-b-refined.html` mockup, "spec-header" option):

- Top meta bar: left `ENGINEERING PROFILE` (monospace, tracked caps), right `REV {generation-date}` (dynamic, monospace)
- Full-width hairline rule beneath the meta bar
- Asymmetric two-column body, separated by a vertical hairline divider:
  - **Left (narrative):** kicker `SYSTEMS ARCHITECT` (accent color) → large name, tight negative tracking → one-line mission fragment
  - **Right (spec rail):** real metadata as label/value pairs — `FOCUS` / `STACK` / `BASED` — no decorative elements (explicitly replaces the earlier corner-bracket concept, which was rejected as decoration without informational value)
- Bottom hairline rule closes the module

Exact coordinates prototyped at 1200×300 viewBox in the mockup; carry those proportions into the Satori component.

### 5.3 Typography

**Critical technical constraint:** Satori does not run in a browser and has no access to OS/system fonts. `system-ui` / `ui-monospace` (used in the browser mockups for speed) will not resolve inside Satori — real font files must be loaded as buffers at render time.

- **Sans (display/body within SVG):** Inter — closest match to the system-ui look already approved, OFL-licensed
- **Monospace (spec-rail labels, metadata):** JetBrains Mono — OFL-licensed
- **Licensing requirement:** if font files are committed to the repo (e.g. under `assets/fonts/`), their OFL license files must be committed alongside them, and font usage (which weights, where used, license type) must be documented in the repo — e.g. a short `assets/fonts/README.md` or a section in the main build docs. This is a hard requirement, not optional.
- Markdown body text (everything outside the SVGs) uses GitHub's own rendering font — cannot be overridden, and this spec does not attempt to.

### 5.4 Content/visual split (resolves an internal tension from brainstorming)

Two requirements were in tension during brainstorming: "every visual element should be generated through the same rendering pipeline" vs. "Engineering Utilities and Selected Projects must stay individually clickable and searchable." Resolution:

- **Rendered via the shared Satori pipeline (SVG):** Hero, section dividers, the dynamic stat strip (follower/repo counts), and any future decorative/data elements (e.g. timeline blocks)
- **Stays real markdown (text):** Selected Projects (titles, descriptions, repo links), Engineering Utilities table, Mission, Engineering Principles, How I Build Software, Tech Stack, Current Focus, Open Source, Closing

Consistency across the two comes from sharing the same design tokens (color, spacing, type scale) — not from converting everything to images.

## 6. Production Architecture

Full system, chosen over a hand-crafted one-off and over an external live-render endpoint. Repo-local and deterministic — no runtime external service. Rationale: aligns with "prefer battle-tested libraries over hand-rolled solutions," gives flexbox layout instead of manual coordinate math, and matches the "reusable README design system" framing from brainstorming (not a one-off asset drop).

- **`tokens.ts`** — single source of truth for color, spacing, and type scale (both dark and light variants)
- **`components/`** — composable functions returning Satori-compatible element trees: `Hero()`, `SectionDivider()`, `StatStrip()`. Designed so a future component (e.g. a timeline block) can be added without touching existing ones.
- **`scripts/generate.ts`** — fetches live GitHub API data (follower count, public repo count, aggregate stars), combines with tokens + components, renders through Satori, writes SVGs to `/assets/*.svg` (separate dark/light variants)
- **Fonts:** Inter + JetBrains Mono loaded as buffers for Satori (see §5.3)
- **GitHub Action:** triggered on a daily cron and on push to `main`; runs the generator; commits changed SVGs back to the repo only if the diff is non-empty
- **No external rendering service** (rejected: a Vercel-OG-style live endpoint) — keeps the profile self-contained and avoids an outage in an external dependency breaking the profile image

### Dark/light mode delivery

README references generated SVGs via `<picture>` with `prefers-color-scheme` media queries, standard GitHub-supported pattern — no JS required.

## 7. Accessibility & Motion

- `prefers-reduced-motion` respected for any animated SVG content (only if a looping SMIL/CSS animation is used at all — motion must communicate information, never decorate; nothing loops without reason, per the original brief)
- WCAG AA contrast verified for every token pair in §5.1
- Markdown-based sections (the majority of the page) are natively accessible, searchable, and selectable — this was the deciding factor in the hybrid content/visual split in §5.4

## 8. Explicitly Out of Scope

- No Contact section (email/LinkedIn/X) — superseded by the Closing decision in §2
- No invented companies, experience, or metrics anywhere on the page
- No external hosting/rendering dependency
- `you-design`, `siteforge`, `clawforge`, `commit-story`, `claude-dev-team` — not addressed in this iteration (see open question in §3)
