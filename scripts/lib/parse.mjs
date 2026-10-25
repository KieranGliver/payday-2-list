/**
 * Pure parsing helpers for the Steam catalog generator.
 *
 * Extracted from sync-steam.mjs so they can be tested without network access.
 * Every bug this generator has shipped lived in one of these four functions,
 * and each produced output that was wrong but perfectly parseable:
 *
 *   - an exact-phrase One Down filter silently dropped Crude Awakening
 *   - stripping "heist" as well as "job" collapsed two different heists
 *     ("The Diamond" and "Diamond Heist") into one name
 *   - a blunt quote replacement broke every heist with an apostrophe
 *   - Number('') produced NaN, which passes any range check
 */

/**
 * Marks a One Down achievement.
 *
 * Steam uses at least three phrasings ("with the One Down mechanic activated",
 * the same plus a mask unlock note, and "with One Down active"), so matching
 * an exact phrase silently drops heists. Requiring both keywords is stable: of
 * 1342 achievements, 98 mention "One Down" and all 98 also mention "Death
 * Sentence", while 98 others mention Death Sentence alone (the plain
 * difficulty tier, correctly excluded) and none mention One Down alone.
 */
export const isOneDown = (description) =>
	description.includes('Death Sentence') && description.includes('One Down');

/** Achievements for completing a whole contractor's set, not a single heist. */
export const isMeta = (name) => name.startsWith('all ');

/**
 * Steam serves the same icon from several CDN hosts (akamai, fastly,
 * cloudflare) with byte-identical content, and the two schema sources return
 * different hosts. Only the 40-char hash is stable, so that is what the
 * catalog stores; the URL is rebuilt in the app.
 */
export const iconHash = (url) =>
	/([0-9a-f]{40})\.jpg/.exec(url ?? '')?.[1] ?? null;

/**
 * "Complete the Aftershock job on the Death Sentence difficulty..." -> "Aftershock"
 *
 * Strips a lowercase leading "the " and a trailing " job", which keeps the two
 * genuinely different heists distinguishable: "The Diamond" (Dentist) vs
 * "Diamond Heist" (Classic). Both would collapse to "Diamond" if the word
 * "Heist" were stripped too.
 */
export function parseHeistName(description) {
	const m = /^Complete (.+?) on the Death Sentence/i.exec(description.trim());
	if (!m) return null;
	return m[1].replace(/^the /, '').replace(/ job$/, '').trim();
}

/**
 * A percentage, or null if the value is not one.
 *
 * Two separate traps, both of which produce a plausible number:
 *
 *   - Number('x') is NaN, and NaN fails BOTH `< 0` and `> 100` because every
 *     comparison with NaN is false. A range check therefore PASSES a NaN,
 *     which emits as a valid number literal and renders as "NaN%".
 *   - Number('') and Number(null) are 0, NOT NaN. So a missing percentage
 *     would coerce to a genuine-looking 0.0%, indistinguishable from a real
 *     one (Under the Hammer is legitimately 0.00%). Hence the explicit type
 *     and empty-string rejection before coercing.
 */
export function toPercent(value) {
	if (typeof value !== 'number' && typeof value !== 'string') return null;
	if (typeof value === 'string' && value.trim() === '') return null;
	const n = Number(value);
	if (!Number.isFinite(n) || n < 0 || n > 100) return null;
	return n;
}

/**
 * Single-quoted JS string literal with proper escaping.
 *
 * A blunt JSON.stringify().replace('"', "'") breaks on names containing an
 * apostrophe, turning "Breakin' Feds" into an unterminated literal and making
 * the entire generated catalog fail to parse.
 */
export const quote = (v) =>
	`'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** The seven rungs below One Down, ascending. Mirrors LADDER_RUNGS in shared. */
export const LADDER_RUNGS = [
	'Normal',
	'Hard',
	'Very Hard',
	'OVERKILL',
	'Mayhem',
	'Death Wish',
	'Death Sentence',
];

/** Literal text, safe to embed in a RegExp. */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Descriptions arrive with escaping artefacts and irregular whitespace from
 * whichever source produced them. Normalising once keeps the rung patterns
 * readable instead of threading `\s*` through every one of them.
 */
export const normaliseDescription = (d) =>
	(d ?? '').replaceAll('\\', '').replace(/\s+/g, ' ').trim();

/**
 * Matches "Complete [the] <heist> [job] on the <rung> difficulty [or above]".
 *
 * Built from a KNOWN heist name rather than parsing a name out of the
 * description, which is the only approach that survives Steam's real data.
 * Four separate traps, each of which silently costs rungs:
 *
 *   - Trailing reward prose. "...on the Normal difficulty or above. Unlocks
 *     the "Winter Camo Parka" outfit." An end-anchored match drops the rung,
 *     so this matches a PREFIX and stops at the sentence end.
 *   - "Ukrainian Job" ends in "Job". Stripping a trailing " job" from a parsed
 *     name turns it into "Ukrainian", which matches nothing. Same family as
 *     the "The Diamond" / "Diamond Heist" trap.
 *   - "The Alesso Heist" is written "Complete the Alesso Heist" on its Normal
 *     rung and "Complete The Alesso Heist" on the other six, so the leading
 *     article is optional in BOTH cases.
 *   - Conditional achievements over-match under a lazy capture: "Complete the
 *     Framing Frame job on the OVERKILL difficulty or above with each crew
 *     member using no skills..." reads as a second OVERKILL rung. Anchoring
 *     the known name immediately before " on the" makes that impossible.
 *
 * "Death Sentence" has no "or above" - it is the top of this ladder.
 */
export function rungPattern(heistName, rung) {
	const name = escapeRe(heistName.replace(/^The /, ''));
	const tail = rung === 'Death Sentence' ? '' : ' or above';
	return new RegExp(
		`^Complete (?:[Tt]he )?${name}(?: job)? on the ${rung} difficulty${tail}(?:\\.|$)`,
	);
}

/**
 * The seven rung achievement ids for one heist, ascending.
 *
 * Throws rather than returning a partial ladder: a heist missing a rung means
 * the pattern has drifted from Steam's wording, and silently emitting six
 * rungs would understate every player's position on it forever.
 */
export function rungIdsFor(heistName, achievements) {
	return LADDER_RUNGS.map((rung) => {
		const re = rungPattern(heistName, rung);
		const hits = achievements.filter((a) =>
			re.test(normaliseDescription(a.description)),
		);
		if (hits.length !== 1) {
			throw new Error(
				`${heistName}: expected exactly one "${rung}" achievement, found ` +
					`${hits.length}${hits.length ? ` (${hits.map((h) => h.id).join(', ')})` : ''}`,
			);
		}
		return hits[0].id;
	});
}
