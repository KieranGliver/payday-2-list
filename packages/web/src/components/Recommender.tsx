import {
	iconUrl,
	LADDER_RUNGS,
	topFactors,
	weakestFactors,
	type Factors,
	type Recommendation,
} from '@pd2/shared';
import { TriangleAlert } from 'lucide-react';

interface Props {
	readonly recommendations: readonly Recommendation[];
	/** The lowest scorers, worst first. The grind, named rather than left over. */
	readonly worst: readonly Recommendation[];
	/** Shown while progress is still loading, so the panel doesn't flash empty. */
	readonly loading: boolean;
}

/**
 * Why a heist is here, in words someone can act on.
 *
 * These name the actual thing - the difficulty we got to, how many heists are
 * left for the contractor - rather than describing the score. An earlier
 * version said things like "already deep on the difficulty ladder", which
 * describes our arithmetic instead of answering "why this one".
 *
 * Returns null when a term has nothing concrete to say, so a vague clause is
 * dropped rather than padded out.
 */
function reasonFor(rec: Recommendation, term: keyof Factors): string | null {
	const h = rec.heist;
	switch (term) {
		case 'closeness': {
			// rung is 1-7 into LADDER_RUNGS; 0 and undefined have nothing to say.
			const name = rec.rung ? LADDER_RUNGS[rec.rung - 1] : undefined;
			return name ? `you have both already beaten it on ${name}` : null;
		}
		case 'rarity':
			return `plenty of other players have finished it (${h.globalPct.toFixed(1)}%)`;
		case 'ease':
			return `you rated it ${h.perceivedDifficulty.toLowerCase()}`;
		case 'proximity': {
			const n = rec.contractorLeft;
			if (n === null) return null;
			return `only ${n} heist${n === 1 ? '' : 's'} left to finish ${h.contractor}`;
		}
		case 'brevity':
			return h.days === 1
				? 'it only takes one day'
				: `it is a ${h.days}-day job`;
	}
}

/**
 * Why a heist is at the BOTTOM, in the same plain terms as the good list.
 *
 * Phrased as the thing that is wrong with it rather than as a missing score,
 * and null where there is nothing to complain about.
 */
function reasonAgainst(
	rec: Recommendation,
	term: keyof Factors,
): string | null {
	const h = rec.heist;
	switch (term) {
		case 'closeness':
			if (rec.rung === undefined) return null;
			return rec.rung === 0
				? 'neither of you has ever finished it'
				: `you have only got to ${LADDER_RUNGS[rec.rung - 1]} on it`;
		case 'rarity':
			return `hardly anyone finishes it (${h.globalPct.toFixed(1)}%)`;
		case 'ease':
			return `you rated it ${h.perceivedDifficulty.toLowerCase()}`;
		case 'proximity':
			return rec.contractorLeft === null
				? `${h.contractor} has no badge to earn`
				: `${h.contractor} is still ${rec.contractorLeft} heists off`;
		case 'brevity':
			return h.days === 1 ? null : `it is a ${h.days}-day job`;
	}
}

const approachColor: Record<string, string> = {
	LOUD: 'var(--approach-loud)',
	STEALTH: 'var(--approach-stealth)',
	BOTH: 'var(--approach-both)',
};

const difficultyColor: Record<string, string> = {
	EASY: 'var(--difficulty-easy)',
	MEDIUM: 'var(--difficulty-medium)',
	HARD: 'var(--difficulty-hard)',
};

/**
 * What to play next, and what to avoid.
 *
 * Scored on five things at once, so the reason a heist is in either list is
 * never obvious from looking at it - hence the "why" line on every card. A
 * bare ranked list of names would be a worse answer than no list at all.
 *
 * The score itself is deliberately not shown: it has no units and comparing
 * 2.85 against 2.79 invites false precision. The ordering and the reason are
 * the parts that mean anything.
 */
export function Recommender({ recommendations, worst, loading }: Props) {
	const partial = recommendations.some((r) => r.partial);

	return (
		<section aria-labelledby="recommender-heading">
			<div className="flex items-baseline justify-between gap-3">
				<h2
					id="recommender-heading"
					className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase"
				>
					Play next
				</h2>
				{partial ? (
					<p className="flex items-center gap-1.5 text-xs text-destructive">
						<TriangleAlert
							className="size-3.5 shrink-0"
							aria-hidden
						/>
						A profile could not be read, so these are a guess
					</p>
				) : null}
			</div>

			{loading ? (
				<p className="mt-3 text-sm text-muted-foreground">
					Working out what to play…
				</p>
			) : recommendations.length === 0 ? (
				<p className="mt-3 text-sm text-muted-foreground">
					Nothing left to recommend — every heist is cleared by both of you.
				</p>
			) : (
				<>
					<ol className="mt-3 grid gap-3 sm:grid-cols-3">
						{recommendations.map((rec, i) => (
							<Card
								key={rec.heist.id}
								rec={rec}
								rank={i + 1}
								reason={explain(rec, 'for')}
							/>
						))}
					</ol>

					{/* Shown so the grind is a deliberate choice rather than whatever
					    is left over at the end. Muted, and only when it is actually a
					    different set from the list above. */}
					{worst.length > 0 &&
					!worst.some((w) =>
						recommendations.some((r) => r.heist.id === w.heist.id),
					) ? (
						<div className="mt-8">
							<h3 className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
								Save for last
							</h3>
							<p className="mt-1 text-xs text-muted-foreground">
								The worst of what is left, if you would rather get them out of
								the way.
							</p>
							<ol className="mt-3 grid gap-3 sm:grid-cols-3">
								{worst.map((rec) => (
									<Card
										key={rec.heist.id}
										rec={rec}
										reason={explain(rec, 'against')}
										muted
									/>
								))}
							</ol>
						</div>
					) : null}
				</>
			)}
		</section>
	);
}

/** Joins the two or three terms that decided a heist's place into a sentence. */
function explain(rec: Recommendation, side: 'for' | 'against'): string {
	const terms = side === 'for' ? topFactors(rec) : weakestFactors(rec);
	return terms
		.map((k) => (side === 'for' ? reasonFor(rec, k) : reasonAgainst(rec, k)))
		.filter((r): r is string => r !== null)
		.join(', and ');
}

function Card({
	rec,
	rank,
	reason,
	muted = false,
}: {
	rec: Recommendation;
	rank?: number;
	reason: string;
	muted?: boolean;
}) {
	const h = rec.heist;
	return (
		<li
			className={
				'rounded-lg border p-4 ' + (muted ? 'bg-card/40' : 'bg-card/80')
			}
		>
			<div className="flex items-center gap-2.5">
				{/* Always the grey icon: by definition nothing in either list is
				    cleared by both of us yet. */}
				<img
					src={iconUrl(h.iconGray)}
					alt=""
					width={40}
					height={40}
					loading="lazy"
					className={'size-10 shrink-0 rounded ' + (muted ? 'opacity-60' : '')}
				/>
				<div className="min-w-0">
					<div className="flex items-baseline gap-2">
						{rank === undefined ? null : (
							<span
								className="text-lg font-semibold text-primary tabular-nums"
								aria-hidden
							>
								{rank}
							</span>
						)}
						<span className="min-w-0 font-medium">{h.heist}</span>
					</div>
					<p className="text-xs text-muted-foreground">
						{h.contractor} · {h.days} day{h.days === 1 ? '' : 's'}
					</p>
				</div>
			</div>

			<div className="mt-2 flex flex-wrap gap-1.5">
				<Tag
					label={h.approach}
					color={approachColor[h.approach]}
				/>
				<Tag
					label={h.perceivedDifficulty}
					color={difficultyColor[h.perceivedDifficulty]}
				/>
			</div>

			{/* The whole point of the panel: why this one, in words. */}
			<p className="mt-3 text-xs text-muted-foreground">Because {reason}.</p>
		</li>
	);
}

function Tag({ label, color }: { label: string; color: string | undefined }) {
	return (
		<span
			className="rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide"
			style={{
				color,
				borderColor: 'transparent',
				backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
			}}
		>
			{label}
		</span>
	);
}
