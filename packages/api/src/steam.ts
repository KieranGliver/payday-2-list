import { z } from 'zod';

/** Payday 2. */
const APPID = 218620;

const ENDPOINT =
	'https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/';

/**
 * Steam is usually fast; this exists so a hung endpoint fails with a clear
 * message instead of running into the Lambda's own 10s ceiling and dying as an
 * opaque "Task timed out".
 */
const TIMEOUT_MS = 5_000;

/** Why a player's data could not be read. Lets callers react differently. */
export type SteamFailure =
	/** Profile is private or game details are hidden. Permanent until the user changes it. */
	| 'private'
	/** Steam answered, but not with the shape we expect. */
	| 'malformed'
	/** Network, timeout, or an HTTP error. Likely transient. */
	| 'unavailable';

export class SteamError extends Error {
	readonly steamId: string;
	readonly kind: SteamFailure;

	// Fields assigned explicitly rather than via constructor parameter
	// properties: those are not erasable syntax, which erasableSyntaxOnly
	// rejects.
	constructor(kind: SteamFailure, message: string, steamId: string) {
		super(message);
		this.name = 'SteamError';
		this.kind = kind;
		this.steamId = steamId;
	}
}

/**
 * Steam's GetPlayerAchievements response.
 *
 * `achieved` is coerced from a number because Steam documents 0/1 and we rely
 * on it: the previous `as RawResponse` cast meant that if Steam ever switched
 * to booleans, every achievement would read as locked and every player would
 * report 0/86 with no error at all - a confidently wrong answer.
 */
const achievementSchema = z.object({
	apiname: z.string().min(1),
	achieved: z.union([z.literal(0), z.literal(1)]),
	unlocktime: z.number().int().nonnegative(),
});

const responseSchema = z.object({
	playerstats: z.object({
		success: z.boolean().optional(),
		error: z.string().optional(),
		achievements: z.array(achievementSchema).optional(),
	}),
});

/** Maps a Steam achievement id to the unix time it was unlocked. */
export type Unlocked = ReadonlyMap<string, number>;

export interface SteamClient {
	getUnlocked(steamId: string): Promise<Unlocked>;
}

/**
 * Reads unlocked achievements for a player.
 *
 * Steam returns all ~1342 achievements with an `achieved` flag; we keep only
 * the unlocked ones and their `unlocktime`, which is why no completion history
 * needs storing anywhere.
 */
export function createSteamClient(apiKey: string): SteamClient {
	return {
		async getUnlocked(steamId) {
			const url = new URL(ENDPOINT);
			url.searchParams.set('key', apiKey);
			url.searchParams.set('steamid', steamId);
			url.searchParams.set('appid', String(APPID));

			let res: Response;
			try {
				res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
			} catch (cause) {
				const timedOut =
					cause instanceof Error && cause.name === 'TimeoutError';
				throw new SteamError(
					'unavailable',
					timedOut
						? `Steam did not respond within ${TIMEOUT_MS}ms`
						: 'could not reach Steam',
					steamId,
				);
			}

			if (!res.ok) {
				// Never surface the URL - it contains the API key.
				throw new SteamError(
					'unavailable',
					`Steam returned HTTP ${res.status}`,
					steamId,
				);
			}

			// A 200 carrying HTML or an empty body throws here. Previously this
			// escaped as a raw SyntaxError and was shown beside the player's
			// name, presenting a Steam infrastructure problem as that player's.
			let body: unknown;
			try {
				body = await res.json();
			} catch {
				throw new SteamError(
					'malformed',
					'Steam returned a non-JSON body',
					steamId,
				);
			}

			const parsed = responseSchema.safeParse(body);
			if (!parsed.success) {
				const [first] = parsed.error.issues;
				throw new SteamError(
					'malformed',
					`unexpected response shape at ${first?.path.join('.') || '(root)'}`,
					steamId,
				);
			}

			const stats = parsed.data.playerstats;
			if (!stats.success) {
				// Steam reports a hidden profile this way rather than with an
				// HTTP status.
				throw new SteamError(
					'private',
					stats.error ?? 'profile is not public',
					steamId,
				);
			}

			return new Map(
				(stats.achievements ?? [])
					.filter((a) => a.achieved === 1)
					.map((a) => [a.apiname, a.unlocktime] as const),
			);
		},
	};
}
