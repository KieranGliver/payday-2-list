import { iconUrl, type Badge, type PlayerProgress } from '@pd2/shared';
import { TriangleAlert } from 'lucide-react';

interface Props {
	readonly badge: Badge;
	/** Heists cleared by both, and the catalog size. */
	readonly done: number;
	readonly total: number;
	readonly players: readonly PlayerProgress[];
	/** How many players' data could not be read. */
	readonly unreadable: number;
}

/** Door radius, and the progress ring that sits outside it. */
const DOOR_R = 78;
const RING_R = 96;
const CX = 200;
const CY = 112;

/**
 * The everything achievement, and the only progress display in the app.
 *
 * This absorbed the separate progress meter: two bars showing the same number
 * competed with each other, and the vault is the better picture of it.
 *
 * The vault and drill are drawn rather than sourced - Overkill's art is
 * theirs, and an SVG themes from the CSS tokens, scales and animates without a
 * request. The Steam achievement icon sits inside the door as the prize.
 *
 * The progress ring sits OUTSIDE the door so it never covers the bolts, spokes
 * or prize, and the drill bit advances toward the centre as completion rises -
 * both tracking the same number.
 */
export function VaultHero({ badge, done, total, players, unreadable }: Props) {
	const drilled = total === 0 ? 0 : done / total;
	// Steam's verdict wins: an earned vault is fully drilled even if our own
	// heist count disagrees. That disagreement is reported on the badge wall.
	const pct = badge.earned ? 1 : drilled;
	const earned = badge.earned;

	const circumference = 2 * Math.PI * RING_R;
	// The bit starts at the door's edge and eats toward the centre.
	const tipX = CX - DOOR_R + pct * DOOR_R;

	// Steam appends a mask unlock note to some descriptions; the first
	// sentence is the actual objective.
	const subtitle = `${badge.description.split('. ')[0]}.`;

	return (
		<section
			aria-labelledby="vault-heading"
			className="relative overflow-hidden rounded-lg border bg-card/80 p-4 sm:p-6"
		>
			<div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
				<svg
					viewBox="0 0 340 224"
					className="h-48 w-full max-w-[340px] shrink-0 sm:h-56"
					role="img"
					aria-label={
						earned
							? 'The vault is open'
							: `Vault sealed, ${Math.round(pct * 100)} per cent drilled`
					}
				>
					<defs>
						{/* Sized to the image: a clip larger than what it clips does
						    nothing, and the jpeg's square corners show through. */}
						<clipPath id="vault-prize">
							<circle
								cx={CX}
								cy={CY}
								r="32"
							/>
						</clipPath>
						<radialGradient id="vault-glow">
							<stop
								offset="0%"
								stopColor="var(--meter-fill)"
								stopOpacity={earned ? 0.5 : 0.1}
							/>
							<stop
								offset="100%"
								stopColor="var(--meter-fill)"
								stopOpacity="0"
							/>
						</radialGradient>
					</defs>

					<circle
						cx={CX}
						cy={CY}
						r="108"
						fill="url(#vault-glow)"
					/>

					{/* Progress ring, outside the door so it covers no detail. */}
					<circle
						cx={CX}
						cy={CY}
						r={RING_R}
						fill="none"
						stroke="var(--meter-track)"
						strokeWidth="7"
					/>
					<circle
						cx={CX}
						cy={CY}
						r={RING_R}
						fill="none"
						stroke="var(--meter-fill)"
						strokeWidth="7"
						strokeLinecap="round"
						strokeDasharray={`${circumference * pct} ${circumference}`}
						transform={`rotate(-90 ${CX} ${CY})`}
						className="transition-[stroke-dasharray] duration-700"
					/>

					{/* Door */}
					<circle
						cx={CX}
						cy={CY}
						r={DOOR_R}
						fill="var(--card)"
						stroke="var(--border)"
						strokeWidth="3"
					/>
					<circle
						cx={CX}
						cy={CY}
						r="64"
						fill="none"
						stroke="var(--border)"
						strokeWidth="2"
					/>

					{Array.from({ length: 12 }, (_, i) => {
						const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
						return (
							<circle
								key={i}
								cx={CX + Math.cos(a) * 71}
								cy={CY + Math.sin(a) * 71}
								r="3.5"
								fill={earned ? 'var(--meter-fill)' : 'var(--muted-foreground)'}
								opacity={earned ? 0.9 : 0.45}
							/>
						);
					})}

					{/* Handle spokes, only while sealed. */}
					{!earned &&
						Array.from({ length: 4 }, (_, i) => {
							const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
							return (
								<line
									key={i}
									x1={CX + Math.cos(a) * 36}
									y1={CY + Math.sin(a) * 36}
									x2={CX + Math.cos(a) * 58}
									y2={CY + Math.sin(a) * 58}
									stroke="var(--muted-foreground)"
									strokeWidth="5"
									strokeLinecap="round"
									opacity="0.5"
								/>
							);
						})}

					{/* The prize, behind the door. */}
					<circle
						cx={CX}
						cy={CY}
						r="34"
						fill="var(--background)"
						stroke={earned ? 'var(--meter-fill)' : 'var(--border)'}
						strokeWidth="2"
					/>
					<image
						href={iconUrl(earned ? badge.icon : badge.iconGray)}
						x={CX - 32}
						y={CY - 32}
						width="64"
						height="64"
						clipPath="url(#vault-prize)"
						opacity={earned ? 1 : 0.4}
					/>

					{/* The drill, boring in from the left. */}
					{!earned && (
						<g>
							<circle
								cx={tipX}
								cy={CY}
								r="12"
								fill="var(--meter-fill)"
								opacity="0.2"
								className="motion-safe:animate-pulse"
							/>
							<polygon
								points={`${tipX},${CY} ${tipX - 24},${CY - 8} ${tipX - 24},${CY + 8}`}
								fill="var(--meter-fill)"
							/>
							<rect
								x={tipX - 54}
								y={CY - 6}
								width="32"
								height="12"
								rx="2"
								fill="var(--muted-foreground)"
							/>
							<rect
								x={tipX - 106}
								y={CY - 22}
								width="54"
								height="44"
								rx="7"
								fill="var(--muted)"
								stroke="var(--border)"
								strokeWidth="2.5"
							/>
							{[0, 1, 2].map((i) => (
								<rect
									key={i}
									x={tipX - 97}
									y={CY - 15 + i * 11}
									width="20"
									height="4"
									rx="2"
									fill="var(--border)"
								/>
							))}
							<rect
								x={tipX - 90}
								y={CY + 22}
								width="12"
								height="24"
								rx="3"
								fill="var(--muted)"
								stroke="var(--border)"
								strokeWidth="2"
							/>
							<circle
								cx={tipX - 62}
								cy={CY - 14}
								r="3.5"
								fill="var(--meter-fill)"
								className="motion-safe:animate-pulse"
							/>
						</g>
					)}
				</svg>

				<div className="min-w-0 flex-1 text-center sm:text-left">
					<h2
						id="vault-heading"
						className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase"
					>
						The big one
					</h2>
					<p className="mt-1 text-xl font-bold tracking-wide uppercase sm:text-2xl">
						{badge.achievement}
					</p>
					<p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

					{/* The single progress figure for the whole app. Proportional
					    figures on the hero number - tabular-nums makes a large number
					    look loose at display sizes. */}
					<p className="mt-4 flex items-baseline justify-center gap-2 sm:justify-start">
						<span className="text-5xl font-semibold tracking-tight">
							{done}
						</span>
						<span className="text-xl text-muted-foreground">/ {total}</span>
						<span className="ml-1 text-lg font-medium text-primary tabular-nums">
							{(drilled * 100).toFixed(1)}%
						</span>
					</p>

					{unreadable > 0 ? (
						<p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-destructive sm:justify-start">
							<TriangleAlert
								className="size-3.5 shrink-0"
								aria-hidden
							/>
							Incomplete: {unreadable} of {players.length} profiles could not be
							read, so the real figure is {done} or lower.
						</p>
					) : null}

					<dl className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm sm:justify-start">
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
										<dd className="font-medium text-muted-foreground">
											unknown
										</dd>
										<dd className="text-xs text-destructive">({p.reason})</dd>
									</>
								)}
							</div>
						))}
					</dl>
				</div>
			</div>
		</section>
	);
}
