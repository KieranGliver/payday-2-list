/**
 * The random heist picker.
 *
 * The winner is decided HERE, before anything moves. The carousel is then
 * built so that winner sits under the marker, and the animation is pure
 * decoration over an answer that already exists. Deciding mid-spin, or
 * reading the result off where a transition happened to stop, would make the
 * outcome depend on frame timing.
 */
import type { Recommendation } from './recommend.js';
import type { Heist } from './types.js';

/**
 * The smallest weight any heist can have.
 *
 * Chance is proportional to the recommender score, so the wheel leans toward
 * heists worth playing - on the real catalog that is only a 5x spread between
 * best and worst, which keeps a spin feeling random rather than rigged. But a
 * heist that scores zero on every term would otherwise be IMPOSSIBLE to draw,
 * which is not the same as unlikely. The floor keeps everything reachable.
 */
const MIN_WEIGHT = 0.1;

const weightOf = (rec: Recommendation) => Math.max(rec.score, MIN_WEIGHT);

/**
 * Picks one heist, with chance proportional to its score.
 *
 * `random` is injected so the draw can be tested exactly rather than
 * statistically.
 */
export function pickWeighted(
	candidates: readonly Recommendation[],
	random: () => number = Math.random,
): Recommendation | undefined {
	if (candidates.length === 0) return undefined;

	const total = candidates.reduce((sum, c) => sum + weightOf(c), 0);
	// Math.random() is [0, 1), so target is [0, total) and the loop below
	// always terminates on a real entry.
	let target = random() * total;

	for (const candidate of candidates) {
		target -= weightOf(candidate);
		if (target < 0) return candidate;
	}
	// Only reachable through floating-point drift on the last subtraction.
	return candidates[candidates.length - 1];
}

/** How many tiles the strip holds, and where the winning one sits. */
export const REEL_LENGTH = 56;
export const WINNER_INDEX = 48;

/**
 * The strip of tiles to scroll past, with the winner at WINNER_INDEX.
 *
 * Filler is drawn from the same pool so the strip looks like the real list
 * going by, but with the winner REMOVED from it. The winner is in the
 * candidate pool by definition, so leaving it in means filler can roll it
 * too: the strip then shows the winning heist several times and the reveal
 * is spoiled before the spin stops. It is placed exactly once, at a known
 * index, rather than drawn and hoped for.
 */
export function buildReel(
	pool: readonly Heist[],
	winner: Heist,
	random: () => number = Math.random,
): readonly Heist[] {
	const filler = pool.filter((h) => h.id !== winner.id);
	// Nothing else to show - a one-heist pool is the last heist outstanding.
	if (filler.length === 0) return [winner];

	const reel = Array.from(
		{ length: REEL_LENGTH },
		() => filler[Math.floor(random() * filler.length)] ?? winner,
	);
	reel[WINNER_INDEX] = winner;
	return reel;
}
