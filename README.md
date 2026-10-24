# Payday 2 — One Down tracker

Tracks two players' progress toward clearing every Payday 2 heist on One Down,
read live from Steam achievements.

**Live:** https://d2w66v72qyi29x.cloudfront.net/

Replaces a spreadsheet that had drifted out of date. Nothing is ticked off by
hand — completion comes from Steam, so it cannot be wrong or stale.

## How it works

```
browser ──► CloudFront ──┬── /*      ──► S3            (the SPA + catalog, bundled)
                         └── /api/*  ──► Lambda ──► Steam Web API
```

The **catalog** — 86 heists and 12 whole-contractor achievements — is static
data compiled into both bundles. The **API** only answers "what have these two
players unlocked", which keeps the payload at about 1.4 kB.

There is **no database**. Steam's `GetPlayerAchievements` returns `unlocktime`
per achievement and keeps it forever, so completion history is re-derivable
from a single call. There is nothing to persist.

## Quick start

```bash
npm ci
cp packages/web/.env.example packages/web/.env.local   # then fill in your key
npm run dev                                            # localhost:5173
```

You need a [Steam Web API key](https://steamcommunity.com/dev/apikey), and both
players' **Privacy Settings → Game details** must be **Public** — otherwise
Steam returns an error rather than an empty list.

`npm run dev` serves the real API locally through a Vite middleware that calls
the _same_ handler the Lambda runs, so there is no mock to drift out of sync
and no deploy needed to work on the API.

## Scripts

|                           |                                                 |
| ------------------------- | ----------------------------------------------- |
| `npm run dev`             | Vite dev server, with the API served in-process |
| `npm test`                | 147 tests (`test:watch` to iterate)             |
| `npm run typecheck`       | all three packages                              |
| `npm run lint` / `format` | ESLint / Prettier across the repo               |
| `npm run build`           | the SPA                                         |
| `npm run sync:steam`      | regenerate the catalog from Steam               |

## Layout

```
packages/shared   catalog, the client/server contract, badge logic
packages/api      the Lambda: Steam client, pure getProgress, adapter
packages/web      the SPA
scripts           the catalog generator and its pure parsing helpers
infra/            notes on the hand-built AWS resources — see infra/README.md
```

`packages/shared` is the single source of truth for anything both halves need:
the schemas, the heist catalog and the `PD2_PLAYERS` parser all live there so
the Lambda and the dev middleware cannot disagree.

## The catalog

`npm run sync:steam` rebuilds `packages/shared/src/generated/steam.ts` from
Steam. It works with or without an API key — with one it uses
`GetSchemaForGame`, without it parses the public achievements page, and both
produce byte-identical output.

Data is split by **provenance**:

- `generated/steam.ts` — Steam's facts. Rewritten by the generator; never edit.
- `curated/ratings.ts` — our judgements: contractor, approach, perceived
  difficulty. Never touched by the generator.
- `curated/badges.ts` — display labels for the 12 meta achievements.

Both curated files are typed `Record<HeistId, …>`, so a heist added to Steam
**breaks the build** until it is rated, and a typo'd id or value is a compile
error.

The generator refuses to write if anything looks wrong — too few heists,
duplicate ids or names, a non-finite percentage, a malformed icon hash — so a
bad run leaves the committed catalog untouched rather than silently clobbering
it.

## Design notes

**Validation lives at the boundaries.** Steam's response, the API contract,
`PD2_PLAYERS` and DOM input are all parsed with zod. Static internal data is
not: it is already exhaustive at compile time, and re-checking it at runtime
would cost bundle to prove what the compiler proved.

**"Unknown" is not "zero".** A player whose profile cannot be read returns a
`failed` variant, not a zero count. Conflating the two silently drove the
headline figure to 0 whenever one profile was private.

**Badges come from Steam, not from our own arithmetic.** A contractor badge
lights because Steam awarded the meta achievement, never because we counted
the heists we assign to that contractor. When the two disagree, the badge says
so — that means a heist is in the wrong contractor, and we would rather see it
than hide it.

## Deploying

Push to `master`. CI runs typecheck, lint, format, tests, both builds and a
catalog-freshness check; only if it passes does the deploy workflow run, which
syncs the SPA to S3 and updates the Lambda. `master` is protected and requires
a PR with CI green.

AWS access uses GitHub OIDC — there are no long-lived credentials anywhere.
See [`infra/README.md`](infra/README.md) for the resources and how to rebuild
them.
