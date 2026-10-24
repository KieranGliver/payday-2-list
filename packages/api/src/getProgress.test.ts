import { CATALOG } from '@pd2/shared';
import { describe, expect, it } from 'vitest';

import { getProgress } from './getProgress.js';
import { SteamError, type SteamClient } from './steam.js';

const R = { steamId: '76561198103504838', name: 'yogizmo' };
const K = { steamId: '76561198096708910', name: 'Eggsenbacon' };

const FIRST = CATALOG[0]!.id;
const SECOND = CATALOG[1]!.id;

/** A client that answers from a fixture, or throws, per player. */
function fakeClient(
	byPlayer: Record<string, Map<string, number> | Error>,
): SteamClient {
	return {
		async getUnlocked(steamId) {
			const result = byPlayer[steamId];
			if (result instanceof Error) throw result;
			return result ?? new Map();
		},
	};
}

describe('getProgress', () => {
	it("counts only catalog heists, ignoring Steam's other ~1250 achievements", async () => {
		const result = await getProgress(
			[R],
			fakeClient({
				[R.steamId]: new Map([
					[FIRST, 1_700_000_000],
					['not_a_heist', 1_700_000_001],
				]),
			}),
		);
		const [player] = result.players;
		expect(player?.status).toBe('ok');
		expect(player?.status === 'ok' && player.completed).toBe(1);
		expect(player?.status === 'ok' && player.unlocked).toEqual({
			[FIRST]: 1_700_000_000,
		});
	});

	it('reports the catalog size as the denominator', async () => {
		const result = await getProgress([R], fakeClient({}));
		expect(result.total).toBe(CATALOG.length);
	});

	it('returns an ISO timestamp', async () => {
		const result = await getProgress([R], fakeClient({}));
		expect(() => new Date(result.fetchedAt).toISOString()).not.toThrow();
		expect(result.fetchedAt).toBe(new Date(result.fetchedAt).toISOString());
	});

	/**
	 * One broken profile must not blank the page for everyone - but it must
	 * also not masquerade as a zero. This is the bug the discriminated union
	 * exists to make impossible.
	 */
	it('isolates a failed player without failing the request', async () => {
		const result = await getProgress(
			[R, K],
			fakeClient({
				[R.steamId]: new Map([
					[FIRST, 1],
					[SECOND, 2],
				]),
				[K.steamId]: new SteamError(
					'private',
					'Profile is not public',
					K.steamId,
				),
			}),
		);

		const [first, second] = result.players;
		expect(first?.status).toBe('ok');
		expect(second?.status).toBe('failed');
		expect(second?.status === 'failed' && second.reason).toBe(
			'Profile is not public',
		);
	});

	it('a failed player carries no count that could be mistaken for a real one', async () => {
		const result = await getProgress(
			[K],
			fakeClient({
				[K.steamId]: new SteamError('private', 'nope', K.steamId),
			}),
		);
		const [player] = result.players;
		// The old shape carried completed: 0 and unlocked: {} here.
		expect(player).not.toHaveProperty('completed');
		expect(player).not.toHaveProperty('unlocked');
	});

	it('handles every player failing', async () => {
		const result = await getProgress(
			[R, K],
			fakeClient({
				[R.steamId]: new SteamError('unavailable', 'down', R.steamId),
				[K.steamId]: new SteamError('unavailable', 'down', K.steamId),
			}),
		);
		expect(result.players.every((p) => p.status === 'failed')).toBe(true);
		expect(result.total).toBe(CATALOG.length);
	});

	// Internal errors could carry implementation detail, so only SteamError
	// messages are passed through to the browser.
	it('does not forward a non-SteamError message to the client', async () => {
		const result = await getProgress(
			[R],
			fakeClient({
				[R.steamId]: new TypeError('Cannot read properties of undefined'),
			}),
		);
		const [player] = result.players;
		expect(player?.status).toBe('failed');
		expect(player?.status === 'failed' && player.reason).toBe(
			'could not read this profile',
		);
	});

	it('preserves player order and identity', async () => {
		const result = await getProgress([R, K], fakeClient({}));
		expect(result.players.map((p) => p.steamId)).toEqual([
			R.steamId,
			K.steamId,
		]);
		expect(result.players.map((p) => p.name)).toEqual([R.name, K.name]);
	});

	it('returns an empty player list for no players', async () => {
		const result = await getProgress([], fakeClient({}));
		expect(result.players).toEqual([]);
	});
});
