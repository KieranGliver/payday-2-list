import { describe, expect, it } from 'vitest';

import { ConfigError, parsePlayers } from './players.js';

const R = '76561198103504838';
const K = '76561198096708910';

/**
 * PD2_PLAYERS used to be split by hand with no validation, so a malformed
 * Steam ID surfaced later as a per-player Steam HTTP 400 - which reads as
 * "that player's profile is broken" rather than "your config is wrong".
 */
describe('parsePlayers', () => {
	it('parses a well-formed pair', () => {
		expect(parsePlayers(`${R}:yogizmo,${K}:Eggsenbacon`)).toEqual([
			{ steamId: R, name: 'yogizmo' },
			{ steamId: K, name: 'Eggsenbacon' },
		]);
	});

	it('tolerates surrounding whitespace', () => {
		expect(parsePlayers(` ${R} : yogizmo , ${K} : Eggsenbacon `)).toEqual([
			{ steamId: R, name: 'yogizmo' },
			{ steamId: K, name: 'Eggsenbacon' },
		]);
	});

	// Splitting on every colon would truncate the name at the first one.
	it('splits on the first colon only, so names may contain colons', () => {
		expect(parsePlayers(`${R}:yo:gizmo`)).toEqual([
			{ steamId: R, name: 'yo:gizmo' },
		]);
	});

	it.each([
		['unset', undefined],
		['empty', ''],
		['whitespace only', '   '],
		['no colon', 'yogizmo'],
		['non-numeric id', 'abc:yogizmo'],
		['id too short', '7656119810:yogizmo'],
		['id with wrong prefix', '12345678901234567:yogizmo'],
		['missing name', `${R}:`],
		['missing name with spaces', `${R}:   `],
	])('rejects %s', (_label, raw) => {
		expect(() => parsePlayers(raw)).toThrow(ConfigError);
	});

	// Duplicates produce duplicate React keys and make the players.find in
	// sort.ts ambiguous about which column it is sorting.
	it('rejects a duplicate steam id', () => {
		expect(() => parsePlayers(`${R}:a,${R}:b`)).toThrow(/duplicate/i);
	});

	// Each player is one Steam call per request, fanned out concurrently.
	it('rejects more players than the fan-out allows', () => {
		const many = Array.from(
			{ length: 9 },
			(_, i) => `765611981035048${String(i).padStart(2, '0')}:p${i}`,
		).join(',');
		expect(() => parsePlayers(many)).toThrow(/more than/i);
	});

	it('names the offending entry in the message', () => {
		expect(() => parsePlayers('nope')).toThrow(/nope/);
	});

	it('prefixes errors with the variable name', () => {
		expect(() => parsePlayers(undefined)).toThrow(/^PD2_PLAYERS:/);
	});
});
