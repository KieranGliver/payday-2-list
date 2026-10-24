import type { PlayerProgress } from '@pd2/shared';
import { TriangleAlert } from 'lucide-react';

interface Props {
	readonly both: number;
	readonly total: number;
	readonly players: readonly PlayerProgress[];
	/** How many players' data could not be read. */
	readonly unreadable: number;
}

/**
 * A single ratio against a limit, so the form is a meter, not a chart.
 *
 * The track is a lighter step of the fill's own hue (blue on blue) so state
 * reads across the whole bar. Both steps are validator-checked against the
 * real surfaces - see the comment in index.css.
 *
 * Exactly one hero figure per view: the count cleared by both players, which
 * is the number actually being tracked.
 */
export function ProgressMeter({ both, total, players, unreadable }: Props) {
	const pct = total === 0 ? 0 : (both / total) * 100;

	return (
		<section aria-labelledby="progress-heading">
			<h2
				id="progress-heading"
				className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase"
			>
				Cleared together
			</h2>

			{/* Hero figure: proportional figures, not tabular - tabular-nums makes a
			    large number look loose at display sizes. */}
			<p className="mt-1 flex items-baseline gap-2">
				<span className="text-5xl font-semibold tracking-tight">{both}</span>
				<span className="text-xl text-muted-foreground">/ {total}</span>
				<span className="ml-auto text-sm text-muted-foreground tabular-nums">
					{pct.toFixed(1)}%
				</span>
			</p>

			<div
				className="mt-3 h-3 w-full overflow-hidden rounded-full"
				style={{ backgroundColor: 'var(--meter-track)' }}
				role="meter"
				aria-valuenow={both}
				aria-valuemin={0}
				aria-valuemax={total}
				aria-label={`${both} of ${total} heists cleared by both players`}
			>
				<div
					className="h-full rounded-full transition-[width] duration-500"
					style={{ width: `${pct}%`, backgroundColor: 'var(--meter-fill)' }}
				/>
			</div>

			{/* An incomplete figure must say so. Previously a failed read was
			    silently counted as "cleared nothing", so one private profile
			    dragged this to zero with no indication anything was wrong.

			    It is an UPPER bound, not a lower one: the figure counts heists
			    every READABLE player has cleared, and adding the missing player
			    back can only remove heists from that set, never add them. */}
			{unreadable > 0 ? (
				<p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
					<TriangleAlert
						className="size-3.5 shrink-0"
						aria-hidden
					/>
					Incomplete: {unreadable} of {players.length} profiles could not be
					read, so the real figure is {both} or lower.
				</p>
			) : null}

			<dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
				{players.map((p) => (
					<div
						key={p.steamId}
						className="flex items-baseline gap-2"
					>
						<dt className="text-muted-foreground">{p.name}</dt>
						{p.status === 'ok' ? (
							<dd className="font-medium tabular-nums">
								{p.completed}/{total}
							</dd>
						) : (
							<>
								<dd className="font-medium text-muted-foreground">unknown</dd>
								<dd className="text-xs text-destructive">({p.reason})</dd>
							</>
						)}
					</div>
				))}
			</dl>
		</section>
	);
}
