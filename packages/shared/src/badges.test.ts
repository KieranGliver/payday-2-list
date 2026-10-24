import { describe, expect, it } from 'vitest';

import { badgeTally, resolveBadges } from './badges.js';
import { CATALOG } from './catalog.js';
import type { PlayerProgress } from './api.js';

const R = '76561198103504838';
const K = '76561198096708910';

/** Vlad's meta achievement, and the heists our catalog assigns to Vlad. */
const VLAD_META = 'axe_62';
const vladHeists = CATALOG.filter((h) => h.contractor === 'Vlad').map(
	(h) => h.id,
);

const ok = (steamId: string, ids: readonly string[]): PlayerProgress => ({
	status: 'ok',
	steamId,
	name: steamId,
	completed: ids.length,
	unlocked: Object.fromEntries(ids.map((id) => [id, 1])),
});

const badge = (players: PlayerProgress[], id = VLAD_META) =>
	resolveBadges(players).find((b) => b.id === id)!;

describe('resolveBadges', () => {
	/**
	 * The central rule: earned comes from Steam's own meta achievement, never
	 * from counting the heists we assign to that contractor. Computing it would
	 * hide exactly the mapping errors this display exists to surface.
	 */
	it('lights a badge from the meta achievement, not from our heist list', () => {
		const both = [ok(R, [VLAD_META]), ok(K, [VLAD_META])];
		expect(badge(both).earned).toBe(true);
		// ...even though our catalog says none of Vlad's heists are done.
		expect(badge(both).done).toBe(0);
	});

	it('does not light a badge when only one player has it', () => {
		expect(badge([ok(R, [VLAD_META]), ok(K, [])]).earned).toBe(false);
	});

	it('does not light a badge from a complete heist list alone', () => {
		// Every Vlad heist cleared by both, but Steam has not awarded the meta.
		const both = [ok(R, vladHeists), ok(K, vladHeists)];
		expect(badge(both).earned).toBe(false);
		expect(badge(both).done).toBe(vladHeists.length);
	});

	describe('mismatch detection', () => {
		it('flags Steam awarding it while our list is incomplete', () => {
			const both = [ok(R, [VLAD_META]), ok(K, [VLAD_META])];
			expect(badge(both).mismatch).toBe('steam-says-done');
		});

		it('flags our list being complete while Steam has not awarded it', () => {
			const both = [ok(R, vladHeists), ok(K, vladHeists)];
			expect(badge(both).mismatch).toBe('we-say-done');
		});

		it('reports no mismatch when the two agree', () => {
			const all = [...vladHeists, VLAD_META];
			expect(badge([ok(R, all), ok(K, all)]).mismatch).toBeNull();
			expect(badge([ok(R, []), ok(K, [])]).mismatch).toBeNull();
		});

		// A failed read makes any comparison meaningless, so no false alarm.
		it('suppresses mismatches when a profile could not be read', () => {
			const players: PlayerProgress[] = [
				ok(R, [VLAD_META]),
				{ status: 'failed', steamId: K, name: 'K', reason: 'private' },
			];
			const b = badge(players);
			expect(b.unknown).toBe(true);
			expect(b.mismatch).toBeNull();
		});
	});

	it('nothing is earned when no player is readable', () => {
		const players: PlayerProgress[] = [
			{ status: 'failed', steamId: R, name: 'R', reason: 'private' },
		];
		expect(resolveBadges(players).every((b) => !b.earned)).toBe(true);
	});

	it('tallies earned badges out of the total', () => {
		const badges = resolveBadges([ok(R, [VLAD_META]), ok(K, [VLAD_META])]);
		expect(badgeTally(badges)).toEqual({ earned: 1, total: badges.length });
	});

	// The vault hero picks this one out by flag rather than by hardcoding a
	// Steam achievement id in the UI.
	it('flags exactly one badge as spanning everything', () => {
		const all = resolveBadges([]);
		expect(all.filter((b) => b.isEverything)).toHaveLength(1);
		expect(all.find((b) => b.isEverything)?.label).toBe('Everything');
	});

	it('covers every meta achievement with a label', () => {
		for (const b of resolveBadges([])) {
			expect(b.label.length, b.id).toBeGreaterThan(0);
		}
	});
});
