import { describe, expect, it } from 'vitest';

import {
	ContractError,
	hasCleared,
	okPlayers,
	parseProgressResult,
	unlockedAt,
	type PlayerProgress,
} from './api.js';

const R = '76561198103504838';
const K = '76561198096708910';

const ok = (unlocked: Record<string, number>): PlayerProgress => ({
	status: 'ok',
	steamId: R,
	name: 'yogizmo',
	completed: Object.keys(unlocked).length,
	unlocked,
});

const failed = (reason = 'profile is not public'): PlayerProgress => ({
	status: 'failed',
	steamId: K,
	name: 'Eggsenbacon',
	reason,
});

const valid = {
	fetchedAt: '2026-10-24T12:00:00.000Z',
	total: 86,
	players: [ok({ axe_45: 1_700_000_000 }), failed()],
};

describe('parseProgressResult', () => {
	it('accepts a well-formed payload', () => {
		expect(parseProgressResult(valid)).toEqual(valid);
	});

	it.each([
		['missing players', { fetchedAt: valid.fetchedAt, total: 86 }],
		['players not an array', { ...valid, players: 'nope' }],
		['total of zero', { ...valid, total: 0 }],
		['negative total', { ...valid, total: -1 }],
		['fetchedAt not a timestamp', { ...valid, fetchedAt: 'yesterday' }],
		['unknown status', { ...valid, players: [{ ...ok({}), status: 'weird' }] }],
		[
			'ok player missing unlocked',
			{
				...valid,
				players: [{ status: 'ok', steamId: R, name: 'x', completed: 0 }],
			},
		],
		[
			'failed player missing reason',
			{
				...valid,
				players: [{ status: 'failed', steamId: R, name: 'x' }],
			},
		],
		[
			'negative unlock time',
			{
				...valid,
				players: [ok({ axe_45: -1 })],
			},
		],
		['an HTML error page', '<!doctype html>'],
		['null', null],
	])('rejects %s', (_label, payload) => {
		expect(() => parseProgressResult(payload)).toThrow(ContractError);
	});

	// A bare "invalid input" is useless when debugging a live skew.
	it('names the offending path in the message', () => {
		expect(() => parseProgressResult({ ...valid, players: 'nope' })).toThrow(
			/at players/,
		);
	});
});

/**
 * These accessors exist so a failed player can never be read as a zero.
 *
 * The previous shape carried completed: 0 and unlocked: {} on failure, which
 * look like real answers - one private profile silently drove the headline
 * figure to zero.
 */
describe('accessors', () => {
	it('reports a cleared heist', () => {
		expect(hasCleared(ok({ axe_45: 1 }), 'axe_45')).toBe(true);
		expect(unlockedAt(ok({ axe_45: 123 }), 'axe_45')).toBe(123);
	});

	it('reports an uncleared heist', () => {
		expect(hasCleared(ok({ axe_45: 1 }), 'dah_7')).toBe(false);
		expect(unlockedAt(ok({ axe_45: 1 }), 'dah_7')).toBeUndefined();
	});

	it('never reports a failed player as having cleared anything', () => {
		expect(hasCleared(failed(), 'axe_45')).toBe(false);
		expect(unlockedAt(failed(), 'axe_45')).toBeUndefined();
	});

	it('okPlayers drops failed entries', () => {
		const players = [ok({ axe_45: 1 }), failed()];
		expect(okPlayers(players)).toHaveLength(1);
		expect(okPlayers(players)[0]?.status).toBe('ok');
	});

	// The bug this whole shape exists to prevent: counting over ALL players
	// treats "could not read" as "cleared nothing".
	it('counting over ok players differs from counting over all', () => {
		const players = [ok({ axe_45: 1, dah_7: 2 }), failed()];
		const overAll = ['axe_45', 'dah_7'].filter((id) =>
			players.every((p) => hasCleared(p, id)),
		);
		const overOk = ['axe_45', 'dah_7'].filter((id) =>
			okPlayers(players).every((p) => hasCleared(p, id)),
		);
		expect(overAll).toHaveLength(0); // what the old code computed
		expect(overOk).toHaveLength(2); // what it should have computed
	});
});
