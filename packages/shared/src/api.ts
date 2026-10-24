/**
 * The contract between the API and the web app.
 *
 * Lives here rather than in @pd2/api so the browser can import these types
 * without pulling in the AWS SDK.
 */

export interface PlayerProgress {
	readonly steamId: string;
	/** Steam persona name, used as the column label. */
	readonly name: string;
	readonly completed: number;
	/** Heist id -> unix unlock time. An absent key means not cleared. */
	readonly unlocked: Readonly<Record<string, number>>;
	/** Set when this player's data could not be read; `unlocked` is then empty. */
	readonly error?: string;
}

export interface ProgressResult {
	readonly fetchedAt: string;
	/** Number of heists in the catalog, i.e. the denominator. */
	readonly total: number;
	readonly players: readonly PlayerProgress[];
}
