import { badgeTally, iconUrl, type Badge, type Contractor } from '@pd2/shared';
import { TriangleAlert } from 'lucide-react';

interface Props {
	readonly badges: readonly Badge[];
	/** The contractor the table is currently filtered to, if any. */
	readonly activeContractor: Contractor | 'all';
	/** Clicking a badge filters to its contractor, or clears it if already set. */
	readonly onSelectContractor: (contractor: Contractor | 'all') => void;
}

/**
 * The whole-contractor achievements, as a wall of badges.
 *
 * Lit purely by Steam's own meta achievement, never by counting the heists we
 * think belong to a contractor. The per-badge x/y underneath is OUR count and
 * is informational only - when the two disagree, that is a bug in our
 * contractor mapping and the badge says so rather than papering over it.
 */
export function BadgeWall({
	badges,
	activeContractor,
	onSelectContractor,
}: Props) {
	const { earned, total } = badgeTally(badges);
	const mismatched = badges.filter((b) => b.mismatch);

	return (
		<section aria-labelledby="badges-heading">
			<div className="flex items-baseline justify-between gap-3">
				<h2
					id="badges-heading"
					className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase"
				>
					Contractor badges
				</h2>
				{/* Deliberately its own counter, separate from the heist meter. */}
				<p className="text-sm font-medium tabular-nums">
					<span className={earned > 0 ? 'text-primary' : undefined}>
						{earned}
					</span>
					<span className="text-muted-foreground"> / {total}</span>
				</p>
			</div>

			<ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12">
				{badges.map((b) => {
					const pct = b.of === 0 ? 0 : Math.round((b.done / b.of) * 100);
					const selected =
						b.contractor !== null && b.contractor === activeContractor;
					const title = b.earned
						? `${b.achievement} — earned. Click to filter the table.`
						: `${b.achievement} — ${b.done} of ${b.of} cleared by both (${pct}%). Click to filter the table.`;

					return (
						<li key={b.id}>
							{/* The whole cell is the hit target, not just the 44px
							    circle - a circle alone is a fiddly tap on a phone.
							    Padding is inside the button so it is all clickable. */}
							<button
								type="button"
								title={title}
								aria-pressed={selected}
								disabled={b.contractor === null}
								onClick={() =>
									onSelectContractor(selected ? 'all' : (b.contractor ?? 'all'))
								}
								className={
									'flex w-full flex-col items-center gap-1 rounded-md border p-2 text-center ' +
									'transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 ' +
									'focus-visible:outline-none ' +
									// The selection box is a BOX around the whole cell with a
									// tinted fill. The earned state is a RING on the circle.
									// Different shape and placement, so the two never read as
									// the same signal even though both use the accent hue.
									(selected
										? 'border-primary bg-primary/10'
										: 'border-transparent hover:border-border hover:bg-muted/40')
								}
							>
								<span
									className={
										'relative rounded-full p-0.5 ' +
										(b.earned
											? 'ring-2 ring-[var(--meter-fill)]'
											: 'ring-1 ring-border')
									}
								>
									<img
										src={iconUrl(b.earned ? b.icon : b.iconGray)}
										alt=""
										width={44}
										height={44}
										loading="lazy"
										className={
											'size-11 rounded-full ' + (b.earned ? '' : 'opacity-60')
										}
									/>
									{b.mismatch ? (
										<TriangleAlert
											className="absolute -top-1 -right-1 size-4 text-destructive"
											aria-hidden
										/>
									) : null}
								</span>

								<span
									className={
										'text-[11px] leading-tight ' +
										(b.earned ? 'font-medium' : 'text-muted-foreground')
									}
								>
									{b.label}
								</span>
								<span className="text-[10px] text-muted-foreground tabular-nums">
									{b.unknown ? '?' : `${b.done}/${b.of}`}
								</span>
								<span className="sr-only">
									{b.earned ? 'Earned' : `Not earned, ${b.done} of ${b.of}`}
									{selected ? ', filtering the table' : ''}
								</span>
							</button>
						</li>
					);
				})}
			</ul>

			{/* Steam's verdict disagreeing with ours means a heist is assigned to
			    the wrong contractor, or is missing from the catalog entirely. */}
			{mismatched.length > 0 ? (
				<p className="mt-3 flex items-start gap-1.5 text-xs text-destructive">
					<TriangleAlert
						className="mt-0.5 size-3.5 shrink-0"
						aria-hidden
					/>
					<span>
						Steam disagrees with our heist list for{' '}
						{mismatched.map((b) => b.label).join(', ')} — a heist is probably
						assigned to the wrong contractor.
					</span>
				</p>
			) : null}
		</section>
	);
}
