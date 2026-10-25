import { describe, expect, it } from 'vitest';

import {
	iconHash,
	isMeta,
	isOneDown,
	normaliseDescription,
	parseHeistName,
	quote,
	rungIdsFor,
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

describe('rungIdsFor', () => {
	/** The seven rungs for one heist, in the wording Steam actually uses. */
	const ladder = (name) => [
		{
			id: 'n',
			description: `Complete the ${name} job on the Normal difficulty or above.`,
		},
		{
			id: 'h',
			description: `Complete the ${name} job on the Hard difficulty or above.`,
		},
		{
			id: 'v',
			description: `Complete the ${name} job on the Very Hard difficulty or above.`,
		},
		{
			id: 'o',
			description: `Complete the ${name} job on the OVERKILL difficulty or above.`,
		},
		{
			id: 'm',
			description: `Complete the ${name} job on the Mayhem difficulty or above.`,
		},
		{
			id: 'w',
			description: `Complete the ${name} job on the Death Wish difficulty or above.`,
		},
		{
			id: 's',
			description: `Complete the ${name} job on the Death Sentence difficulty.`,
		},
	];

	it('returns the seven rungs in ascending order', () => {
		expect(rungIdsFor('Aftershock', ladder('Aftershock'))).toEqual([
			'n',
			'h',
			'v',
			'o',
			'm',
			'w',
			's',
		]);
	});

	// Steam appends reward prose to some rungs. An end-anchored match dropped
	// them, silently emitting a six-rung ladder for Alaskan Deal and seven
	// other heists.
	it('accepts a rung with a trailing unlock note', () => {
		const rungs = ladder('Alaskan Deal');
		rungs[0].description =
			'Complete the Alaskan Deal job on the Normal difficulty or above. ' +
			'Unlocks the "Winter Camo Parka" outfit.';
		expect(rungIdsFor('Alaskan Deal', rungs)[0]).toBe('n');
	});

	// "Ukrainian Job" ends in "Job". Parsing a name out of the description and
	// stripping a trailing " job" turned it into "Ukrainian", which matched
	// nothing at all - the same family as "The Diamond" vs "Diamond Heist".
	it('handles a heist whose name ends in "Job"', () => {
		expect(rungIdsFor('Ukrainian Job', ladder('Ukrainian Job'))).toHaveLength(
			7,
		);
	});

	// Steam writes "Complete the Alesso Heist" on the Normal rung and
	// "Complete The Alesso Heist" on the other six.
	it('accepts either case of the leading article', () => {
		const rungs = ladder('Alesso Heist').map((r) => ({
			...r,
			description: r.description.replace('Complete the', 'Complete The'),
		}));
		rungs[0].description = rungs[0].description.replace(
			'Complete The',
			'Complete the',
		);
		expect(rungIdsFor('The Alesso Heist', rungs)).toHaveLength(7);
	});

	// A conditional achievement names the same heist and the same difficulty,
	// then adds a clause. Under a lazy capture it read as a second OVERKILL
	// rung for Framing Frame and made the ladder ambiguous.
	it('ignores a conditional achievement on the same difficulty', () => {
		const rungs = [
			...ladder('Framing Frame'),
			{
				id: 'conditional',
				description:
					'Complete the Framing Frame job on the OVERKILL difficulty or ' +
					'above with each crew member using no skills, wearing suits, ' +
					'wielding Sniper Rifles and Judge shotguns.',
			},
		];
		expect(rungIdsFor('Framing Frame', rungs)[3]).toBe('o');
	});

	// A partial ladder would understate every player's position on that heist
	// forever, so it must fail the run rather than emit six rungs.
	it('throws rather than returning a partial ladder', () => {
		const rungs = ladder('Aftershock').filter((r) => r.id !== 'm');
		expect(() => rungIdsFor('Aftershock', rungs)).toThrow(/Mayhem/);
	});

	it('throws when two achievements claim the same rung', () => {
		const rungs = [
			...ladder('Aftershock'),
			{
				id: 'dupe',
				description:
					'Complete the Aftershock job on the Mayhem difficulty or above.',
			},
		];
		expect(() => rungIdsFor('Aftershock', rungs)).toThrow(/found 2/);
	});
});

describe('normaliseDescription', () => {
	it('strips escaping artefacts and collapses whitespace', () => {
		expect(normaliseDescription('Complete  the \\"Foo\\" job.\n')).toBe(
			'Complete the "Foo" job.',
		);
	});

	it('treats a missing description as empty', () => {
		expect(normaliseDescription(undefined)).toBe('');
	});
});
