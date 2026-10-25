import {
	APPROACHES,
	CONTRACTORS,
	DAYS_VALUES,
	DIFFICULTIES,
	hasCleared,
	type Approach,
	type Contractor,
	type Heist,
	type HeistDays,
	type PerceivedDifficulty,
	type PlayerProgress,
} from '@pd2/shared';

export type Completion =
	'all' | 'both' | 'either' | 'neither' | `only:${string}`;

export interface FilterState {
	readonly contractor: Contractor | 'all';
	readonly approach: Approach | 'all';
	readonly difficulty: PerceivedDifficulty | 'all';
	readonly days: HeistDays | 'all';
	readonly completion: Completion;
}

/**
 * Narrowing helpers for <select> values.
 *
 * e.target.value is just a string from the DOM. The previous `as` assertions
 * meant any value - a browser extension injecting an option, a stale URL, a
 * renamed contractor - typechecked and went straight into state, where it
 * silently matched nothing and showed an empty table.
 */
const oneOf =
	<T extends string>(allowed: readonly T[]) =>
	(value: string): T | 'all' =>
		(allowed as readonly string[]).includes(value) ? (value as T) : 'all';

export const toContractor = oneOf(CONTRACTORS);
export const toApproach = oneOf(APPROACHES);
export const toDifficulty = oneOf(DIFFICULTIES);

/**
 * Days needs its own narrower: `oneOf` is constrained to `T extends string`,
 * and keeping the state numeric is what lets the predicate stay a same-typed
 * `h.days === f.days` comparison like the other three, rather than coercing
 * with String() at the point of comparison.
 *
 * Matches the string forms rather than going through Number(), which has a
 * trap at every edge: Number('') is 0, Number(' 2 ') is 2, and Number('1e0')
 * is 1 - so a numeric parse accepts spellings no <option> ever emits. Nothing
 * but '1', '2' and '3' survives this.
 */
export const toDays = (value: string): HeistDays | 'all' =>
	DAYS_VALUES.find((d) => String(d) === value) ?? 'all';

/**
 * `only:<steamId>` is only meaningful while that player is still configured.
 * If PD2_PLAYERS changes, a stale value would match zero rows while the
 * <select> displayed "All" - the table empty for no visible reason.
 */
export function toCompletion(
	value: string,
	players: readonly PlayerProgress[],
): Completion {
	if (
		value === 'all' ||
		value === 'both' ||
		value === 'either' ||
		value === 'neither'
	) {
		return value;
	}
	if (value.startsWith('only:')) {
		const steamId = value.slice('only:'.length);
		if (steamId && players.some((p) => p.steamId === steamId)) {
			return `only:${steamId}`;
		}
	}
	return 'all';
}

export const INITIAL_FILTERS: FilterState = {
	contractor: 'all',
	approach: 'all',
	difficulty: 'all',
	days: 'all',
	completion: 'all',
};

// Goes through hasCleared rather than reaching into `unlocked`, so a player
// whose read failed can never be counted as having cleared something. The
// completion filters below treat "unknown" as "not cleared" deliberately -
// the distinction is surfaced in the UI, not here.
const done = (player: PlayerProgress, heist: Heist) =>
	hasCleared(player, heist.id);

export function matchesCompletion(
	heist: Heist,
	players: readonly PlayerProgress[],
	completion: Completion,
): boolean {
	if (completion === 'all') return true;

	const cleared = players.filter((p) => done(p, heist));

	if (completion === 'both') return cleared.length === players.length;
	if (completion === 'either') return cleared.length > 0;
	if (completion === 'neither') return cleared.length === 0;

	// only:<steamId> - that player has it and nobody else does
	const steamId = completion.slice('only:'.length);
	return cleared.length === 1 && cleared[0]?.steamId === steamId;
}

export function applyFilters(
	catalog: readonly Heist[],
	players: readonly PlayerProgress[],
	f: FilterState,
): readonly Heist[] {
	return catalog.filter(
		(h) =>
			(f.contractor === 'all' || h.contractor === f.contractor) &&
			(f.approach === 'all' || h.approach === f.approach) &&
			(f.difficulty === 'all' || h.perceivedDifficulty === f.difficulty) &&
			(f.days === 'all' || h.days === f.days) &&
			matchesCompletion(h, players, f.completion),
	);
}
