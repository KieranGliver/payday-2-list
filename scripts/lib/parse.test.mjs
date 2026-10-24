import { describe, expect, it } from 'vitest';

import {
	iconHash,
	isMeta,
	isOneDown,
	parseHeistName,
	quote,
	toPercent,
} from './parse.mjs';

/**
 * Every case here is a bug this generator actually shipped, or the exact
 * boundary that caused one. They are regression tests, not coverage.
 */

describe('isOneDown', () => {
	// Steam uses at least three phrasings. An exact-phrase filter matched the
	// first two and silently dropped Crude Awakening, giving 85 heists instead
	// of 86 with no error anywhere.
	it.each([
		['with the One Down mechanic activated. ', true],
		[
			'with the One Down mechanic activated. Unlocks "The One Down Skull" mask',
			true,
		],
		['with One Down active.', true],
	])('accepts the %j phrasing', (tail, expected) => {
		const d = `Complete the Foo job on the Death Sentence difficulty ${tail}`;
		expect(isOneDown(d)).toBe(expected);
	});

	it('rejects plain Death Sentence achievements', () => {
		// 98 achievements mention Death Sentence WITHOUT One Down - the ordinary
		// difficulty tier. Including them would double the catalog.
		expect(
			isOneDown('Complete the Foo job on the Death Sentence difficulty.'),
		).toBe(false);
	});

	it('rejects One Down without Death Sentence', () => {
		expect(isOneDown('Something about One Down.')).toBe(false);
	});
});

describe('parseHeistName', () => {
	it.each([
		[
			'Complete the Aftershock job on the Death Sentence difficulty.',
			'Aftershock',
		],
		[
			'Complete the Bank Heist: Gold job on the Death Sentence difficulty.',
			'Bank Heist: Gold',
		],
		[
			'Complete The Alesso Heist on the Death Sentence difficulty.',
			'The Alesso Heist',
		],
	])('parses %j', (description, expected) => {
		expect(parseHeistName(description)).toBe(expected);
	});

	/**
	 * The one that matters most.
	 *
	 * "The Diamond" (Dentist) and "Diamond Heist" (Classic) are different
	 * heists. Stripping the word "Heist" as well as "job" collapsed both to
	 * "Diamond", so one silently inherited the other's contractor and
	 * difficulty. Only the trailing " job" may be stripped.
	 */
	it('keeps The Diamond and Diamond Heist distinct', () => {
		const dentist = parseHeistName(
			'Complete The Diamond job on the Death Sentence difficulty.',
		);
		const classic = parseHeistName(
			'Complete the Diamond Heist on the Death Sentence difficulty.',
		);
		expect(dentist).toBe('The Diamond');
		expect(classic).toBe('Diamond Heist');
		expect(dentist).not.toBe(classic);
	});

	it('returns null when the description does not match', () => {
		expect(parseHeistName('Kill 100 enemies.')).toBeNull();
	});
});

describe('isMeta', () => {
	it('detects whole-contractor achievements', () => {
		expect(isMeta("all of Vlad's contracts")).toBe(true);
		expect(isMeta('all contracts')).toBe(true);
	});

	it('leaves real heists alone', () => {
		expect(isMeta('Aftershock')).toBe(false);
	});
});

describe('toPercent', () => {
	it.each([
		[0, 0],
		['4.2', 4.2],
		[100, 100],
	])('accepts %j', (input, expected) => {
		expect(toPercent(input)).toBe(expected);
	});

	/**
	 * Two distinct traps, both producing a plausible number.
	 *
	 * NaN: Number('x') is NaN, and NaN fails BOTH `< 0` and `> 100` because
	 * every comparison with NaN is false, so a range check PASSES it.
	 *
	 * Zero: Number('') and Number(null) are 0, not NaN. A missing percentage
	 * would coerce to a genuine-looking 0.0% - and 0.00% is a real value here
	 * (Under the Hammer), so it would be undetectable. This test found that
	 * second case in the first version of the fix.
	 */
	it.each([[''], ['x'], [NaN], [undefined], [null], [Infinity]])(
		'rejects %j',
		(input) => {
			expect(toPercent(input)).toBeNull();
		},
	);

	it('rejects out-of-range values', () => {
		expect(toPercent(-1)).toBeNull();
		expect(toPercent(101)).toBeNull();
	});

	it('a naive range check would have let NaN through', () => {
		// Documents the trap rather than the fix.
		const naive = (n) => !(n < 0 || n > 100);
		expect(naive(NaN)).toBe(true);
		expect(toPercent(NaN)).toBeNull();
	});
});

describe('quote', () => {
	/**
	 * Five heists contain an apostrophe. A blunt
	 * JSON.stringify().replace('"', "'") turned "Breakin' Feds" into
	 * 'Breakin' Feds' - an unterminated string that broke the entire generated
	 * catalog, not just that row.
	 */
	it.each([
		"Breakin' Feds",
		"Buluc's Mansion",
		"Hell's Island",
		"Henry's Rock",
		"Santa's Workshop",
	])('escapes the apostrophe in %s', (name) => {
		const literal = quote(name);
		// The emitted literal must evaluate back to the original string.
		expect(eval(literal)).toBe(name);
	});

	it('escapes backslashes', () => {
		expect(eval(quote('a\\b'))).toBe('a\\b');
	});

	it('round-trips plain names', () => {
		expect(eval(quote('Aftershock'))).toBe('Aftershock');
	});
});

describe('iconHash', () => {
	const HASH = '08d37aeefa986b4792be0a2c20ee24eb27291776';

	// Steam serves identical bytes from several hosts and the two schema
	// sources return different ones, so only the hash is stable.
	it.each([
		`https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/218620/${HASH}.jpg`,
		`https://shared.fastly.steamstatic.com/community_assets/images/apps/218620/${HASH}.jpg`,
		`https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/218620/${HASH}.jpg`,
	])('extracts the same hash regardless of CDN host', (url) => {
		expect(iconHash(url)).toBe(HASH);
	});

	it('returns null for anything else', () => {
		expect(iconHash('')).toBeNull();
		expect(iconHash(undefined)).toBeNull();
		expect(iconHash('https://example.com/not-a-hash.jpg')).toBeNull();
	});
});
