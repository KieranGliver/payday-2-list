/**
 * The contract between the API and the web app.
 *
 * Lives here rather than in @pd2/api so the browser can import it without
 * pulling in the AWS SDK.
 *
 * The schemas are the source of truth and the types are inferred from them, so
 * shape and validation cannot drift apart.
 */
import { z } from 'zod';

import { LADDER_RUNGS } from './types.js';

/** SteamID64: 17 digits, always beginning 7656119. */
export const steamIdSchema = z
	.string()
	.regex(/^7656119\d{10}$/, 'not a SteamID64 (expected 7656119 + 10 digits)');

export const playerSchema = z.object({
	steamId: steamIdSchema,
	/** Steam persona name, used as the column label. */
	name: z.string().min(1),
});
export type Player = z.infer<typeof playerSchema>;

/**
 * Heist id -> unix unlock time. An absent key means not cleared.
 *
 * Keys are validated as plain strings rather than an enum of known heist ids
 * on purpose. A stricter key type would reject the entire payload during
 * version skew - a freshly deployed browser bundle talking to a Lambda built
 * against an older catalog - turning a cosmetic mismatch into a blank page.
 * Precision lives in the accessors below instead.
 */
const unlockedSchema = z.record(z.string(), z.number().int().nonnegative());

/**
 * Heist id -> the highest difficulty rung this player has cleared it on.
 *
 * 0 means "never completed on any difficulty"; 1-7 index LADDER_RUNGS. The One
 * Down clear itself is not a rung - that lives in `unlocked`.
 *
 * Recommender input only; nothing reads this for display. Keys are loose
 * strings for the same version-skew reason as `unlocked` above.
 */
const ladderSchema = z.record(
	z.string(),
	z.number().int().min(0).max(LADDER_RUNGS.length),
);

/**
 * A player's progress, as a discriminated union.
 *
 * The previous shape was a single object with an optional `error`, which meant
 * a failed read still carried `completed: 0` and `unlocked: {}` - values that
 * look like real answers. Consumers could, and did, read counts straight off a
 * failed player: one private profile silently drove the headline figure to
 * zero with no indication it was unknown rather than none.
 */
export const playerProgressSchema = z.discriminatedUnion('status', [
	z.object({
		status: z.literal('ok'),
		steamId: steamIdSchema,
		name: z.string(),
		completed: z.number().int().nonnegative(),
		unlocked: unlockedSchema,
		/**
		 * Defaulted, not required. Built assets are served immutable, so during
		 * a deploy a cached bundle can talk to a Lambda that predates this
		 * field. Requiring it would fail the whole parse and blank the page to
		 * lose one recommender input; defaulting leaves every rung `undefined`,
		 * which `ladderRung` already reports as unknown.
		 */
		ladder: ladderSchema.default({}),
	}),
	z.object({
		status: z.literal('failed'),
		steamId: steamIdSchema,
		name: z.string(),
		/** Why this player could not be read. Safe to show a user. */
		reason: z.string(),
	}),
]);
export type PlayerProgress = z.infer<typeof playerProgressSchema>;

export const progressResultSchema = z.object({
	fetchedAt: z.iso.datetime(),
	/**
	 * The catalog size the SERVER used. The client must prefer this over its
	 * own CATALOG.length: built assets are served immutable, so a cached
	 * bundle can be running against a newer Lambda with a different catalog.
	 */
	total: z.number().int().positive(),
	players: z.array(playerProgressSchema),
});
export type ProgressResult = z.infer<typeof progressResultSchema>;

/** Error envelope returned by the API for server-side failures. */
export const apiErrorSchema = z.object({
	error: z.string(),
	/** Stable, machine-readable. Lets the UI tell misconfiguration from outage. */
	code: z.enum(['misconfigured', 'upstream_failed', 'unexpected']),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export class ContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ContractError';
	}
}

/** Parses an unknown payload as a ProgressResult, or throws ContractError. */
export function parseProgressResult(input: unknown): ProgressResult {
	const result = progressResultSchema.safeParse(input);
	if (result.success) return result.data;
	const [first] = result.error.issues;
	const where = first?.path.join('.') || '(root)';
	throw new ContractError(
		`API response did not match the contract at ${where}: ${first?.message ?? 'unknown'}`,
	);
}

/**
 * When this player cleared the heist, or undefined if they have not.
 *
 * Takes a plain string rather than HeistId: the Heist interface declares
 * `id: string`, so demanding the narrow union would force a cast at every
 * call site. The value of these accessors is encapsulating the status check,
 * not the key type.
 */
export function unlockedAt(
	player: PlayerProgress,
	heistId: string,
): number | undefined {
	return player.status === 'ok' ? player.unlocked[heistId] : undefined;
}

/**
 * How far up the difficulty ladder this player has cleared the heist.
 *
 * `undefined` means UNKNOWN - the read failed, or this heist is absent from
 * the payload because a cached bundle is talking to an older Lambda. It does
 * NOT mean rung 0, which is the real, known answer "never completed on any
 * difficulty". Conflating the two is the bug that once reported a private
 * profile as zero progress, and it would push a heist the pair have never
 * touched to the top of the recommendations.
 */
export function ladderRung(
	player: PlayerProgress,
	heistId: string,
): number | undefined {
	return player.status === 'ok' ? player.ladder[heistId] : undefined;
}

/**
 * Whether this player has definitely cleared the heist.
 *
 * A failed player is never "cleared" - but callers that care about the
 * difference must check `status` themselves rather than reading false as "no".
 */
export function hasCleared(player: PlayerProgress, heistId: string): boolean {
	return player.status === 'ok' && heistId in player.unlocked;
}

/** Players whose data was read successfully. */
export function okPlayers(
	players: readonly PlayerProgress[],
): readonly Extract<PlayerProgress, { status: 'ok' }>[] {
	return players.filter((p) => p.status === 'ok');
}
