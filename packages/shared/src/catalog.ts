import { STEAM_HEISTS, type HeistId } from './generated/steam.js';
import { DAYS } from './curated/days.js';
import { RATINGS } from './curated/ratings.js';
import { DAYS_VALUES, type Heist } from './types.js';

/**
 * Every One Down heist, with Steam's facts and our judgements joined on id.
 *
 * Ordered by heist name, matching the generated file.
 */
export const CATALOG = STEAM_HEISTS.map((heist) => ({
	...heist,
	...RATINGS[heist.id],
	days: DAYS[heist.id],
}));

/** Lookup by Steam achievement id. */
export const BY_ID: ReadonlyMap<HeistId, Heist> = new Map(
	CATALOG.map((h) => [h.id, h]),
);

// Invariants types can't express. Cheap, and runs once at import.
if (BY_ID.size !== CATALOG.length) {
	throw new Error('catalog contains duplicate heist ids');
}
for (const h of CATALOG) {
	// Number.isFinite, not a range comparison: NaN passes BOTH `< 0` and
	// `> 100` because every comparison with NaN is false, so a NaN percentage
	// would sail through a range check, compile, deploy, and render "NaN%".
	if (!Number.isFinite(h.globalPct) || h.globalPct < 0 || h.globalPct > 100) {
		throw new Error(`${h.id}: globalPct is not a percentage (${h.globalPct})`);
	}
	// Record<HeistId, HeistDays> makes a missing or mistyped entry a compile
	// error, but not a stale one left behind by a hand edit mid-rename.
	if (!(DAYS_VALUES as readonly number[]).includes(h.days)) {
		throw new Error(`${h.id}: days is not 1, 2 or 3 (${String(h.days)})`);
	}
}
