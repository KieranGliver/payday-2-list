import { describe, expect, it } from 'vitest';

import {
	recommend,
	topFactors,
	WEIGHTS,
	type Recommendation,
} from './recommend.js';
import type { Badge } from './badges.js';
import type { PlayerProgress } from './api.js';
import type { Heist } from './types.js';

const R = '76561198103504838';
const K = '76561198096708910';

const heist = (over: Partial<Heist>): Heist => ({
	id: 'x',
	heist: 'X',
	achievement: 'A',
	globalPct: 5,
	icon: 'a'.repeat(40),
	iconGray: 'b'.repeat(40),
	contractor: 'Bain',
	approach: 'LOUD',
	perceivedDifficulty: 'MEDIUM',
	days: 1,
	...over,
});

const player = (
	steamId: string,
	over: Partial<Extract<PlayerProgress, { status: 'ok' }>> = {},
): PlayerProgress => ({
	status: 'ok',
	steamId,
	name: steamId === R ? 'yogizmo' : 'Eggsenbacon',
	completed: 0,
	unlocked: {},
	ladder: {},
	...over,
});

const badge = (over: Partial<Badge>): Badge => ({
	id: 'meta',
	label: 'Bain',
	achievement: 'Bain Set',
	description: '',
	globalPct: 1,
	icon: 'c'.repeat(40),
	iconGray: 'd'.repeat(40),
	earned: false,
	unknown: false,
	mismatch: null,
	done: 0,
	of: 4,
	isEverything: false,
	contractor: 'Bain',
	...over,
});

const PLAYERS = [player(R), player(K)];
const ids = (recs: readonly { heist: Heist }[]) => recs.map((r) => r.heist.id);

/** Two heists identical but for one field, so a term can be read in isolation. */
const pair = (a: Partial<Heist>, b: Partial<Heist>) => [
	heist({ id: 'a', heist: 'A', ...a }),
	heist({ id: 'b', heist: 'B', ...b }),
];

describe('recommend', () => {
	describe('each term, in isolation', () => {
		it('favours the heist more people complete', () => {
			const rows = pair({ globalPct: 9 }, { globalPct: 1 });
			expect(ids(recommend(rows, PLAYERS, [], { limit: 2 }))).toEqual([
				'a',
				'b',
			]);
		});

		it('favours the heist we are further up the ladder on', () => {
			const rows = pair({}, {});
			const players = [
				player(R, { ladder: { a: 6, b: 1 } }),
				player(K, { ladder: { a: 6, b: 1 } }),
			];
			expect(ids(recommend(rows, players, [], { limit: 2 }))).toEqual([
				'a',
				'b',
			]);
		});

		it('favours the heist we rate easier', () => {
			const rows = pair(
				{ perceivedDifficulty: 'EASY' },
				{ perceivedDifficulty: 'HARD' },
			);
			expect(ids(recommend(rows, PLAYERS, [], { limit: 2 }))).toEqual([
				'a',
				'b',
			]);
		});

		it('favours the shorter heist', () => {
			const rows = pair({ days: 1 }, { days: 3 });
			expect(ids(recommend(rows, PLAYERS, [], { limit: 2 }))).toEqual([
				'a',
				'b',
			]);
		});

		it('favours the heist whose contractor badge is nearly done', () => {
			const rows = pair({ contractor: 'Bain' }, { contractor: 'Vlad' });
			const badges = [
				badge({ contractor: 'Bain', done: 3, of: 4 }),
				badge({ id: 'v', contractor: 'Vlad', done: 0, of: 4 }),
			];
			expect(ids(recommend(rows, PLAYERS, badges, { limit: 2 }))).toEqual([
				'a',
				'b',
			]);
		});
	});

	describe('contractor proximity', () => {
		/**
		 * The real case this rule got wrong. Bain sits at 11/20 and The
		 * Continental at 1/2, so by fraction Bain scores 0.55 against 0.50 and
		 * the contractor NINE heists away outranks the one a single heist
		 * away. Scoring on heists remaining puts that right.
		 *
		 * A fixture where the two rules happen to agree proves nothing here -
		 * these numbers are chosen so they disagree on the order.
		 */
		it('prefers the contractor fewer heists from a badge, not the larger fraction', () => {
			const rows = pair(
				{ contractor: 'Bain' },
				{ contractor: 'The Continental' },
			);
			const badges = [
				badge({ contractor: 'Bain', done: 11, of: 20 }),
				badge({ id: 'c', contractor: 'The Continental', done: 1, of: 2 }),
			];
			const recs = recommend(rows, PLAYERS, badges, { limit: 2 });
			expect(recs[0]?.heist.contractor).toBe('The Continental');
			expect(recs[0]?.factors.proximity).toBeCloseTo(1, 10);
			expect(recs[1]?.factors.proximity).toBeCloseTo(1 / 9, 10);
		});

		it('scores a badge one heist away at the maximum', () => {
			const rows = [heist({ id: 'a', contractor: 'Bain' })];
			const one = [badge({ done: 3, of: 4 })];
			expect(recommend(rows, PLAYERS, one)[0]?.factors.proximity).toBe(1);
		});

		// An earned badge has nothing left to win, so it must stop lifting its
		// own heists above everything else.
		it('stops counting once the badge is earned', () => {
			const rows = [heist({ id: 'a', contractor: 'Bain' })];
			const earned = badge({ earned: true, done: 4, of: 4 });
			const [rec] = recommend(rows, PLAYERS, [earned]);
			expect(rec?.factors.proximity).toBe(0);
		});

		// Overkill never shipped a meta achievement for four contractors. Their
		// heists get no bonus rather than crashing or scoring undefined.
		it('is zero for a contractor with no badge at all', () => {
			const rows = [heist({ id: 'a', contractor: 'Shayu' })];
			const [rec] = recommend(rows, PLAYERS, [badge({})]);
			expect(rec?.factors.proximity).toBe(0);
		});

		it('never reads the everything badge as a contractor badge', () => {
			const rows = [heist({ id: 'a', contractor: 'Bain' })];
			const everything = badge({
				id: 'all',
				isEverything: true,
				contractor: null,
				done: 80,
				of: 86,
			});
			const [rec] = recommend(rows, PLAYERS, [everything]);
			expect(rec?.factors.proximity).toBe(0);
		});
	});

	describe('candidates', () => {
		it('never recommends a heist both players have cleared', () => {
			const rows = pair({}, {});
			const players = [
				player(R, { unlocked: { a: 1 } }),
				player(K, { unlocked: { a: 1 } }),
			];
			expect(ids(recommend(rows, players, [], { limit: 2 }))).toEqual(['b']);
		});

		it('still recommends a heist only one player has cleared', () => {
			const rows = pair({}, {});
			const players = [player(R, { unlocked: { a: 1 } }), player(K)];
			expect(ids(recommend(rows, players, [], { limit: 2 }))).toContain('a');
		});

		it('returns at most the requested number', () => {
			const rows = [
				heist({ id: 'a', heist: 'A' }),
				heist({ id: 'b', heist: 'B' }),
				heist({ id: 'c', heist: 'C' }),
				heist({ id: 'd', heist: 'D' }),
			];
			expect(recommend(rows, PLAYERS, [])).toHaveLength(3);
		});

		it('returns nothing when everything is done', () => {
			const rows = [heist({ id: 'a' })];
			const done = [
				player(R, { unlocked: { a: 1 } }),
				player(K, { unlocked: { a: 1 } }),
			];
			expect(recommend(rows, done, [])).toEqual([]);
		});
	});

	describe('unknown player data', () => {
		/**
		 * The rule the rest of the app already follows: a failed read is not a
		 * zero. Averaging an unreadable player in as rung 0 would halve the
		 * closeness of every heist and silently reshuffle the whole list the
		 * moment one profile goes private.
		 */
		it('ignores an unreadable player rather than scoring them as rung 0', () => {
			const rows = [heist({ id: 'a' })];
			const both = [
				player(R, { ladder: { a: 7 } }),
				player(K, { ladder: { a: 7 } }),
			];
			const one: PlayerProgress[] = [
				player(R, { ladder: { a: 7 } }),
				{ status: 'failed', steamId: K, name: 'K', reason: 'private' },
			];
			expect(recommend(rows, one, [])[0]?.factors.closeness).toBe(
				recommend(rows, both, [])[0]?.factors.closeness,
			);
		});

		it('flags the recommendation as partial when a read failed', () => {
			const rows = [heist({ id: 'a' })];
			const one: PlayerProgress[] = [
				player(R),
				{ status: 'failed', steamId: K, name: 'K', reason: 'private' },
			];
			expect(recommend(rows, one, [])[0]?.partial).toBe(true);
			expect(recommend(rows, PLAYERS, [])[0]?.partial).toBe(false);
		});

		// A heist absent from the ladder map is unknown, not rung 0 - but with
		// nothing to go on, the only honest score is the bottom of the range.
		it('scores a heist with no ladder data at zero closeness', () => {
			const rows = [heist({ id: 'a' })];
			expect(recommend(rows, PLAYERS, [])[0]?.factors.closeness).toBe(0);
		});

		it('scores everything when no player is readable', () => {
			const rows = [heist({ id: 'a' })];
			const none: PlayerProgress[] = [
				{ status: 'failed', steamId: R, name: 'R', reason: 'private' },
			];
			expect(recommend(rows, none, [])).toHaveLength(1);
		});
	});

	describe('the ladder term', () => {
		// The pair is as ready as its less experienced half. Averaging would
		// call a heist one of us has never loaded "half done".
		it('takes the minimum across players, not the average', () => {
			const rows = pair({}, {});
			const players = [
				// a: rungs 7 and 1 -> min 1, mean 4.
				// b: rungs 3 and 3 -> min 3, mean 3.
				// The two rules disagree on the ORDER here, which is the only way
				// this test can tell them apart - picking numbers where min and
				// mean happen to rank the same way asserts nothing.
				player(R, { ladder: { a: 7, b: 3 } }),
				player(K, { ladder: { a: 1, b: 3 } }),
			];
			const [first, second] = recommend(rows, players, [], { limit: 2 });
			expect(first?.heist.id).toBe('b');
			expect(second?.heist.id).toBe('a');
			expect(first?.factors.closeness).toBeCloseTo(3 / 7, 10);
			expect(second?.factors.closeness).toBeCloseTo(1 / 7, 10);
		});

		it('maps the top rung to a full score', () => {
			const rows = [heist({ id: 'a' })];
			const players = [
				player(R, { ladder: { a: 7 } }),
				player(K, { ladder: { a: 7 } }),
			];
			expect(recommend(rows, players, [])[0]?.factors.closeness).toBe(1);
		});
	});

	describe('scoring mechanics', () => {
		// Neither should be able to decide the order on its own. Proximity
		// especially: scored as 1 / remaining, a single heist from a badge hits
		// the maximum, and at full weight that one fact outweighed everything
		// we actually know about the heist.
		it('weights brevity and proximity below the full-weight terms', () => {
			expect(WEIGHTS.brevity).toBeLessThan(WEIGHTS.ease);
			expect(WEIGHTS.proximity).toBeLessThan(WEIGHTS.ease);
			expect(WEIGHTS.proximity).toBeLessThan(WEIGHTS.closeness);
		});

		/**
		 * The point of the reduced weight: a badge one heist away must not beat
		 * a heist that is better on everything we judge ourselves. Here the
		 * second heist is easier, shorter and one we have both already cleared
		 * on Death Sentence, against a HARD three-day heist nobody has touched.
		 */
		it('does not let a nearly-finished badge outweigh everything else', () => {
			const rows = [
				heist({
					id: 'badge',
					heist: 'Badge',
					contractor: 'Bain',
					perceivedDifficulty: 'HARD',
					days: 3,
				}),
				heist({
					id: 'better',
					heist: 'Better',
					contractor: 'Vlad',
					perceivedDifficulty: 'EASY',
					days: 1,
				}),
			];
			const players = [
				player(R, { ladder: { badge: 0, better: 7 } }),
				player(K, { ladder: { badge: 0, better: 7 } }),
			];
			const badges = [badge({ contractor: 'Bain', done: 3, of: 4 })];
			expect(recommend(rows, players, badges, { limit: 2 })[0]?.heist.id).toBe(
				'better',
			);
		});

		it('sums the weighted contributions into the score', () => {
			const rows = [
				heist({ id: 'a', perceivedDifficulty: 'EASY', days: 1, globalPct: 5 }),
			];
			const [rec] = recommend(rows, PLAYERS, []);
			const sum = Object.values(rec!.contributions).reduce((x, y) => x + y, 0);
			expect(rec!.score).toBeCloseTo(sum, 10);
		});

		it('breaks ties on heist name', () => {
			const rows = [
				heist({ id: 'z', heist: 'Zebra' }),
				heist({ id: 'a', heist: 'Aardvark' }),
			];
			expect(ids(recommend(rows, PLAYERS, [], { limit: 2 }))).toEqual([
				'a',
				'z',
			]);
		});

		it('does not mutate the catalog it is given', () => {
			const rows = [
				heist({ id: 'a', heist: 'A' }),
				heist({ id: 'b', heist: 'B' }),
			];
			const before = rows.map((h) => h.id);
			recommend(rows, PLAYERS, [], { scale: 'rank' });
			expect(rows.map((h) => h.id)).toEqual(before);
		});

		/**
		 * The scale is built across the whole catalog rather than the surviving
		 * candidates. Otherwise finishing the easiest heist would re-normalise
		 * the rest and move heists nobody touched.
		 */
		it('does not rescale rarity as heists are completed', () => {
			const rows = [
				heist({ id: 'a', heist: 'A', globalPct: 9 }),
				heist({ id: 'b', heist: 'B', globalPct: 5 }),
				heist({ id: 'c', heist: 'C', globalPct: 1 }),
			];
			const open = recommend(rows, PLAYERS, [], { limit: 3 });
			const aDone = [
				player(R, { unlocked: { a: 1 } }),
				player(K, { unlocked: { a: 1 } }),
			];
			const after = recommend(rows, aDone, [], { limit: 3 });
			const rarityOf = (recs: typeof open, id: string) =>
				recs.find((r) => r.heist.id === id)?.factors.rarity;
			expect(rarityOf(after, 'b')).toBe(rarityOf(open, 'b'));
			expect(rarityOf(after, 'c')).toBe(rarityOf(open, 'c'));
		});
	});

	describe('the casual-era discount', () => {
		/**
		 * Real ids, because the discount reads generated/ladder.ts. These two
		 * are the case the discount exists for: Hoxton Breakout has the HIGHER
		 * One Down figure, but 21.3% of all owners have beaten it on Normal
		 * against The Biker Heist's 7.7%, so most of that figure is twelve
		 * years of casual players rather than the heist being easier.
		 *
		 *   Hoxton Breakout  4.5% x (1 - 0.213) = 3.54
		 *   The Biker Heist  4.2% x (1 - 0.077) = 3.88
		 *
		 * Without the discount the order is the other way round.
		 */
		const HOXTON_BREAKOUT = 'axe_34';
		const BIKER_HEIST = 'axe_57';

		const rarityOf = (recs: readonly Recommendation[], id: string) =>
			recs.find((r) => r.heist.id === id)?.factors.rarity;

		it('ranks a late heist above a launch heist with a higher raw figure', () => {
			const rows = [
				heist({
					id: HOXTON_BREAKOUT,
					heist: 'Hoxton Breakout',
					globalPct: 4.5,
				}),
				heist({ id: BIKER_HEIST, heist: 'The Biker Heist', globalPct: 4.2 }),
			];
			const recs = recommend(rows, PLAYERS, [], { limit: 2 });
			expect(recs[0]?.heist.id).toBe(BIKER_HEIST);
			expect(rarityOf(recs, BIKER_HEIST)!).toBeGreaterThan(
				rarityOf(recs, HOXTON_BREAKOUT)!,
			);
		});

		// It must reorder the middle without inverting the scale: a genuinely
		// high completion rate still beats a low one when both are late heists.
		it('still ranks a higher figure first when exposure is comparable', () => {
			const rows = [
				heist({ id: BIKER_HEIST, heist: 'The Biker Heist', globalPct: 1 }),
				heist({ id: 'fex_8', heist: "Buluc's Mansion", globalPct: 9 }),
			];
			expect(recommend(rows, PLAYERS, [], { limit: 2 })[0]?.heist.id).toBe(
				'fex_8',
			);
		});

		/**
		 * A heist with no ladder data must keep its figure untouched. Reading a
		 * missing entry as 0% played would hand it a x1.0 multiplier by luck;
		 * reading it as 100% would erase the figure entirely. Both are wrong
		 * for the same reason - no information is not a measurement.
		 */
		it('does not discount a heist with no ladder data', () => {
			const rows = [
				heist({ id: 'not_in_the_ladder', heist: 'A', globalPct: 9 }),
				heist({ id: 'also_missing', heist: 'B', globalPct: 1 }),
			];
			const recs = recommend(rows, PLAYERS, [], { limit: 2 });
			expect(recs[0]?.heist.id).toBe('not_in_the_ladder');
			expect(rarityOf(recs, 'not_in_the_ladder')).toBe(1);
			expect(rarityOf(recs, 'also_missing')).toBe(0);
		});
	});

	describe('rarity scales', () => {
		const rows = [
			heist({ id: 'a', heist: 'A', globalPct: 1 }),
			heist({ id: 'b', heist: 'B', globalPct: 4.2 }),
			heist({ id: 'c', heist: 'C', globalPct: 4.3 }),
			heist({ id: 'd', heist: 'D', globalPct: 9 }),
		];
		const rarity = (scale: 'minmax' | 'rank') =>
			Object.fromEntries(
				recommend(rows, PLAYERS, [], { limit: 4, scale }).map((r) => [
					r.heist.id,
					r.factors.rarity,
				]),
			);

		it('minmax keeps the raw spacing, leaving the cluster flat', () => {
			const r = rarity('minmax');
			expect(r['a']).toBe(0);
			expect(r['d']).toBe(1);
			// The two clustered heists stay within a hair of each other.
			expect(Math.abs(r['b']! - r['c']!)).toBeLessThan(0.02);
		});

		it('rank spreads the cluster evenly', () => {
			const r = rarity('rank');
			expect(r['a']).toBe(0);
			expect(r['d']).toBe(1);
			expect(r['c']! - r['b']!).toBeCloseTo(1 / 3, 10);
		});

		it('gives a neutral score when every heist is identical', () => {
			const flat = [
				heist({ id: 'a', heist: 'A', globalPct: 4 }),
				heist({ id: 'b', heist: 'B', globalPct: 4 }),
			];
			for (const scale of ['minmax', 'rank'] as const) {
				for (const rec of recommend(flat, PLAYERS, [], { limit: 2, scale })) {
					expect(Number.isFinite(rec.factors.rarity), scale).toBe(true);
				}
			}
		});
	});

	describe('facts for the reason text', () => {
		/**
		 * The UI names the difficulty we reached rather than quoting a score, so
		 * the raw rung has to survive scoring. Reversing it out of
		 * `factors.closeness` would mean dividing a float back by 7 and rounding.
		 */
		it('reports the rung both players reached', () => {
			const rows = [heist({ id: 'a' })];
			const players = [
				player(R, { ladder: { a: 7 } }),
				player(K, { ladder: { a: 5 } }),
			];
			expect(recommend(rows, players, [])[0]?.rung).toBe(5);
		});

		// Unknown is not rung 0: one has nothing to say, the other says
		// "never completed on any difficulty".
		it('separates an unknown rung from rung 0', () => {
			const rows = [heist({ id: 'a' })];
			const none: PlayerProgress[] = [
				{ status: 'failed', steamId: R, name: 'R', reason: 'private' },
			];
			expect(recommend(rows, none, [])[0]?.rung).toBeUndefined();
			expect(
				recommend(rows, [player(R, { ladder: { a: 0 } })], [])[0]?.rung,
			).toBe(0);
		});

		it('reports how many heists are left for the contractor', () => {
			const rows = [heist({ id: 'a', contractor: 'Bain' })];
			const badges = [badge({ done: 3, of: 4 })];
			expect(recommend(rows, PLAYERS, badges)[0]?.contractorLeft).toBe(1);
		});

		it('reports no remainder when there is no badge to earn', () => {
			const rows = [heist({ id: 'a', contractor: 'Shayu' })];
			expect(
				recommend(rows, PLAYERS, [badge({})])[0]?.contractorLeft,
			).toBeNull();
		});

		it('reports no remainder once the badge is earned', () => {
			const rows = [heist({ id: 'a', contractor: 'Bain' })];
			const earned = [badge({ earned: true, done: 4, of: 4 })];
			expect(recommend(rows, PLAYERS, earned)[0]?.contractorLeft).toBeNull();
		});
	});

	describe('topFactors', () => {
		it('names the largest contributors first', () => {
			const rows = [
				heist({ id: 'a', perceivedDifficulty: 'EASY', days: 1, globalPct: 5 }),
			];
			const [rec] = recommend(rows, PLAYERS, []);
			expect(topFactors(rec!, 1)).toEqual(['ease']);
		});

		it('never names a term that contributed nothing', () => {
			const rows = [
				heist({ id: 'a', perceivedDifficulty: 'HARD', days: 3, globalPct: 5 }),
			];
			const [rec] = recommend(rows, PLAYERS, []);
			// ease, brevity, closeness and proximity are all zero here.
			expect(topFactors(rec!, 5)).toEqual(['rarity']);
		});
	});
});
