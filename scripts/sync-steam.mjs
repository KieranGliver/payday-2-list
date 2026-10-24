#!/usr/bin/env node
/**
 * Regenerates packages/shared/src/generated/steam.ts from Steam.
 *
 * Reads the Payday 2 achievement schema and the global unlock percentages,
 * keeps only the per-heist "One Down" achievements, and writes them out as a
 * typed TypeScript module.
 *
 * Never touches curated/ratings.ts — contractor, approach and perceived
 * difficulty are hand-maintained and must survive regeneration.
 *
 *   node scripts/sync-steam.mjs
 *
 * Uses the official GetSchemaForGame endpoint when STEAM_API_KEY is set,
 * otherwise falls back to parsing the public community achievements page.
 */
import { writeFile, readFile } from 'node:fs/promises';

const APPID = 218620;
const OUT = new URL('../packages/shared/src/generated/steam.ts', import.meta.url);
const RATINGS = new URL('../packages/shared/src/curated/ratings.ts', import.meta.url);

/**
 * Marks a One Down achievement.
 *
 * Steam uses at least three phrasings ("with the One Down mechanic activated",
 * the same plus a mask unlock note, and "with One Down active"), so matching an
 * exact phrase silently drops heists. Requiring both keywords is stable: of
 * 1342 achievements, 98 mention "One Down" and all 98 also mention "Death
 * Sentence", while 98 others mention Death Sentence alone (the plain difficulty
 * tier, correctly excluded) and none mention One Down alone.
 */
const isOneDown = (description) =>
  description.includes('Death Sentence') && description.includes('One Down');

/** Achievements for completing a whole contractor's set, not a single heist. */
const isMeta = (name) => name.startsWith('all ');

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

/** [{ id, achievement, description }] */
async function fetchSchema() {
  const key = process.env.STEAM_API_KEY;
  if (key) {
    const url = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${key}&appid=${APPID}`;
    const data = await fetchJson(url);
    const list = data?.game?.availableGameStats?.achievements ?? [];
    console.log(`schema: GetSchemaForGame -> ${list.length} achievements`);
    return list.map((a) => ({ id: a.name, achievement: a.displayName, description: a.description ?? '' }));
  }

  console.log('schema: no STEAM_API_KEY, parsing public community page');
  const res = await fetch(`https://steamcommunity.com/stats/${APPID}/achievements/`, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`${res.status} fetching community achievements page`);
  const html = (await res.text()).replaceAll('\\"', '"');
  const re = /\{"internal_key":\d+,"api_name":"(.*?)","name":"(.*?)","description":"(.*?)"/g;
  const out = [];
  for (const m of html.matchAll(re)) out.push({ id: m[1], achievement: m[2], description: m[3] });
  console.log(`schema: community page -> ${out.length} achievements`);
  return out;
}

/** { [api_name]: percent } */
async function fetchGlobalPct() {
  const url = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${APPID}`;
  const data = await fetchJson(url);
  const list = data?.achievementpercentages?.achievements ?? [];
  console.log(`global percentages: ${list.length} achievements`);
  return Object.fromEntries(list.map((a) => [a.name, Number(a.percent)]));
}

/**
 * "Complete the Aftershock job on the Death Sentence difficulty..." -> "Aftershock"
 *
 * Strips a lowercase leading "the " and a trailing " job", which keeps the two
 * genuinely different heists distinguishable: "The Diamond" (Dentist) vs
 * "Diamond Heist" (Classic). Both would collapse to "Diamond" if the word
 * "Heist" were stripped too.
 */
function parseHeistName(description) {
  const m = /^Complete (.+?) on the Death Sentence/i.exec(description.trim());
  if (!m) return null;
  return m[1].replace(/^the /, '').replace(/ job$/, '').trim();
}

async function existingRatingIds() {
  try {
    const src = await readFile(RATINGS, 'utf8');
    return new Set([...src.matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((m) => m[1]));
  } catch {
    return null;
  }
}

const schema = await fetchSchema();
const pct = await fetchGlobalPct();

const heists = [];
const skippedMeta = [];
for (const a of schema) {
  if (!isOneDown(a.description)) continue;
  const heist = parseHeistName(a.description);
  if (!heist) throw new Error(`could not parse heist name from: ${a.description}`);
  if (isMeta(heist)) { skippedMeta.push(heist); continue; }
  if (!(a.id in pct)) throw new Error(`no global percentage for ${a.id}`);
  heists.push({ id: a.id, heist, achievement: a.achievement, globalPct: pct[a.id] });
}

heists.sort((a, b) => a.heist.localeCompare(b.heist));

const ids = new Set(heists.map((h) => h.id));
if (ids.size !== heists.length) throw new Error('duplicate achievement ids');

const zeroed = heists.filter((h) => h.globalPct === 0);

const rows = heists
  .map(
    (h) =>
      `  { id: ${JSON.stringify(h.id)}, heist: ${JSON.stringify(h.heist)}, achievement: ${JSON.stringify(h.achievement)}, globalPct: ${h.globalPct} },`,
  )
  .join('\n');

const banner = `// GENERATED FILE - DO NOT EDIT.
// Regenerate with: npm run sync:steam
// Source: Steam achievement schema + global unlock percentages for appid ${APPID}.
// Curated fields (contractor, approach, perceived difficulty) live in
// ../curated/ratings.ts and are never written by the generator.
`;

await writeFile(
  OUT,
  `${banner}
import type { SteamHeist } from '../types.js';

export const STEAM_HEISTS = [
${rows}
] as const satisfies readonly SteamHeist[];

/** Literal union of every known heist id. */
export type HeistId = (typeof STEAM_HEISTS)[number]['id'];
`,
);

console.log(`\nwrote ${heists.length} heists -> ${OUT.pathname.split('/').slice(-4).join('/')}`);
console.log(`skipped ${skippedMeta.length} meta achievements (whole-contractor sets)`);
if (zeroed.length) console.log(`at 0.00% global unlock: ${zeroed.map((h) => h.heist).join(', ')}`);

const prev = await existingRatingIds();
if (prev) {
  const added = [...ids].filter((i) => !prev.has(i));
  const removed = [...prev].filter((i) => !ids.has(i));
  if (added.length) console.log(`\nNEW heists needing a rating in curated/ratings.ts: ${added.join(', ')}`);
  if (removed.length) console.log(`\nheists no longer in Steam, remove from ratings.ts: ${removed.join(', ')}`);
  if (!added.length && !removed.length) console.log('\nratings.ts is in sync - no action needed');
}
