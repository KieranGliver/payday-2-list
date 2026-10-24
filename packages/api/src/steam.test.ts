import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSteamClient, SteamError } from './steam.js';

const ID = '76561198103504838';
const KEY = '0'.repeat(32);

/** Replaces global fetch with a canned response. */
function stubFetch(
	body: unknown,
	{ ok = true, status = 200, json = true } = {},
) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => ({
			ok,
			status,
			json: async () => {
				if (!json) throw new SyntaxError("Unexpected token '<'");
				return body;
			},
		})),
	);
}

const achievements = (items: unknown[]) => ({
	playerstats: { success: true, achievements: items },
});

afterEach(() => vi.unstubAllGlobals());

describe('createSteamClient', () => {
	it('keeps only unlocked achievements, mapped to their unlock time', async () => {
		stubFetch(
			achievements([
				{ apiname: 'axe_45', achieved: 1, unlocktime: 1_700_000_000 },
				{ apiname: 'dah_7', achieved: 0, unlocktime: 0 },
			]),
		);
		const unlocked = await createSteamClient(KEY).getUnlocked(ID);
		expect([...unlocked]).toEqual([['axe_45', 1_700_000_000]]);
	});

	it('handles a player with no achievements at all', async () => {
		stubFetch({ playerstats: { success: true } });
		expect((await createSteamClient(KEY).getUnlocked(ID)).size).toBe(0);
	});

	/**
	 * The response used to be cast with `as RawResponse`, so none of these were
	 * detected. The achieved-as-boolean case is the dangerous one: it would
	 * have reported EVERY player at 0/86 with no error at all.
	 */
	describe('rejects malformed responses', () => {
		it.each([
			['an empty body', {}],
			[
				'achievements as an object',
				achievements([] as never) && {
					playerstats: { success: true, achievements: {} },
				},
			],
			[
				'achieved as a boolean',
				achievements([{ apiname: 'x', achieved: true, unlocktime: 1 }]),
			],
			[
				'achieved as a string',
				achievements([{ apiname: 'x', achieved: '1', unlocktime: 1 }]),
			],
			[
				'unlocktime as a string',
				achievements([{ apiname: 'x', achieved: 1, unlocktime: 'yesterday' }]),
			],
			['a missing apiname', achievements([{ achieved: 1, unlocktime: 1 }])],
			[
				'an empty apiname',
				achievements([{ apiname: '', achieved: 1, unlocktime: 1 }]),
			],
			[
				'a negative unlocktime',
				achievements([{ apiname: 'x', achieved: 1, unlocktime: -1 }]),
			],
			['a null body', null],
		])('%s', async (_label, body) => {
			stubFetch(body);
			await expect(
				createSteamClient(KEY).getUnlocked(ID),
			).rejects.toMatchObject({ kind: 'malformed' });
		});

		// A 200 carrying HTML used to escape as a raw SyntaxError and be shown
		// beside the player's name - a Steam infrastructure problem presented as
		// that player's problem.
		it('a 200 with a non-JSON body', async () => {
			stubFetch(null, { json: false });
			await expect(
				createSteamClient(KEY).getUnlocked(ID),
			).rejects.toMatchObject({ kind: 'malformed' });
		});
	});

	it('classifies a hidden profile as private, not as an outage', async () => {
		stubFetch({
			playerstats: { success: false, error: 'Profile is not public' },
		});
		await expect(createSteamClient(KEY).getUnlocked(ID)).rejects.toMatchObject({
			kind: 'private',
			message: 'Profile is not public',
		});
	});

	it('classifies an HTTP error as unavailable', async () => {
		stubFetch({}, { ok: false, status: 403 });
		await expect(createSteamClient(KEY).getUnlocked(ID)).rejects.toMatchObject({
			kind: 'unavailable',
		});
	});

	it('classifies a network failure as unavailable', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('fetch failed');
			}),
		);
		await expect(createSteamClient(KEY).getUnlocked(ID)).rejects.toMatchObject({
			kind: 'unavailable',
		});
	});

	it('reports a timeout distinctly', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				const e = new Error('The operation was aborted');
				e.name = 'TimeoutError';
				throw e;
			}),
		);
		await expect(createSteamClient(KEY).getUnlocked(ID)).rejects.toThrow(
			/did not respond within/,
		);
	});

	/** The URL carries the API key, so it must never reach a message. */
	it('never leaks the api key in an error', async () => {
		const secret = 'a'.repeat(32);
		stubFetch({}, { ok: false, status: 403 });
		await expect(createSteamClient(secret).getUnlocked(ID)).rejects.not.toThrow(
			new RegExp(secret),
		);
	});

	it('bounds the request with an abort signal', async () => {
		// Parameters declared so mock.calls is typed as [url, init] rather than
		// an empty tuple.
		const spy = vi.fn(async (_url: unknown, _init?: RequestInit) => ({
			ok: true,
			status: 200,
			json: async () => achievements([]),
		}));
		vi.stubGlobal('fetch', spy);
		await createSteamClient(KEY).getUnlocked(ID);
		const init = spy.mock.calls[0]?.[1];
		expect(init?.signal).toBeInstanceOf(AbortSignal);
	});

	it('throws SteamError, carrying the player it concerns', async () => {
		stubFetch({}, { ok: false, status: 500 });
		const err = await createSteamClient(KEY)
			.getUnlocked(ID)
			.catch((e: unknown) => e);
		expect(err).toBeInstanceOf(SteamError);
		expect((err as SteamError).steamId).toBe(ID);
	});
});
