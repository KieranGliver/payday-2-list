import { topFactors, type Factors, type Recommendation } from '@pd2/shared';
import { TriangleAlert } from 'lucide-react';

interface Props {
	readonly recommendations: readonly Recommendation[];
	/** Shown while progress is still loading, so the panel doesn't flash empty. */
	readonly loading: boolean;
}

/** How each term reads in a sentence, as the reason it pushed a heist up. */
const WHY: Record<keyof Factors, string> = {
	closeness: 'already deep on the difficulty ladder',
	rarity: 'commonly completed',
	ease: 'we rate it easy',
	proximity: 'nearly finishes its contractor',
	brevity: 'short',
};

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
 * What to play next.
 *
 * Scored on five things at once, so the reason a heist is here is never
 * obvious from looking at it - hence the "why" line on every card. A bare
 * ranked list of names would be a worse answer than no list at all.
 *
 * The score itself is deliberately not shown: it has no units and comparing
 * 2.85 against 2.79 invites false precision. The ordering and the reason are
 * the parts that mean anything.
 */
export function Recommender({ recommendations, loading }: Props) {
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
				<ol className="mt-3 grid gap-3 sm:grid-cols-3">
					{recommendations.map((rec, i) => {
						const h = rec.heist;
						const why = topFactors(rec)
							.map((k) => WHY[k])
							.join(', and ');

						return (
							<li
								key={h.id}
								className="rounded-lg border bg-card/80 p-4"
							>
								<div className="flex items-baseline gap-2">
									<span
										className="text-lg font-semibold text-primary tabular-nums"
										aria-hidden
									>
										{i + 1}
									</span>
									<span className="min-w-0 font-medium">{h.heist}</span>
								</div>

								<p className="mt-1 text-xs text-muted-foreground">
									{h.contractor} · {h.days} day{h.days === 1 ? '' : 's'} ·{' '}
									{h.globalPct.toFixed(1)}% global
								</p>

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
								<p className="mt-3 text-xs text-muted-foreground">
									Because it is {why}.
								</p>
							</li>
						);
					})}
				</ol>
			)}
		</section>
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
