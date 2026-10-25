import {
	CATALOG,
	LADDER_IDS,
	META_ACHIEVEMENTS,
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
 * achievements and we care about 86 of them, plus the 602 difficulty rungs
 * that are summarised into `ladder` rather than returned individually.
 */
/**
 * The highest rung this player has cleared, or 0 for none.
 *
 * Scans the WHOLE ladder and takes the highest hit rather than stopping at
 * the first gap.
 *
 * Steam awards an "or above" achievement retroactively, so an uninterrupted
 * ladder is the normal case - on our own two accounts the two approaches
 * agree on all 86 heists today. But they are not equivalent in general: the
 * plain Death Sentence achievements shipped in a later update and were never
 * backfilled, which is why for 56 of 86 heists that rung has a LOWER global
 * unlock percentage than the One Down achievement above it. Anyone who
 * stopped playing before that update holds the rungs around it and not it.
 *
 * Taking the highest can never report lower than the player actually is;
 * stopping at a gap can. That asymmetry is the whole reason for the choice.
 */
function highestRung(
	unlocked: ReadonlyMap<string, number>,
	rungIds: readonly string[],
): number {
	let highest = 0;
	for (const [i, id] of rungIds.entries()) {
		if (unlocked.has(id)) highest = i + 1;
	}
	return highest;
}

export async function getProgress(
	players: readonly Player[],
	client: SteamClient,
): Promise<ProgressResult> {
	const results = await Promise.all(
		players.map(async (player): Promise<PlayerProgress> => {
			try {
				const unlocked = await client.getUnlocked(player.steamId);
				const mine: Record<string, number> = {};
				const ladder: Record<string, number> = {};
				let completed = 0;
				for (const heist of CATALOG) {
					const at = unlocked.get(heist.id);
					if (at !== undefined) {
						mine[heist.id] = at;
						completed += 1;
					}
					ladder[heist.id] = highestRung(unlocked, LADDER_IDS[heist.id]);
				}
				// The whole-contractor achievements ride along in the same map so
				// the badge wall can read Steam's own verdict, but they are NOT
				// counted in `completed` - that is a heist count, and including
				// them would inflate it past the catalog size.
				for (const meta of META_ACHIEVEMENTS) {
					const at = unlocked.get(meta.id);
					if (at !== undefined) mine[meta.id] = at;
				}
				return {
					status: 'ok',
					steamId: player.steamId,
					name: player.name,
					completed,
					unlocked: mine,
					ladder,
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
