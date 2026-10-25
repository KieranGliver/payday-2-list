import type { Heist, PlayerProgress } from '@pd2/shared';
import { describe, expect, it } from 'vitest';

import {
	applyFilters,
	INITIAL_FILTERS,
	toApproach,
	toCompletion,
	toContractor,
	toDays,
	toDifficulty,
	type FilterState,
} from './filters.js';

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
	unlocked: Record<string, number>,
): PlayerProgress => ({
	status: 'ok',
	steamId,
	name: steamId === R ? 'yogizmo' : 'Eggsenbacon',
	completed: Object.keys(unlocked).length,
	unlocked,
	ladder: {},
});

const CATALOG = [
	heist({ id: 'both', heist: 'Both' }),
	heist({ id: 'onlyR', heist: 'Only R' }),
	heist({ id: 'onlyK', heist: 'Only K' }),
	heist({ id: 'neither', heist: 'Neither' }),
];

const PLAYERS = [
	player(R, { both: 1, onlyR: 1 }),
	player(K, { both: 1, onlyK: 1 }),
];

const with_ = (over: Partial<FilterState>): FilterState => ({
	...INITIAL_FILTERS,
	...over,
});
const ids = (hs: readonly Heist[]) => hs.map((h) => h.id).sort();

describe('applyFilters', () => {
	it('returns everything by default', () => {
		expect(applyFilters(CATALOG, PLAYERS, INITIAL_FILTERS)).toHaveLength(4);
	});

	it.each([
		['both', ['both']],
		['either', ['both', 'onlyK', 'onlyR']],
		['neither', ['neither']],
	] as const)('completion=%s', (completion, expected) => {
		expect(ids(applyFilters(CATALOG, PLAYERS, with_({ completion })))).toEqual(
			expected,
		);
	});

	it('completion=only:<player> isolates that player', () => {
		expect(
			ids(applyFilters(CATALOG, PLAYERS, with_({ completion: `only:${R}` }))),
		).toEqual(['onlyR']);
	});

	/**
	 * A failed player has cleared nothing as far as these predicates are
	 * concerned, so "both" is empty rather than wrongly full. The distinction
	 * between unknown and not-cleared is surfaced in the UI, not here.
	 */
	it('treats a failed player as having cleared nothing', () => {
		const players: PlayerProgress[] = [
			PLAYERS[0]!,
			{ status: 'failed', steamId: K, name: 'Eggsenbacon', reason: 'nope' },
		];
		expect(
			applyFilters(CATALOG, players, with_({ completion: 'both' })),
		).toHaveLength(0);
		expect(
			ids(applyFilters(CATALOG, players, with_({ completion: 'either' }))),
		).toEqual(['both', 'onlyR']);
	});

	it('filters by contractor, approach and difficulty', () => {
		const rows = [
			heist({
				id: '1',
				contractor: 'Vlad',
				approach: 'STEALTH',
				perceivedDifficulty: 'HARD',
			}),
			heist({
				id: '2',
				contractor: 'Bain',
				approach: 'LOUD',
				perceivedDifficulty: 'EASY',
			}),
		];
		expect(ids(applyFilters(rows, [], with_({ contractor: 'Vlad' })))).toEqual([
			'1',
		]);
		expect(ids(applyFilters(rows, [], with_({ approach: 'LOUD' })))).toEqual([
			'2',
		]);
		expect(ids(applyFilters(rows, [], with_({ difficulty: 'HARD' })))).toEqual([
			'1',
		]);
	});

	it('filters by days', () => {
		const rows = [
			heist({ id: '1', days: 1 }),
			heist({ id: '2', days: 2 }),
			heist({ id: '3', days: 3 }),
		];
		expect(ids(applyFilters(rows, [], with_({ days: 1 })))).toEqual(['1']);
		expect(ids(applyFilters(rows, [], with_({ days: 3 })))).toEqual(['3']);
		expect(ids(applyFilters(rows, [], with_({ days: 'all' })))).toEqual([
			'1',
			'2',
			'3',
		]);
	});

	it('combines dimensions', () => {
		const rows = [
			heist({ id: '1', contractor: 'Vlad', approach: 'STEALTH' }),
			heist({ id: '2', contractor: 'Vlad', approach: 'LOUD' }),
		];
		expect(
			ids(
				applyFilters(rows, [], with_({ contractor: 'Vlad', approach: 'LOUD' })),
			),
		).toEqual(['2']);
	});

	it('returns nothing when nothing matches', () => {
		expect(
			applyFilters(CATALOG, PLAYERS, with_({ contractor: 'Jiu Feng' })),
		).toHaveLength(0);
	});
});

/**
 * e.target.value is just a string from the DOM. These used to be `as`
 * assertions, so any value typechecked and went straight into state, where it
 * silently matched nothing and showed an empty table.
 */
describe('narrowing select values', () => {
	it('accepts known values', () => {
		expect(toContractor('Vlad')).toBe('Vlad');
		expect(toApproach('STEALTH')).toBe('STEALTH');
		expect(toDifficulty('HARD')).toBe('HARD');
		expect(toDays('2')).toBe(2);
	});

	/**
	 * Days is the only narrower whose state is numeric, so the result must be
	 * the NUMBER 2 rather than the string - `h.days === f.days` is false for
	 * every row otherwise. These are the spellings a Number() parse would have
	 * waved through: Number('') is 0, Number(' ') is 0, Number('1e0') is 1.
	 */
	it.each(['', ' ', '0', '4', '2.5', 'two', 'NaN', 'Infinity', '1e0'])(
		'rejects %j as a day count',
		(value) => {
			expect(toDays(value)).toBe('all');
		},
	);

	it.each(['', 'Nonsense', 'vlad', '__proto__'])(
		'falls back to "all" for %j',
		(value) => {
			expect(toContractor(value)).toBe('all');
			expect(toApproach(value)).toBe('all');
			expect(toDifficulty(value)).toBe('all');
			expect(toDays(value)).toBe('all');
		},
	);

	it('accepts the fixed completion values', () => {
		for (const v of ['all', 'both', 'either', 'neither'] as const) {
			expect(toCompletion(v, PLAYERS)).toBe(v);
		}
	});

	it('accepts only:<player> for a configured player', () => {
		expect(toCompletion(`only:${R}`, PLAYERS)).toBe(`only:${R}`);
	});

	/**
	 * PD2_PLAYERS can change. A stale only:<id> would otherwise match zero
	 * rows while the native <select> displayed "All" - an empty table with no
	 * visible cause.
	 */
	it('falls back when only:<player> names someone no longer configured', () => {
		expect(toCompletion('only:76561190000000000', PLAYERS)).toBe('all');
	});

	it('falls back on a malformed only: value', () => {
		expect(toCompletion('only:', PLAYERS)).toBe('all');
		expect(toCompletion('only', PLAYERS)).toBe('all');
	});
});
