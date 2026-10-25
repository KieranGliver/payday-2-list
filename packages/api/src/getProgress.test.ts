import { CATALOG, LADDER_IDS } from '@pd2/shared';
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

describe('the difficulty ladder', () => {
	const RUNGS = LADDER_IDS[FIRST as keyof typeof LADDER_IDS];

	const rungOf = async (unlocked: Map<string, number>) => {
		const result = await getProgress(
			[R],
			fakeClient({ [R.steamId]: unlocked }),
		);
		const [player] = result.players;
		return player?.status === 'ok' ? player.ladder[FIRST] : undefined;
	};

	it('reports 0 when no rung is unlocked', async () => {
		await expect(rungOf(new Map())).resolves.toBe(0);
	});

	it('reports every heist, not just the ones with progress', async () => {
		const result = await getProgress(
			[R],
			fakeClient({ [R.steamId]: new Map() }),
		);
		const [player] = result.players;
		expect(player?.status === 'ok' && Object.keys(player.ladder)).toHaveLength(
			CATALOG.length,
		);
	});

	it('reports the top rung as 7', async () => {
		await expect(rungOf(new Map(RUNGS.map((id) => [id, 1])))).resolves.toBe(7);
	});

	it('reports a partial climb by its highest rung', async () => {
		const upToMayhem = RUNGS.slice(0, 5).map((id) => [id, 1] as const);
		await expect(rungOf(new Map(upToMayhem))).resolves.toBe(5);
	});

	/**
	 * Steam awards "or above" achievements retroactively, so a gap is unusual
	 * - our own two accounts have none today. It is still reachable: the plain
	 * Death Sentence achievements shipped late and were never backfilled,
	 * which is why that rung has a lower global unlock percentage than One
	 * Down for 56 of 86 heists. Taking the highest can never report lower than
	 * the player is; stopping at a gap can.
	 */
	it('takes the highest rung, not the first gap', async () => {
		const withGap = RUNGS.filter((id) => id !== RUNGS[5]).map(
			(id) => [id, 1] as const,
		);
		await expect(rungOf(new Map(withGap))).resolves.toBe(7);
	});

	it('reports the top rung even when only it is held', async () => {
		await expect(rungOf(new Map([[RUNGS[6]!, 1]]))).resolves.toBe(7);
	});

	// A failed read carries no ladder at all, so "unknown" cannot be misread
	// as "has never completed it".
	it('omits the ladder entirely for a player whose read failed', async () => {
		const result = await getProgress(
			[R],
			fakeClient({
				[R.steamId]: new SteamError(
					'private',
					'profile is not public',
					R.steamId,
				),
			}),
		);
		const [player] = result.players;
		expect(player?.status).toBe('failed');
		expect(player && 'ladder' in player).toBe(false);
	});
});
