import { STEAM_HEISTS, type HeistId } from './generated/steam.js';
import { RATINGS } from './curated/ratings.js';
import type { Heist } from './types.js';

/**
 * Every One Down heist, with Steam's facts and our judgements joined on id.
 *
 * Ordered by heist name, matching the generated file.
 */
export const CATALOG: readonly Heist[] = STEAM_HEISTS.map((heist) => ({
	...heist,
	...RATINGS[heist.id],
}));

/** Lookup by Steam achievement id. */
export const BY_ID: ReadonlyMap<HeistId, Heist> = new Map(
	CATALOG.map((h) => [h.id as HeistId, h]),
);

// Invariants types can't express. Cheap, and runs once at import.
if (BY_ID.size !== CATALOG.length) {
	throw new Error('catalog contains duplicate heist ids');
}
for (const h of CATALOG) {
	if (h.globalPct < 0 || h.globalPct > 100) {
		throw new Error(`${h.id}: globalPct out of range (${h.globalPct})`);
	}
}
