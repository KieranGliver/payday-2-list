import { CATALOG, type PlayerProgress, type ProgressResult } from '@pd2/shared';
import { SteamError, type SteamClient } from './steam.js';

export type { PlayerProgress, ProgressResult };

export interface Player {
	readonly steamId: string;
	/** Steam persona name, used as the column label. */
	readonly name: string;
}

/**
 * One Down progress for each player.
 *
 * Steam is queried per player in parallel. A player whose profile is private
 * yields an `error` rather than failing the whole response, so one broken
 * profile doesn't blank the UI for everyone.
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
					steamId: player.steamId,
					name: player.name,
					completed: Object.keys(mine).length,
					unlocked: mine,
				};
			} catch (cause) {
				const error =
					cause instanceof SteamError ? cause.message : String(cause);
				return {
					steamId: player.steamId,
					name: player.name,
					completed: 0,
					unlocked: {},
					error,
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
