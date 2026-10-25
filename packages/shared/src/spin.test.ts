import { describe, expect, it } from 'vitest';

import { buildReel, pickWeighted, REEL_LENGTH, WINNER_INDEX } from './spin.js';
import type { Recommendation } from './recommend.js';
import type { Heist } from './types.js';

const heist = (id: string): Heist => ({
	id,
	heist: id.toUpperCase(),
	achievement: 'A',
	globalPct: 5,
	icon: 'a'.repeat(40),
	iconGray: 'b'.repeat(40),
	contractor: 'Bain',
	approach: 'LOUD',
	perceivedDifficulty: 'MEDIUM',
	days: 1,
});

const rec = (id: string, score: number): Recommendation =>
	({ heist: heist(id), score }) as Recommendation;

/** Feeds an exact sequence, so a draw is checked rather than sampled. */
const rng = (...values: number[]) => {
	let i = 0;
	return () => values[i++ % values.length]!;
};

describe('pickWeighted', () => {
	// Weights 1, 2, 3 over a total of 6: boundaries at 1/6 and 3/6.
	const pool = [rec('a', 1), rec('b', 2), rec('c', 3)];
	const pick = (r: number) => pickWeighted(pool, rng(r))?.heist.id;

	it.each([
		[0, 'a'],
		[0.16, 'a'],
		[0.17, 'b'],
		[0.49, 'b'],
		[0.51, 'c'],
		[0.99, 'c'],
	])('maps %j onto %s', (r, expected) => {
		expect(pick(r)).toBe(expected);
	});

	it('gives a higher score a proportionally higher chance', () => {
		const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
		for (let i = 0; i < 6000; i++) {
			const id = pickWeighted(pool, rng(i / 6000))!.heist.id;
			counts[id] = (counts[id] ?? 0) + 1;
		}
		// 1 : 2 : 3, give or take a rounding boundary.
		expect(counts['b']! / counts['a']!).toBeCloseTo(2, 1);
		expect(counts['c']! / counts['a']!).toBeCloseTo(3, 1);
	});

	/**
	 * A heist scoring zero on every term must be unlikely, not impossible.
	 * Without the floor its weight is 0 and no draw can ever reach it.
	 */
	it('can still draw a heist that scores zero', () => {
		const withZero = [rec('zero', 0), rec('big', 10)];
		expect(pickWeighted(withZero, rng(0))?.heist.id).toBe('zero');
	});

	it('returns undefined when there is nothing to pick', () => {
		expect(pickWeighted([], rng(0.5))).toBeUndefined();
	});

	it('always returns a candidate, even at the very top of the range', () => {
		expect(pickWeighted(pool, rng(0.999999999))).toBeDefined();
	});
});

describe('buildReel', () => {
	const pool = [heist('a'), heist('b'), heist('c')];
	const winner = heist('win');

	it('puts the winner at the marker position', () => {
		const reel = buildReel(pool, winner, rng(0.5));
		expect(reel).toHaveLength(REEL_LENGTH);
		expect(reel[WINNER_INDEX]?.id).toBe('win');
	});

	/**
	 * The winner is placed, not drawn. If filler could also roll the winning
	 * heist the strip would show it twice and the spin would look wrong.
	 */
	it('shows the winner exactly once', () => {
		const reel = buildReel([...pool, winner], winner, rng(0.99));
		expect(reel.filter((h) => h.id === 'win')).toHaveLength(1);
	});

	it('fills from the pool', () => {
		const ids = new Set(pool.map((h) => h.id));
		for (const [i, h] of buildReel(
			pool,
			winner,
			rng(0.1, 0.5, 0.9),
		).entries()) {
			if (i !== WINNER_INDEX) expect(ids.has(h.id)).toBe(true);
		}
	});

	it('copes with an empty pool', () => {
		expect(buildReel([], winner, rng(0.5))).toEqual([winner]);
	});
});
