import {
	CATALOG,
	type Player,
	type PlayerProgress,
	type ProgressResult,
} from '@pd2/shared';

import { SteamError, type SteamClient } from './steam.js';

export type { Player, PlayerProgress, ProgressResult };

/**
 * One Down progress for each player.
 *
 * Steam is queried per player in parallel. A player whose profile is private
 * yields a `failed` entry rather than failing the whole response, so one
 * broken profile doesn't blank the UI for everyone - but it is returned as a
 * distinct variant, not as a zero count, so consumers cannot mistake "could
 * not read" for "has cleared nothing".
 *
 * Only achievements in the catalog are returned - Payday 2 has ~1342
 * achievements and we care about 86 of them.
 */
export async function getProgress(
	players: readonly Player[],
	client: SteamClient,
): Promise<ProgressResult> {
	const results = await Promise.all(
		players.map(async (player): Promise<PlayerProgress> => {
			try {
				const unlocked = await client.getUnlocked(player.steamId);
				const mine: Record<string, number> = {};
				for (const heist of CATALOG) {
					const at = unlocked.get(heist.id);
					if (at !== undefined) mine[heist.id] = at;
				}
				return {
					status: 'ok',
					steamId: player.steamId,
					name: player.name,
					completed: Object.keys(mine).length,
					unlocked: mine,
				};
			} catch (cause) {
				// Only SteamError messages are known to be safe to show. Anything
				// else could carry internal detail, so it is logged and replaced.
				if (!(cause instanceof SteamError)) {
					console.error(`unexpected failure reading ${player.steamId}`, cause);
				}
				return {
					status: 'failed',
					steamId: player.steamId,
					name: player.name,
					reason:
						cause instanceof SteamError
							? cause.message
							: 'could not read this profile',
				};
			}
		}),
	);

	return {
		fetchedAt: new Date().toISOString(),
		total: CATALOG.length,
		players: results,
	};
}
