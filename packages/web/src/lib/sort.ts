import {
	unlockedAt,
	type Heist,
	type PerceivedDifficulty,
	type PlayerProgress,
} from '@pd2/shared';

export type SortKey =
	| 'heist'
	| 'contractor'
	| 'approach'
	| 'difficulty'
	| 'days'
	| 'globalPct'
	| `player:${string}`;

export interface SortState {
	readonly key: SortKey;
	readonly desc: boolean;
}

/** Contractor, then heist name - the spreadsheet's original order. */
export const INITIAL_SORT: SortState = { key: 'contractor', desc: false };

/**
 * Severity order, declared here rather than inferred from the position of
 * values in the DIFFICULTIES array. That array is a display list and nothing
 * marks its order as meaningful, so reordering it for the filter dropdown
 * would silently change how this column sorts.
 */
const DIFFICULTY_RANK: Record<PerceivedDifficulty, number> = {
	EASY: 0,
	MEDIUM: 1,
	HARD: 2,
};

const difficultyRank = (h: Heist) => DIFFICULTY_RANK[h.perceivedDifficulty];

function value(
	heist: Heist,
	key: SortKey,
	players: readonly PlayerProgress[],
): string | number {
	switch (key) {
		case 'heist':
			return heist.heist;
		case 'contractor':
			return heist.contractor;
		case 'approach':
			return heist.approach;
		case 'difficulty':
			return difficultyRank(heist);
		// An explicit case, not a fall-through: the default arm reads the key as
		// `player:<steamId>` and would slice 'days' into a steamId lookup.
		case 'days':
			return heist.days;
		case 'globalPct':
			return heist.globalPct;
		default: {
			const steamId = key.slice('player:'.length);
			const player = players.find((p) => p.steamId === steamId);
			// Unlock time doubles as the sort value, so a player column orders by
			// when each heist was cleared. Uncleared - and unknown, for a player
			// whose read failed - both sort last.
			return player ? (unlockedAt(player, heist.id) ?? -1) : -1;
		}
	}
}

export function sortHeists(
	heists: readonly Heist[],
	sort: SortState,
	players: readonly PlayerProgress[],
): readonly Heist[] {
	const dir = sort.desc ? -1 : 1;
	return [...heists].sort((a, b) => {
		const av = value(a, sort.key, players);
		const bv = value(b, sort.key, players);
		const cmp =
			typeof av === 'number' && typeof bv === 'number'
				? av - bv
				: String(av).localeCompare(String(bv));
		// Heist name is always the tiebreaker, so equal keys stay stable and
		// readable rather than falling back to catalog order.
		return cmp !== 0 ? cmp * dir : a.heist.localeCompare(b.heist);
	});
}
