import { describe, expect, it } from 'vitest';

import { BY_ID, CATALOG } from './catalog.js';
import { RATINGS } from './curated/ratings.js';
import { STEAM_HEISTS } from './generated/steam.js';
import { CONTRACTORS, APPROACHES, DIFFICULTIES } from './types.js';

/**
 * Invariants on the generated catalog.
 *
 * These guard the committed file, not the generator's parsing (that lives in
 * scripts/lib/parse.test.mjs). Every assertion here corresponds to a way the
 * catalog has been, or could silently be, wrong.
 */
describe('CATALOG', () => {
	// A floor rather than an exact number: a legitimate Steam addition should
	// not fail the suite, but a collapse to zero rows must.
	it('has a plausible number of heists', () => {
		expect(CATALOG.length).toBeGreaterThanOrEqual(80);
		expect(CATALOG.length).toBe(STEAM_HEISTS.length);
	});

	it('has unique ids', () => {
		expect(BY_ID.size).toBe(CATALOG.length);
	});

	/**
	 * Duplicate display names sort nondeterministically, because the tiebreaker
	 * in the table is the name itself. This is also how the Diamond collision
	 * would reappear.
	 */
	it('has unique display names', () => {
		const names = new Set(CATALOG.map((h) => h.heist));
		expect(names.size).toBe(CATALOG.length);
	});

	it('keeps The Diamond and Diamond Heist as separate heists', () => {
		const dentist = BY_ID.get('axe_36');
		const classic = BY_ID.get('dah_7');
		expect(dentist?.heist).toBe('The Diamond');
		expect(classic?.heist).toBe('Diamond Heist');
		expect(dentist?.contractor).toBe('The Dentist');
		expect(classic?.contractor).toBe('Classic');
	});

	// Dropped by an exact-phrase One Down filter; its description uses the
	// wording "with One Down active" rather than the usual phrasing.
	it('includes Crude Awakening', () => {
		expect(BY_ID.get('deep_8')?.heist).toBe('Crude Awakening');
	});

	it('every heist has a rating', () => {
		for (const h of CATALOG) {
			expect(RATINGS[h.id], `${h.id} (${h.heist}) has no rating`).toBeDefined();
		}
	});

	it('has no ratings for heists that no longer exist', () => {
		const ids = new Set(CATALOG.map((h) => h.id));
		for (const id of Object.keys(RATINGS)) {
			expect(
				ids.has(id as never),
				`${id} is rated but not in the catalog`,
			).toBe(true);
		}
	});

	it('every curated value is a known member of its union', () => {
		for (const h of CATALOG) {
			expect(CONTRACTORS).toContain(h.contractor);
			expect(APPROACHES).toContain(h.approach);
			expect(DIFFICULTIES).toContain(h.perceivedDifficulty);
		}
	});

	// Number.isFinite rather than a range test - NaN passes both `< 0` and
	// `> 100` because every comparison with NaN is false.
	it('every globalPct is a real percentage', () => {
		for (const h of CATALOG) {
			expect(Number.isFinite(h.globalPct), `${h.id}: ${h.globalPct}`).toBe(
				true,
			);
			expect(h.globalPct).toBeGreaterThanOrEqual(0);
			expect(h.globalPct).toBeLessThanOrEqual(100);
		}
	});

	it('every icon is a 40-character hex hash', () => {
		for (const h of CATALOG) {
			expect(h.icon, `${h.id} icon`).toMatch(/^[0-9a-f]{40}$/);
			expect(h.iconGray, `${h.id} iconGray`).toMatch(/^[0-9a-f]{40}$/);
		}
	});

	// The "Other" bucket was an invention of the original spreadsheet; every
	// heist now belongs to a contractor that actually exists in the game.
	it('has no heists in an "Other" bucket', () => {
		expect(CONTRACTORS).not.toContain('Other');
		expect(CATALOG.some((h) => String(h.contractor) === 'Other')).toBe(false);
	});

	it('every row is fully populated', () => {
		for (const h of CATALOG) {
			expect(h.heist.length, h.id).toBeGreaterThan(0);
			expect(h.achievement.length, h.id).toBeGreaterThan(0);
		}
	});
});
