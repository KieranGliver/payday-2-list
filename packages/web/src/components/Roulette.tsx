import {
	buildReel,
	iconUrl,
	pickWeighted,
	WINNER_INDEX,
	type Heist,
	type Recommendation,
} from '@pd2/shared';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
	readonly candidates: readonly Recommendation[];
	readonly onClose: () => void;
}

/** Tile width including its gap. The strip maths depends on this exactly. */
const TILE = 132;
const SPIN_MS = 5000;

/**
 * Always the same distance, because WINNER_INDEX is fixed: ~11,200px, about
 * 84 tiles ripping past the marker.
 *
 * The strip is anchored at the container's centre, so tile i spans
 * [i*TILE, (i+1)*TILE] and its middle sits at i*TILE + TILE/2. Pulling that
 * back to zero puts it under the marker.
 */
const TRAVEL = WINNER_INDEX * TILE + TILE / 2;

/**
 * Measured in the browser rather than guessed at, as a share of the distance
 * covered at each fifth of the duration, plus the peak speed in tiles per
 * frame:
 *
 *                                 20%  40%  60%  80%   peak
 *   cubic-bezier(.16,.62,.12,1)   ...crawled after 1s   0.84   <- first try
 *   cubic-bezier(.15,.35,.3,1)    47%  76%  91%  98%    0.59
 *   cubic-bezier(.3,.4,.35,1)     35%  70%  89%  98%    0.57   <- this
 *
 * Peak speed is the number that matters at the start. Tiles look alike, so
 * once they pass roughly one per frame the strip reads as standing still or
 * running backwards - the wagon-wheel effect - and the first curve was close
 * enough to it to look like it was travelling the wrong way. This one opens
 * gently, never exceeds about half a tile per frame, and still has a fifth of
 * the distance left in the final 40% of the spin, which is where the tension
 * is.
 */
const EASING = 'cubic-bezier(0.3, 0.4, 0.35, 1)';

const difficultyColor: Record<string, string> = {
	EASY: 'var(--difficulty-easy)',
	MEDIUM: 'var(--difficulty-medium)',
	HARD: 'var(--difficulty-hard)',
};

interface Spin {
	readonly reel: readonly Heist[];
	readonly winner: Heist;
	/** Bumped per spin so React restarts the transition on "Spin again". */
	readonly id: number;
}

/**
 * The random heist picker, as a case-opening spin.
 *
 * The winner is chosen BEFORE the animation starts and the strip is built
 * around it, so the outcome never depends on where a CSS transition happened
 * to stop. The spin is decoration over an answer that already exists.
 *
 * Chance is proportional to the recommender score - about a 5x spread between
 * the best and worst heist left, which keeps it feeling like a gamble rather
 * than the recommender with a spinning animation.
 */
/** Draws a winner and builds the strip around it. */
function makeSpin(candidates: readonly Recommendation[]): Spin | null {
	const picked = pickWeighted(candidates);
	if (!picked) return null;
	return {
		reel: buildReel(
			candidates.map((c) => c.heist),
			picked.heist,
		),
		winner: picked.heist,
		id: id++,
	};
}

let id = 0;

export function Roulette({ candidates, onClose }: Props) {
	const dialog = useRef<HTMLDialogElement>(null);
	// Mounted fresh per opening, so the first spin is initial state rather
	// than something an effect has to go and set.
	const [spin, setSpin] = useState<Spin | null>(() => makeSpin(candidates));
	const [running, setRunning] = useState(spin !== null);
	const [settled, setSettled] = useState(false);

	// showModal() rather than the `open` attribute: it is what gives the
	// backdrop, Escape, focus trapping and inertness of the page behind.
	useEffect(() => {
		dialog.current?.showModal();
	}, []);

	const start = () => {
		const next = makeSpin(candidates);
		if (!next) return;
		setSpin(next);
		setSettled(false);
		setRunning(true);
	};

	// Anyone who has asked for less motion gets the answer, not the ride.
	const reduced =
		typeof matchMedia === 'function' &&
		matchMedia('(prefers-reduced-motion: reduce)').matches;

	useEffect(() => {
		if (!running) return;
		const ms = reduced ? 0 : SPIN_MS;
		const t = setTimeout(() => {
			setRunning(false);
			setSettled(true);
		}, ms);
		return () => clearTimeout(t);
	}, [running, reduced]);

	const offset = spin ? -TRAVEL : 0;

	return (
		<dialog
			ref={dialog}
			onClose={onClose}
			onCancel={onClose}
			aria-labelledby="roulette-heading"
			className={
				// m-auto restores the centring a UA gives <dialog>; the CSS reset zeroes it.
				'm-auto w-[min(92vw,900px)] rounded-xl border bg-card p-0 text-foreground ' +
				'backdrop:bg-black/80 backdrop:backdrop-blur-sm'
			}
		>
			<div className="flex items-center justify-between gap-3 border-b px-5 py-3">
				<h2
					id="roulette-heading"
					className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase"
				>
					Random heist
				</h2>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<X className="size-4" />
				</button>
			</div>

			<div className="p-5">
				{/* The viewport. overflow-hidden is what makes it a slot window. */}
				<div className="relative h-32 overflow-hidden rounded-lg border bg-background">
					{/* Marker. Sits above the strip and never moves. */}
					<div
						className="absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-primary"
						aria-hidden
					/>
					<div
						className="absolute inset-y-0 left-1/2 z-10 -translate-x-1/2"
						aria-hidden
					>
						<div className="mx-auto size-0 border-x-8 border-t-8 border-x-transparent border-t-primary" />
					</div>

					<div
						// Remounted per spin, which is what restarts the keyframe.
						key={spin?.id}
						className="absolute top-0 left-1/2 flex h-full items-center"
						style={
							reduced
								? { transform: `translateX(${offset}px)` }
								: ({
										'--spin-travel': `${offset}px`,
										animation: `heist-spin ${SPIN_MS}ms ${EASING} forwards`,
									} as CSSProperties)
						}
					>
						{(spin?.reel ?? []).map((h, i) => (
							<div
								key={`${h.id}-${i}`}
								className={
									'flex shrink-0 flex-col items-center gap-1 px-2 ' +
									(settled && i === WINNER_INDEX ? '' : 'opacity-70')
								}
								style={{ width: TILE }}
							>
								<img
									src={iconUrl(h.iconGray)}
									alt=""
									width={44}
									height={44}
									className="size-11 rounded"
								/>
								<span className="line-clamp-2 text-center text-[11px] leading-tight">
									{h.heist}
								</span>
							</div>
						))}
					</div>

					{/* Fades the ends so tiles appear to run off rather than stop. */}
					<div
						className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--background),transparent_12%,transparent_88%,var(--background))]"
						aria-hidden
					/>
				</div>

				<div
					className="mt-5 min-h-20"
					aria-live="polite"
				>
					{settled && spin ? (
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex items-center gap-3">
								<img
									src={iconUrl(spin.winner.iconGray)}
									alt=""
									width={48}
									height={48}
									className="size-12 rounded"
								/>
								<div>
									<p className="text-lg font-semibold">{spin.winner.heist}</p>
									<p className="text-xs text-muted-foreground">
										{spin.winner.contractor} · {spin.winner.days} day
										{spin.winner.days === 1 ? '' : 's'} · {spin.winner.approach}{' '}
										·{' '}
										<span
											style={{
												color: difficultyColor[spin.winner.perceivedDifficulty],
											}}
										>
											{spin.winner.perceivedDifficulty}
										</span>
									</p>
								</div>
							</div>
							<Button
								variant="outline"
								onClick={start}
							>
								Spin again
							</Button>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							{candidates.length === 0
								? 'Nothing left to pick — every heist is cleared by both of you.'
								: `Picking from ${candidates.length} heists you have not both cleared…`}
						</p>
					)}
				</div>
			</div>
		</dialog>
	);
}
