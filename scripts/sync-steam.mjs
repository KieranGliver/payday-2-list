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
import { readFile, writeFile } from 'node:fs/promises';

import {
	iconHash,
	isMeta,
	isOneDown,
	parseHeistName,
	quote,
	toPercent,
} from './lib/parse.mjs';

const APPID = 218620;
const OUT = new URL(
	'../packages/shared/src/generated/steam.ts',
	import.meta.url,
);
const RATINGS = new URL(
	'../packages/shared/src/curated/ratings.ts',
	import.meta.url,
);

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
		return list.map((a) => ({
			id: a.name,
			achievement: a.displayName,
			description: a.description ?? '',
			icon: iconHash(a.icon),
			iconGray: iconHash(a.icongray),
		}));
	}

	console.log('schema: no STEAM_API_KEY, parsing public community page');
	const res = await fetch(
		`https://steamcommunity.com/stats/${APPID}/achievements/`,
		{
			headers: { 'user-agent': 'Mozilla/5.0' },
		},
	);
	if (!res.ok)
		throw new Error(`${res.status} fetching community achievements page`);
	const html = (await res.text()).replaceAll('\\"', '"');
	const re =
		/\{"internal_key":\d+,"api_name":"(.*?)","name":"(.*?)","description":"(.*?)","hidden":\w+,"archived":\w+,"icon_achieved":"(.*?)","icon_unachieved":"(.*?)"/g;
	const out = [];
	for (const m of html.matchAll(re)) {
		out.push({
			id: m[1],
			achievement: m[2],
			description: m[3],
			icon: iconHash(m[4]),
			iconGray: iconHash(m[5]),
		});
	}
	console.log(`schema: community page -> ${out.length} achievements`);
	return out;
}

/**
 * Smallest believable catalog size.
 *
 * Without a floor, a Steam change that breaks the community-page regex makes
 * fetchSchema return [], every downstream check passes vacuously (the
 * duplicate-id check becomes 0 !== 0), and the committed catalog is
 * overwritten with an empty array while logging "wrote 0 heists" as success.
 */
const MIN_HEISTS = 80;

/** Same reasoning as MIN_HEISTS, for the whole-contractor achievements. */
const MIN_METAS = 10;

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

async function existingRatingIds() {
	try {
		const src = await readFile(RATINGS, 'utf8');
		return new Set([...src.matchAll(/^\t([A-Za-z0-9_]+):/gm)].map((m) => m[1]));
	} catch {
		return null;
	}
}

const schema = await fetchSchema();
const pct = await fetchGlobalPct();

const heists = [];
const metas = [];
for (const a of schema) {
	if (!isOneDown(a.description)) continue;
	const heist = parseHeistName(a.description);
	if (!heist)
		throw new Error(`could not parse heist name from: ${a.description}`);
	if (isMeta(heist)) {
		// The whole-contractor achievements. Kept rather than discarded: they
		// are Steam's own verdict on whether a set is complete, which is a
		// stronger signal than counting the heists WE think belong to it.
		const metaPct = toPercent(pct[a.id]);
		if (metaPct === null) {
			throw new Error(`global percentage for ${a.id} is not a percentage`);
		}
		if (!a.icon || !a.iconGray) {
			throw new Error(`missing icon hash for ${a.id}`);
		}
		metas.push({
			id: a.id,
			achievement: a.achievement,
			// "all of Vlad's contracts" / "all Classic contracts" / "all contracts"
			scope: heist,
			globalPct: metaPct,
			icon: a.icon,
			iconGray: a.iconGray,
		});
		continue;
	}
	if (!(a.id in pct)) throw new Error(`no global percentage for ${a.id}`);
	if (!a.icon || !a.iconGray) throw new Error(`missing icon hash for ${a.id}`);

	const percent = toPercent(pct[a.id]);
	if (percent === null) {
		throw new Error(
			`global percentage for ${a.id} is not a percentage: ${pct[a.id]}`,
		);
	}

	heists.push({
		id: a.id,
		heist,
		achievement: a.achievement,
		globalPct: percent,
		icon: a.icon,
		iconGray: a.iconGray,
	});
}

// Pinned locale: the default depends on the build machine's ICU data, so row
// order - and therefore the member order of the HeistId union, and the diff -
// could differ between machines.
heists.sort((a, b) => a.heist.localeCompare(b.heist, 'en'));

// Everything below must run BEFORE writeFile. These checks previously ran
// after, or not at all, so bad output reached disk and was only caught - if at
// all - by a later compile.
if (heists.length < MIN_HEISTS) {
	throw new Error(
		`only ${heists.length} heists found, expected at least ${MIN_HEISTS} - ` +
			'refusing to overwrite the catalog. The upstream format has probably changed.',
	);
}

const ids = new Set(heists.map((h) => h.id));
if (ids.size !== heists.length) throw new Error('duplicate achievement ids');

const names = new Set(heists.map((h) => h.heist));
if (names.size !== heists.length) {
	// Two rows with the same display name sort nondeterministically, because the
	// tiebreaker in the UI is the name itself.
	throw new Error('two heists parsed to the same display name');
}

for (const h of heists) {
	if (!/^[0-9a-f]{40}$/.test(h.icon) || !/^[0-9a-f]{40}$/.test(h.iconGray)) {
		throw new Error(`${h.id}: icon hash is not 40 hex characters`);
	}
}

const zeroed = heists.filter((h) => h.globalPct === 0);

// Emitted stacked and tab-indented to match curated/ratings.ts. Prettier is
// configured with objectWrap "preserve", so a stacked object stays stacked -
// but this file is in .prettierignore anyway, to keep regeneration a no-op.
const rows = heists
	.map((h) =>
		[
			'\t{',
			`\t\tid: ${quote(h.id)},`,
			`\t\theist: ${quote(h.heist)},`,
			`\t\tachievement: ${quote(h.achievement)},`,
			`\t\tglobalPct: ${h.globalPct},`,
			`\t\ticon: ${quote(h.icon)},`,
			`\t\ticonGray: ${quote(h.iconGray)},`,
			'\t},',
		].join('\n'),
	)
	.join('\n');

metas.sort((a, b) => a.scope.localeCompare(b.scope, 'en'));
if (metas.length < MIN_METAS) {
	throw new Error(
		`only ${metas.length} meta achievements found, expected at least ${MIN_METAS}`,
	);
}

const metaRows = metas
	.map((m) =>
		[
			'\t{',
			`\t\tid: ${quote(m.id)},`,
			`\t\tachievement: ${quote(m.achievement)},`,
			`\t\tscope: ${quote(m.scope)},`,
			`\t\tglobalPct: ${m.globalPct},`,
			`\t\ticon: ${quote(m.icon)},`,
			`\t\ticonGray: ${quote(m.iconGray)},`,
			'\t},',
		].join('\n'),
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
import type { MetaAchievement, SteamHeist } from '../types.js';

export const STEAM_HEISTS = [
${rows}
] as const satisfies readonly SteamHeist[];

/** Literal union of every known heist id. */
export type HeistId = (typeof STEAM_HEISTS)[number]['id'];

/**
 * "Complete all of X's contracts" achievements.
 *
 * Steam's own verdict on whether a contractor's set is finished, which is why
 * they are tracked separately from the per-heist achievements rather than
 * computed from them.
 */
export const META_ACHIEVEMENTS = [
${metaRows}
] as const satisfies readonly MetaAchievement[];

export type MetaId = (typeof META_ACHIEVEMENTS)[number]['id'];
`,
);

console.log(
	`\nwrote ${heists.length} heists -> ${OUT.pathname.split('/').slice(-4).join('/')}`,
);
console.log(`wrote ${metas.length} meta achievements (whole-contractor sets)`);
if (zeroed.length)
	console.log(
		`at 0.00% global unlock: ${zeroed.map((h) => h.heist).join(', ')}`,
	);

const prev = await existingRatingIds();
if (prev) {
	const added = [...ids].filter((i) => !prev.has(i));
	const removed = [...prev].filter((i) => !ids.has(i));
	if (added.length)
		console.log(
			`\nNEW heists needing a rating in curated/ratings.ts: ${added.join(', ')}`,
		);
	if (removed.length)
		console.log(
			`\nheists no longer in Steam, remove from ratings.ts: ${removed.join(', ')}`,
		);
	if (!added.length && !removed.length)
		console.log('\nratings.ts is in sync - no action needed');
}
