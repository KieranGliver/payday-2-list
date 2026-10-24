/**
 * Parses the PD2_PLAYERS configuration.
 *
 * Lives here because it is needed in two places that must agree: the Lambda's
 * config.ts and the Vite dev-server middleware. They previously had separate
 * implementations which behaved differently - the dev one accepted a nameless
 * entry that production rejected - quietly defeating the "both run identical
 * logic" guarantee the middleware claims.
 */
import { z } from 'zod';

import { playerSchema, type Player } from './api.js';

/** How many players the endpoint will fan out to in one request. */
const MAX_PLAYERS = 8;

export class ConfigError extends Error {
	constructor(message: string) {
		super(`PD2_PLAYERS: ${message}`);
		this.name = 'ConfigError';
	}
}

const entrySchema = z
	.string()
	.min(1)
	.transform((entry, ctx) => {
		// Split on the FIRST colon only: persona names may contain colons.
		const colon = entry.indexOf(':');
		if (colon === -1) {
			ctx.addIssue({
				code: 'custom',
				message: `entry is not "steamid:name": ${entry}`,
			});
			return z.NEVER;
		}
		return {
			steamId: entry.slice(0, colon).trim(),
			name: entry.slice(colon + 1).trim(),
		};
	})
	.pipe(playerSchema);

/**
 * `PD2_PLAYERS=76561198103504838:yogizmo,76561198096708910:Eggsenbacon`
 *
 * Validated rather than merely split: a malformed Steam ID previously sailed
 * through and surfaced as a per-player Steam HTTP 400 at request time, which
 * reads as "that player's profile is broken" rather than "your config is
 * wrong". Failing here means it fails once, at startup, naming the entry.
 */
export function parsePlayers(raw: string | undefined): readonly Player[] {
	if (!raw?.trim()) throw new ConfigError('is not set');

	const entries = raw
		.split(',')
		.map((e) => e.trim())
		.filter(Boolean);
	if (entries.length === 0) throw new ConfigError('contained no entries');
	if (entries.length > MAX_PLAYERS) {
		// Each player is one Steam call per request, fanned out concurrently.
		throw new ConfigError(
			`has ${entries.length} entries, more than the ${MAX_PLAYERS} allowed`,
		);
	}

	const players: Player[] = [];
	const seen = new Set<string>();
	for (const entry of entries) {
		const parsed = entrySchema.safeParse(entry);
		if (!parsed.success) {
			throw new ConfigError(
				parsed.error.issues[0]?.message ?? `invalid entry: ${entry}`,
			);
		}
		// Duplicates would produce duplicate React keys and make the
		// players.find in sort.ts ambiguous.
		if (seen.has(parsed.data.steamId)) {
			throw new ConfigError(`duplicate steam id ${parsed.data.steamId}`);
		}
		seen.add(parsed.data.steamId);
		players.push(parsed.data);
	}
	return players;
}
