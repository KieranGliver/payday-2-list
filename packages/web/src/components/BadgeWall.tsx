import { badgeTally, iconUrl, type Badge } from '@pd2/shared';
import { TriangleAlert } from 'lucide-react';

interface Props {
	readonly badges: readonly Badge[];
}

/**
 * The whole-contractor achievements, as a wall of badges.
 *
 * Lit purely by Steam's own meta achievement, never by counting the heists we
 * think belong to a contractor. The per-badge x/y underneath is OUR count and
 * is informational only - when the two disagree, that is a bug in our
 * contractor mapping and the badge says so rather than papering over it.
 */
export function BadgeWall({ badges }: Props) {
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
					const title = b.earned
						? `${b.achievement} — earned`
						: `${b.achievement} — ${b.done} of ${b.of} cleared by both (${pct}%)`;

					return (
						<li
							key={b.id}
							className="flex flex-col items-center gap-1 text-center"
						>
							<div
								title={title}
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
										'size-11 rounded-full ' +
										// Unearned art is already Steam's grey variant; the extra
										// dimming separates "not yet" from "earned" at a glance.
										(b.earned ? '' : 'opacity-60')
									}
								/>
								{b.mismatch ? (
									<TriangleAlert
										className="absolute -top-1 -right-1 size-4 text-destructive"
										aria-hidden
									/>
								) : null}
							</div>

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
							</span>
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
