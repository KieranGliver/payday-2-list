import type { Heist, PlayerProgress } from '@pd2/shared';
import { describe, expect, it } from 'vitest';

import { INITIAL_SORT, sortHeists } from './sort.js';

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

const names = (hs: readonly Heist[]) => hs.map((h) => h.heist);

describe('sortHeists', () => {
	it('defaults to contractor, then heist name', () => {
		expect(INITIAL_SORT).toEqual({ key: 'contractor', desc: false });
		const rows = [
			heist({ id: '1', heist: 'Zebra', contractor: 'Bain' }),
			heist({ id: '2', heist: 'Apple', contractor: 'Vlad' }),
			heist({ id: '3', heist: 'Mango', contractor: 'Bain' }),
		];
		expect(names(sortHeists(rows, INITIAL_SORT, []))).toEqual([
			'Mango',
			'Zebra',
			'Apple',
		]);
	});

	/**
	 * Difficulty must sort by severity, not alphabetically - alphabetical would
	 * give EASY, HARD, MEDIUM. The ordering is declared explicitly so that
	 * reordering the DIFFICULTIES display array cannot silently change it.
	 */
	it('sorts difficulty by severity, not alphabetically', () => {
		const rows = [
			heist({ id: '1', heist: 'A', perceivedDifficulty: 'HARD' }),
			heist({ id: '2', heist: 'B', perceivedDifficulty: 'EASY' }),
			heist({ id: '3', heist: 'C', perceivedDifficulty: 'MEDIUM' }),
		];
		const sorted = sortHeists(rows, { key: 'difficulty', desc: false }, []);
		expect(sorted.map((h) => h.perceivedDifficulty)).toEqual([
			'EASY',
			'MEDIUM',
			'HARD',
		]);
	});

	/**
	 * 'days' needs an explicit case in value(): the switch's default arm reads
	 * the key as `player:<steamId>`, so a missing case would slice 'days' into
	 * a steamId, find no player, and sort every row to -1 - a column that
	 * silently does nothing.
	 */
	it('sorts days ascending, shortest first', () => {
		const rows = [
			heist({ id: '1', heist: 'A', days: 3 }),
			heist({ id: '2', heist: 'B', days: 1 }),
			heist({ id: '3', heist: 'C', days: 2 }),
		];
		const sorted = sortHeists(rows, { key: 'days', desc: false }, []);
		expect(sorted.map((h) => h.days)).toEqual([1, 2, 3]);
		expect(names(sorted)).toEqual(['B', 'C', 'A']);
	});

	it('reverses on desc', () => {
		const rows = [
			heist({ id: '1', heist: 'A', globalPct: 1 }),
			heist({ id: '2', heist: 'B', globalPct: 9 }),
		];
		expect(
			names(sortHeists(rows, { key: 'globalPct', desc: true }, [])),
		).toEqual(['B', 'A']);
	});

	// Without a stable tiebreaker, equal keys fall back to catalog order, which
	// reads as random to anyone scanning the column.
	it('always breaks ties on heist name', () => {
		const rows = [
			heist({ id: '1', heist: 'Zebra', contractor: 'Bain' }),
			heist({ id: '2', heist: 'Apple', contractor: 'Bain' }),
		];
		expect(
			names(sortHeists(rows, { key: 'contractor', desc: false }, [])),
		).toEqual(['Apple', 'Zebra']);
	});

	it('keeps the name tiebreaker ascending even when sorting desc', () => {
		const rows = [
			heist({ id: '1', heist: 'Zebra', contractor: 'Bain' }),
			heist({ id: '2', heist: 'Apple', contractor: 'Bain' }),
		];
		expect(
			names(sortHeists(rows, { key: 'contractor', desc: true }, [])),
		).toEqual(['Apple', 'Zebra']);
	});

	it('does not mutate the input', () => {
		const rows = [
			heist({ id: '1', heist: 'Zebra' }),
			heist({ id: '2', heist: 'Apple' }),
		];
		const before = names(rows);
		sortHeists(rows, { key: 'heist', desc: false }, []);
		expect(names(rows)).toEqual(before);
	});

	describe('player columns', () => {
		const rows = [
			heist({ id: 'a', heist: 'Early' }),
			heist({ id: 'b', heist: 'Late' }),
			heist({ id: 'c', heist: 'Never' }),
		];
		const players: PlayerProgress[] = [
			{
				status: 'ok',
				steamId: R,
				name: 'yogizmo',
				completed: 2,
				unlocked: { a: 1_000, b: 2_000 },
				ladder: {},
			},
		];

		it('orders by when each heist was cleared', () => {
			expect(
				names(sortHeists(rows, { key: `player:${R}`, desc: false }, players)),
			).toEqual(['Never', 'Early', 'Late']);
		});

		it('sorts uncleared last when descending', () => {
			expect(
				names(sortHeists(rows, { key: `player:${R}`, desc: true }, players)),
			).toEqual(['Late', 'Early', 'Never']);
		});

		// A failed player has no unlock times at all, so every row ties and the
		// order collapses to the name tiebreaker rather than becoming arbitrary.
		it('treats a failed player as entirely unknown', () => {
			const failed: PlayerProgress[] = [
				{ status: 'failed', steamId: K, name: 'Eggsenbacon', reason: 'nope' },
			];
			expect(
				names(sortHeists(rows, { key: `player:${K}`, desc: false }, failed)),
			).toEqual(['Early', 'Late', 'Never']);
		});

		// PD2_PLAYERS can change under a stale sort key.
		it('does not throw when the sort key names an unknown player', () => {
			expect(() =>
				sortHeists(
					rows,
					{ key: 'player:99999999999999999', desc: false },
					players,
				),
			).not.toThrow();
		});
	});
});
