import { iconUrl, type Badge } from '@pd2/shared';

interface Props {
	readonly badge: Badge;
	/** Heists cleared by both, and the catalog size - drives the drill depth. */
	readonly done: number;
	readonly total: number;
}

/**
 * The one achievement that spans everything, given its own stage.
 *
 * The vault and drill are drawn here rather than sourced: Overkill's art is
 * theirs, and an SVG scales, themes from the CSS tokens and animates without
 * a network request. The Steam achievement icon sits inside the door as the
 * prize - greyed while locked, in colour once earned.
 *
 * The drill is not decoration. Its depth into the door, and the arc sweeping
 * round the dial, both track overall completion, so the picture says how far
 * in you are.
 */
export function VaultHero({ badge, done, total }: Props) {
	const drilled = total === 0 ? 0 : done / total;
	// Steam's verdict wins: an earned vault is fully drilled even if our own
	// heist count disagrees. That disagreement is reported on the badge wall.
	const pct = badge.earned ? 1 : drilled;
	const earned = badge.earned;

	// Dial circumference, for the progress arc.
	const R = 86;
	const circumference = 2 * Math.PI * R;

	// The bit tip starts at the door's left edge and advances toward the
	// centre as completion rises, so the drill is visibly eating into it.
	const DOOR_X = 200;
	const DOOR_EDGE = DOOR_X - 92;
	const tipX = DOOR_EDGE + pct * 92;

	return (
		<section
			aria-labelledby="vault-heading"
			className="relative overflow-hidden rounded-lg border bg-card/80 p-4 sm:p-6"
		>
			<div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
				<svg
					viewBox="0 0 320 220"
					className="h-44 w-full max-w-[320px] shrink-0 sm:h-52"
					role="img"
					aria-label={
						earned
							? 'The vault is open'
							: `Vault sealed, ${Math.round(pct * 100)} per cent drilled`
					}
				>
					<defs>
						{/* Sized to the image, not the door: a larger circle clips
						    nothing and the jpeg's square corners show through. */}
						<clipPath id="vault-prize">
							<circle
								cx="200"
								cy="110"
								r="34"
							/>
						</clipPath>
						<radialGradient id="vault-glow">
							<stop
								offset="0%"
								stopColor="var(--meter-fill)"
								stopOpacity={earned ? 0.55 : 0.12}
							/>
							<stop
								offset="100%"
								stopColor="var(--meter-fill)"
								stopOpacity="0"
							/>
						</radialGradient>
					</defs>

					<circle
						cx="200"
						cy="110"
						r="104"
						fill="url(#vault-glow)"
					/>

					{/* Door body */}
					<circle
						cx="200"
						cy="110"
						r="92"
						fill="var(--card)"
						stroke="var(--border)"
						strokeWidth="3"
					/>
					<circle
						cx="200"
						cy="110"
						r="78"
						fill="none"
						stroke="var(--border)"
						strokeWidth="2"
					/>

					{/* Bolt circle */}
					{Array.from({ length: 12 }, (_, i) => {
						const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
						return (
							<circle
								key={i}
								cx={200 + Math.cos(a) * 85}
								cy={110 + Math.sin(a) * 85}
								r="3.5"
								fill={earned ? 'var(--meter-fill)' : 'var(--muted-foreground)'}
								opacity={earned ? 0.9 : 0.45}
							/>
						);
					})}

					{/* Progress arc: how far round the dial you are. */}
					<circle
						cx="200"
						cy="110"
						r={R}
						fill="none"
						stroke="var(--meter-fill)"
						strokeWidth="4"
						strokeLinecap="round"
						strokeDasharray={`${circumference * pct} ${circumference}`}
						transform="rotate(-90 200 110)"
						className="transition-[stroke-dasharray] duration-700"
					/>

					{/* The prize, behind the door. */}
					<circle
						cx="200"
						cy="110"
						r="36"
						fill="var(--background)"
						stroke={earned ? 'var(--meter-fill)' : 'var(--border)'}
						strokeWidth="2"
					/>
					<image
						href={iconUrl(earned ? badge.icon : badge.iconGray)}
						x="166"
						y="76"
						width="68"
						height="68"
						clipPath="url(#vault-prize)"
						opacity={earned ? 1 : 0.4}
					/>

					{/* Handle spokes, only while sealed. */}
					{!earned &&
						Array.from({ length: 4 }, (_, i) => {
							const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
							return (
								<line
									key={i}
									x1={200 + Math.cos(a) * 20}
									y1={110 + Math.sin(a) * 20}
									x2={200 + Math.cos(a) * 52}
									y2={110 + Math.sin(a) * 52}
									stroke="var(--muted-foreground)"
									strokeWidth="5"
									strokeLinecap="round"
									opacity="0.5"
								/>
							);
						})}

					{/* The drill, boring in from the left. Sized to read as a drill at
					    a glance, and anchored so the bit meets the door rather than
					    floating beside it. */}
					{!earned && (
						<g>
							{/* Sparks where the bit bites. */}
							<circle
								cx={tipX}
								cy="110"
								r="13"
								fill="var(--meter-fill)"
								opacity="0.2"
								className="motion-safe:animate-pulse"
							/>
							{/* Bit */}
							<polygon
								points={`${tipX},110 ${tipX - 26},101 ${tipX - 26},119`}
								fill="var(--meter-fill)"
							/>
							{/* Shaft */}
							<rect
								x={tipX - 58}
								y="104"
								width="34"
								height="12"
								rx="2"
								fill="var(--muted-foreground)"
							/>
							{/* Motor housing */}
							<rect
								x={tipX - 112}
								y="88"
								width="56"
								height="44"
								rx="7"
								fill="var(--muted)"
								stroke="var(--border)"
								strokeWidth="2.5"
							/>
							{/* Vent slots */}
							{[0, 1, 2].map((i) => (
								<rect
									key={i}
									x={tipX - 102}
									y={96 + i * 11}
									width="20"
									height="4"
									rx="2"
									fill="var(--border)"
								/>
							))}
							{/* Brace leg */}
							<rect
								x={tipX - 96}
								y="132"
								width="12"
								height="26"
								rx="3"
								fill="var(--muted)"
								stroke="var(--border)"
								strokeWidth="2"
							/>
							{/* Status lamp */}
							<circle
								cx={tipX - 66}
								cy="96"
								r="3.5"
								fill="var(--meter-fill)"
								className="motion-safe:animate-pulse"
							/>
						</g>
					)}
				</svg>

				<div className="min-w-0 text-center sm:text-left">
					<h2
						id="vault-heading"
						className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase"
					>
						The big one
					</h2>
					<p className="mt-1 text-2xl font-bold tracking-wide uppercase">
						{badge.achievement}
					</p>
					<p className="mt-2 text-sm text-muted-foreground">
						{earned ? (
							<span className="text-primary">
								Every One Down heist, cleared by both of you.
							</span>
						) : (
							<>
								Clear all {total} heists on One Down. The drill is{' '}
								<span className="font-medium text-foreground tabular-nums">
									{Math.round(pct * 100)}%
								</span>{' '}
								through — {total - done} to go.
							</>
						)}
					</p>
					<p className="mt-2 text-xs text-muted-foreground tabular-nums">
						Only {badge.globalPct}% of Payday 2 owners have this.
					</p>
				</div>
			</div>
		</section>
	);
}
