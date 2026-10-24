/**
 * The whole-contractor achievements, as a display model.
 *
 * Earned status comes from Steam's own meta achievement, NOT from counting the
 * heists we think belong to that contractor. The two can disagree, and when
 * they do it means our contractor mapping is wrong - so the disagreement is
 * reported rather than hidden.
 */
import { BADGE_LABELS } from './curated/badges.js';
import { META_ACHIEVEMENTS } from './generated/steam.js';
import { CATALOG } from './catalog.js';
import { hasCleared, okPlayers, type PlayerProgress } from './api.js';

export interface Badge {
	readonly id: string;
	readonly label: string;
	readonly achievement: string;
	readonly globalPct: number;
	readonly icon: string;
	readonly iconGray: string;
	/** Steam says every player has this. The only thing that lights the badge. */
	readonly earned: boolean;
	/** At least one player's data could not be read, so `earned` is not trustworthy. */
	readonly unknown: boolean;
	/**
	 * Set when Steam disagrees with our own heist list for this contractor.
	 *
	 * Steam awarding the achievement while our table shows heists outstanding
	 * means we have mis-assigned a heist, or are missing one. The reverse means
	 * we have assigned a heist to this contractor that does not belong to it.
	 */
	readonly mismatch: 'steam-says-done' | 'we-say-done' | null;
	/**
	 * How far along this set is according to OUR catalog: heists both players
	 * have cleared, out of the heists we assign to this contractor.
	 *
	 * Informational only - it never decides `earned`. Shown so a locked badge
	 * says how close it is rather than just being grey.
	 */
	readonly done: number;
	readonly of: number;
}

/** Resolves each badge against the current player data. */
export function resolveBadges(
	players: readonly PlayerProgress[],
): readonly Badge[] {
	const ok = okPlayers(players);
	const anyUnreadable = players.length !== ok.length;

	return META_ACHIEVEMENTS.map((m) => {
		const { label, contractor } = BADGE_LABELS[m.id];

		// Both players must have it. With nobody readable, nothing is earned.
		const earned = ok.length > 0 && ok.every((p) => hasCleared(p, m.id));

		// What OUR catalog thinks, for comparison only.
		const ours =
			contractor === null
				? CATALOG
				: CATALOG.filter((h) => h.contractor === contractor);
		const weSayDone =
			ok.length > 0 &&
			ours.length > 0 &&
			ours.every((h) => ok.every((p) => hasCleared(p, h.id)));

		let mismatch: Badge['mismatch'] = null;
		if (!anyUnreadable && ok.length > 0) {
			if (earned && !weSayDone) mismatch = 'steam-says-done';
			else if (!earned && weSayDone) mismatch = 'we-say-done';
		}

		const done = ours.filter((h) =>
			ok.length > 0 ? ok.every((p) => hasCleared(p, h.id)) : false,
		).length;

		return {
			id: m.id,
			label,
			achievement: m.achievement,
			globalPct: m.globalPct,
			icon: m.icon,
			iconGray: m.iconGray,
			earned,
			unknown: anyUnreadable,
			mismatch,
			done,
			of: ours.length,
		};
	});
}

/** How many badges both players hold, out of how many exist. */
export function badgeTally(badges: readonly Badge[]) {
	return {
		earned: badges.filter((b) => b.earned).length,
		total: badges.length,
	};
}
