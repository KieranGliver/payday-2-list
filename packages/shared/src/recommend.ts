/**
 * What should we play right now.
 *
 * Scores every heist the pair have not both cleared, and returns the best few.
 * Pure: give it the catalog, the badges and the player data and it returns the
 * same answer every time, which is what makes the formula testable.
 *
 * Each term is normalised to 0-1 and then weighted, so a weight is directly
 * comparable to every other weight. The breakdown is returned alongside the
 * total because an opaque score is neither reviewable nor explainable to the
 * person reading the recommendation.
 */
import {
	hasCleared,
	ladderRung,
	okPlayers,
	type PlayerProgress,
} from './api.js';
import type { Badge } from './badges.js';
import { LADDER_PCT } from './generated/ladder.js';
import { LADDER_RUNGS, type Heist, type HeistDays } from './types.js';

/** The five things that decide the score. */
export interface Factors {
	/** How many people complete this heist on One Down. Higher is easier. */
	readonly rarity: number;
	/** How far up the difficulty ladder the pair already are. */
	readonly closeness: number;
	/** Our own difficulty call, inverted so easier scores higher. */
	readonly ease: number;
	/**
	 * How close this heist's contractor badge is, scored on the number of
	 * heists LEFT rather than the fraction done.
	 *
	 * The fraction got this backwards on the real data: The Continental sat at
	 * 1/2 and scored 0.50 while Bain sat at 11/20 and scored 0.55, so the
	 * contractor nine heists away outranked the one a single heist away. What
	 * the term is for is finishing a set, and that is `1 / remaining`.
	 */
	readonly proximity: number;
	/** Shorter heists score higher. */
	readonly brevity: number;
}

/**
 * Weights, in one place so the formula can be retuned without touching it.
 *
 * Global completion is deliberately weighted the same as the rest. It carries
 * a known bias - a heist released late in Payday 2's life has a lower
 * completion percentage for reasons that have nothing to do with difficulty -
 * and that limitation is accepted rather than corrected, because every
 * available correction introduces a worse bias of its own.
 *
 * Brevity is the one term at less than full weight: length should nudge the
 * order, not decide it, so a strong three-day candidate can still beat a
 * mediocre one-day one.
 */
export const WEIGHTS: Factors = {
	rarity: 1,
	closeness: 1,
	ease: 1,
	proximity: 1,
	brevity: 0.5,
};

const EASE: Record<Heist['perceivedDifficulty'], number> = {
	EASY: 1,
	MEDIUM: 0.5,
	HARD: 0,
};

const BREVITY: Record<HeistDays, number> = {
	1: 1,
	2: 0.5,
	3: 0,
};

export interface Recommendation {
	readonly heist: Heist;
	readonly score: number;
	readonly factors: Factors;
	/** Weight times value, for explaining which terms actually drove the score. */
	readonly contributions: Factors;
	/**
	 * True when a player's data could not be read, so `closeness` is based on
	 * fewer players than it should be. Never silently folded into the score.
	 */
	readonly partial: boolean;
	/**
	 * The rung both players have reached, 1-7 into LADDER_RUNGS, or 0 for
	 * none. `undefined` means unknown, which is not the same as 0 - so the UI
	 * can name the difficulty we got to rather than describing a score.
	 */
	readonly rung: number | undefined;
	/**
	 * Heists left before this contractor's badge is earned, or null when there
	 * is no badge to earn. Lets the reason say "2 left to finish Vlad" instead
	 * of quoting a fraction, and is what the proximity term is scored on.
	 */
	readonly contractorLeft: number | null;
}

/**
 * How global completion percentage is mapped onto 0-1.
 *
 * `minmax` keeps the raw shape: the distance between two heists in the score
 * matches the distance between their percentages. `rank` spreads them evenly
 * instead. They differ because the percentages cluster hard - a large group of
 * heists sits within a few tenths of a percent of each other - so under
 * `minmax` the term is nearly flat across the middle of the catalog and the
 * extremes decide everything.
 */
export type RarityScale = 'minmax' | 'rank';

/**
 * Discounts a One Down percentage by how many people played the heist at all.
 *
 * A heist's One Down percentage is measured against EVERY owner of the game,
 * so it mostly reflects how many people ever touched that heist rather than
 * how hard it is: across the catalog the One Down figure tracks the Normal
 * figure at r = 0.93 on a log scale. A launch heist had twelve years and the
 * game's whole casual population to accumulate completions; a late DLC heist
 * had neither.
 *
 * So a completion is worth less the more of that casual population was around
 * for it. Jewelry Store, which 33.8% of owners have beaten on Normal, keeps
 * 8.8% x (1 - 0.338) = 5.8%. A heist only 1% of owners ever played keeps
 * essentially all of its figure.
 *
 * This deliberately only nudges. The multiplier spans x0.66 to x0.999 across
 * the real catalog, so a heist with a genuinely high completion rate stays
 * near the top - the correction reorders the middle, it does not invert the
 * scale.
 *
 * Returns the figure unchanged when the heist has no ladder data, which is
 * what happens for a heist absent from `generated/ladder.ts`. No information
 * means no discount, never a silent zero.
 */
function discounted(heist: Heist): number {
	const rungs = LADDER_PCT[heist.id as keyof typeof LADDER_PCT] as
		readonly number[] | undefined;
	const playedOnNormal = rungs?.[0];
	if (playedOnNormal === undefined || !Number.isFinite(playedOnNormal)) {
		return heist.globalPct;
	}
	return heist.globalPct * (1 - playedOnNormal / 100);
}

/**
 * Maps each heist id to a 0-1 rarity, higher meaning more people complete it.
 *
 * Built across the WHOLE catalog, not just the candidates, so the scale does
 * not shift as heists are completed and drop out of the running.
 */
function rarityScale(
	catalog: readonly Heist[],
	scale: RarityScale,
): ReadonlyMap<string, number> {
	const value = new Map(catalog.map((h) => [h.id, discounted(h)] as const));

	if (scale === 'rank') {
		const ordered = [...catalog].sort(
			(a, b) => value.get(a.id)! - value.get(b.id)!,
		);
		const last = ordered.length - 1;
		return new Map(
			ordered.map((h, i) => [h.id, last === 0 ? 0.5 : i / last] as const),
		);
	}

	const pcts = [...value.values()];
	const lo = Math.min(...pcts);
	const hi = Math.max(...pcts);
	// Every heist identical: no information, so no opinion.
	const span = hi - lo;
	return new Map(
		catalog.map((h) => [
			h.id,
			span === 0 ? 0.5 : (value.get(h.id)! - lo) / span,
		]),
	);
}

/**
 * The highest rung BOTH players have reached, or undefined if nobody's data
 * could be read.
 *
 * The MINIMUM across players, not the average: a heist one of us has cleared
 * on Death Wish and the other has never loaded is not a heist we are nearly
 * done with. A player whose read failed is left out of the minimum entirely
 * rather than counted as rung 0 - unknown is not zero, and treating it as zero
 * would drag every heist's closeness down whenever a profile goes private.
 */
function sharedRung(
	players: readonly PlayerProgress[],
	heistId: string,
): number | undefined {
	const rungs = players
		.map((p) => ladderRung(p, heistId))
		.filter((r): r is number => r !== undefined);

	return rungs.length === 0 ? undefined : Math.min(...rungs);
}

/**
 * How close this heist's contractor badge is, as 0-1.
 *
 * Zero once the badge is earned - there is no badge left to win, so it should
 * stop pulling its heists up the list. Also zero for the four contractors
 * Overkill never shipped a meta achievement for (Jiu Feng, Gemma McShay,
 * Blaine Keegan, Shayu); their heists simply do not get this bonus.
 */
function contractorBadge(
	badges: readonly Badge[],
	heist: Heist,
): Badge | undefined {
	const badge = badges.find(
		(b) => !b.isEverything && b.contractor === heist.contractor,
	);
	return !badge || badge.earned || badge.of === 0 ? undefined : badge;
}

export interface RecommendOptions {
	readonly limit?: number;
	readonly scale?: RarityScale;
}

/**
 * The heists worth playing next, best first.
 *
 * Heists both players have already cleared are not candidates: there is
 * nothing left to recommend about them.
 */
export function recommend(
	catalog: readonly Heist[],
	players: readonly PlayerProgress[],
	badges: readonly Badge[],
	{ limit = 3, scale = 'minmax' }: RecommendOptions = {},
): readonly Recommendation[] {
	const ok = okPlayers(players);
	const partial = players.length !== ok.length;
	const rarity = rarityScale(catalog, scale);

	const scored = catalog
		.filter((h) => !(ok.length > 0 && ok.every((p) => hasCleared(p, h.id))))
		.map((heist): Recommendation => {
			const rung = sharedRung(players, heist.id);
			const badge = contractorBadge(badges, heist);

			const factors: Factors = {
				rarity: rarity.get(heist.id) ?? 0,
				closeness: (rung ?? 0) / LADDER_RUNGS.length,
				ease: EASE[heist.perceivedDifficulty],
				proximity: badge ? 1 / (badge.of - badge.done) : 0,
				brevity: BREVITY[heist.days],
			};

			const contributions: Factors = {
				rarity: factors.rarity * WEIGHTS.rarity,
				closeness: factors.closeness * WEIGHTS.closeness,
				ease: factors.ease * WEIGHTS.ease,
				proximity: factors.proximity * WEIGHTS.proximity,
				brevity: factors.brevity * WEIGHTS.brevity,
			};

			const score = Object.values(contributions).reduce((a, b) => a + b, 0);
			return {
				heist,
				score,
				factors,
				contributions,
				partial,
				rung,
				contractorLeft: badge ? badge.of - badge.done : null,
			};
		});

	// Heist name breaks ties, matching the table's sort, so equal scores come
	// out in a stable readable order rather than catalog order.
	scored.sort(
		(a, b) =>
			b.score - a.score || a.heist.heist.localeCompare(b.heist.heist, 'en'),
	);
	return scored.slice(0, limit);
}

/** The terms that actually drove a score, largest contribution first. */
export function topFactors(
	rec: Recommendation,
	count = 2,
): readonly (keyof Factors)[] {
	return (Object.keys(rec.contributions) as (keyof Factors)[])
		.filter((k) => rec.contributions[k] > 0)
		.sort((a, b) => rec.contributions[b] - rec.contributions[a])
		.slice(0, count);
}
