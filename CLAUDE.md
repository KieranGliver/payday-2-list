# Working in this repo

Read [`README.md`](README.md) for what the project is and
[`infra/README.md`](infra/README.md) for the AWS side. This file is the things
that are not obvious from the code, and that cost real time to discover.

## Before you push

```bash
npm test && npm run typecheck && npm run lint && npm run format:check
```

CI runs exactly these plus both builds and a catalog-freshness check. `master`
is protected: work on a branch and open a PR.

## Never hand-edit

- `packages/shared/src/generated/steam.ts` — run `npm run sync:steam`. It is in
  `.prettierignore` and ESLint's ignores on purpose: formatting it would make
  the next regeneration produce a spurious diff, and CI checks the committed
  file still matches the generator's output.
- `packages/web/src/components/ui/**` — the shadcn CLI regenerates these in its
  own style. Also ignored by both tools.

## Traps

**ESLint 10 vs the React plugins.** `eslint-plugin-react` and
`eslint-plugin-jsx-a11y` cap their peer range at ESLint 9; this repo is on 10.
`npm overrides` in `package.json` scope that exception to those two packages —
do not replace it with repo-wide `legacy-peer-deps`, which disables peer
checking everywhere and leaves the tree unable to resolve later installs.

**`settings.react.version` must not be `'detect'`.** On ESLint 10 the plugin's
auto-detection crashes every lint run with
`contextOrFilename.getFilename is not a function`. The config reads the version
out of `react/package.json` instead, which avoids both the crash and going
stale on a React upgrade.

**The shadcn `@` alias must be declared in two files.** `tsconfig.json` _and_
`tsconfig.app.json`. The CLI reads the former, the compiler the latter. With it
missing from `tsconfig.json`, `shadcn add` silently writes components into a
literal `@/` directory. `baseUrl` is required for the same reason even though
TypeScript 6 deprecates it — hence `ignoreDeprecations`.

**A `"//"` key is rejected inside `compilerOptions`.** tsconfig validates those
keys. Comments there must be real JSONC comments.

**Relative imports in `shared` and `api` need explicit `.js` extensions.**
`packages/web/tsconfig.node.json` typechecks `vite.config.ts` under `nodenext`,
which reaches into both packages and requires them.

**`erasableSyntaxOnly` is on.** No constructor parameter properties, no enums.

**Zod goes at boundaries only** — Steam's response, the API contract,
`PD2_PLAYERS`, DOM input. Not on `CATALOG`/`RATINGS`: those are exhaustive at
compile time and validating them again just costs bundle.

## Things that have silently broken before

Each of these shipped output that was wrong but perfectly parseable. All are
now covered by tests in `scripts/lib/parse.test.mjs` and
`packages/shared/src/catalog.test.ts`.

- **`NaN` passes a range check.** Every comparison with `NaN` is false, so
  `n < 0 || n > 100` lets it through. Use `Number.isFinite`.
- **`Number('')` is `0`, not `NaN`.** An empty percentage coerces to a
  genuine-looking `0.0%`, and `0.00%` is a real value here (Under the Hammer),
  so it is undetectable.
- **Steam phrases "One Down" three different ways.** Matching an exact phrase
  silently dropped a heist. The filter requires both "Death Sentence" and
  "One Down".
- **"The Diamond" and "Diamond Heist" are different heists.** Stripping the
  word "Heist" as well as "job" collapses them into one.
- **Five heist names contain an apostrophe.** A blunt
  `JSON.stringify().replace('"', "'")` turns `Breakin' Feds` into an
  unterminated literal and breaks the whole generated catalog.

## Conventions

Prettier with **tabs**, 80 columns, single quotes, one JSX attribute per line.
Run `npm run format`.

Comments should say **why**, not what — especially where the code looks odd
because of one of the traps above. Most comments in this repo exist to stop
someone "fixing" something back into a bug.

Completion data always comes from Steam. "Unknown" is a distinct state from
"not cleared", and the two must never be conflated — conflating them silently
reported a private profile as zero progress.
