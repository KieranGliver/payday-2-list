import {
	hasCleared,
	iconUrl,
	unlockedAt,
	type Approach,
	type Heist,
	type PerceivedDifficulty,
	type PlayerProgress,
} from '@pd2/shared';
import {
	ArrowDown,
	ArrowUp,
	Check,
	ChevronsUpDown,
	Minus,
	CircleHelp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import type { SortKey, SortState } from '@/lib/sort';

interface Props {
	readonly heists: readonly Heist[];
	readonly players: readonly PlayerProgress[];
	readonly sort: SortState;
	readonly onSort: (key: SortKey) => void;
}

function SortButton({
	label,
	columnKey,
	sort,
	onSort,
	align = 'left',
}: {
	label: string;
	columnKey: SortKey;
	sort: SortState;
	onSort: (key: SortKey) => void;
	align?: 'left' | 'right';
}) {
	const active = sort.key === columnKey;
	const Icon = !active ? ChevronsUpDown : sort.desc ? ArrowDown : ArrowUp;
	return (
		<button
			type="button"
			onClick={() => onSort(columnKey)}
			aria-label={`Sort by ${label}`}
			className={
				'inline-flex items-center gap-1 hover:text-foreground ' +
				(active ? 'text-foreground' : 'text-muted-foreground') +
				(align === 'right' ? ' flex-row-reverse' : '')
			}
		>
			{label}
			<Icon
				className="size-3.5 shrink-0"
				aria-hidden
			/>
		</button>
	);
}

/**
 * Completion cell.
 *
 * Status colour is paired with an icon and screen-reader text, so "cleared"
 * never depends on colour alone. The unlock date is the cell's title, which is
 * why unlocktime is worth keeping in the payload.
 */
function Unknown({ reason }: { reason: string }) {
	return (
		<span title={`Could not read this profile: ${reason}`}>
			<CircleHelp
				className="mx-auto size-4 text-destructive"
				aria-hidden
			/>
			<span className="sr-only">Unknown - {reason}</span>
		</span>
	);
}

function Cleared({ at }: { at: number | undefined }) {
	if (at === undefined) {
		return (
			<>
				<Minus
					className="mx-auto size-4 text-muted-foreground"
					aria-hidden
				/>
				<span className="sr-only">Not cleared</span>
			</>
		);
	}
	const when = new Date(at * 1000).toLocaleDateString();
	return (
		<span title={`Cleared ${when}`}>
			<Check
				className="mx-auto size-4"
				style={{ color: 'var(--status-good)' }}
				aria-hidden
			/>
			<span className="sr-only">Cleared {when}</span>
		</span>
	);
}

/** Categorical hues, validated --pairs all against the theme surface. */
const approachColor: Record<Approach, string> = {
	LOUD: 'var(--approach-loud)',
	STEALTH: 'var(--approach-stealth)',
	BOTH: 'var(--approach-both)',
};

/** Severity, so the reserved status palette rather than a fourth series hue. */
const difficultyColor: Record<PerceivedDifficulty, string> = {
	EASY: 'var(--difficulty-easy)',
	MEDIUM: 'var(--difficulty-medium)',
	HARD: 'var(--difficulty-hard)',
};

const clearedByBoth = (heist: Heist, players: readonly PlayerProgress[]) =>
	players.length > 0 && players.every((p) => hasCleared(p, heist.id));

export function HeistTable({ heists, players, sort, onSort }: Props) {
	return (
		/* Horizontal scroll on narrow screens; the heist name column is sticky so
       you never lose track of which row you are reading while swiping.
       shadcn's Table already provides the overflow-x-auto scroller, so this
       wrapper must not add a second one. min-w-max lets the table size to its
       content and overflow that scroller instead of compressing to fit. */
		<div className="rounded-md border">
			<Table className="min-w-max">
				<TableHeader>
					<TableRow>
						<TableHead className="sticky left-0 z-10 min-w-60 border-r bg-background">
							<SortButton
								label="Heist"
								columnKey="heist"
								sort={sort}
								onSort={onSort}
							/>
						</TableHead>
						<TableHead className="min-w-32">
							<SortButton
								label="Contractor"
								columnKey="contractor"
								sort={sort}
								onSort={onSort}
							/>
						</TableHead>
						<TableHead className="min-w-28">
							<SortButton
								label="Approach"
								columnKey="approach"
								sort={sort}
								onSort={onSort}
							/>
						</TableHead>
						<TableHead className="min-w-28">
							<SortButton
								label="Difficulty"
								columnKey="difficulty"
								sort={sort}
								onSort={onSort}
							/>
						</TableHead>
						<TableHead className="min-w-24 text-right">
							<SortButton
								label="Global %"
								columnKey="globalPct"
								sort={sort}
								onSort={onSort}
								align="right"
							/>
						</TableHead>
						{players.map((p) => (
							<TableHead
								key={p.steamId}
								className="min-w-28 text-center"
							>
								<SortButton
									label={p.name}
									columnKey={`player:${p.steamId}`}
									sort={sort}
									onSort={onSort}
								/>
							</TableHead>
						))}
					</TableRow>
				</TableHeader>

				<TableBody>
					{heists.map((h) => (
						<TableRow key={h.id}>
							<TableCell className="sticky left-0 z-10 border-r bg-background font-medium">
								<div className="flex items-center gap-2.5">
									{/* Decorative: the heist name sits right beside it, so an alt
                      text would just be read out twice. Colour art once both
                      players have cleared it, greyed until then - the same
                      thing Steam does, and it matches the headline metric. */}
									<img
										src={iconUrl(
											clearedByBoth(h, players) ? h.icon : h.iconGray,
										)}
										alt=""
										width={32}
										height={32}
										loading="lazy"
										className="size-8 shrink-0 rounded-sm"
									/>
									<span>{h.heist}</span>
								</div>
							</TableCell>
							<TableCell className="text-muted-foreground">
								{h.contractor}
							</TableCell>
							<TableCell>
								<Badge
									variant="outline"
									style={{
										color: approachColor[h.approach],
										borderColor: approachColor[h.approach],
									}}
								>
									{h.approach}
								</Badge>
							</TableCell>
							<TableCell>
								<Badge
									variant="outline"
									style={{
										color: difficultyColor[h.perceivedDifficulty],
										borderColor: 'transparent',
										backgroundColor: `color-mix(in srgb, ${difficultyColor[h.perceivedDifficulty]} 16%, transparent)`,
									}}
								>
									{h.perceivedDifficulty}
								</Badge>
							</TableCell>
							<TableCell className="text-right text-muted-foreground tabular-nums">
								{h.globalPct.toFixed(1)}%
							</TableCell>
							{players.map((p) => (
								<TableCell
									key={p.steamId}
									className="text-center"
								>
									{/* A failed read renders as unknown, not as a dash. A dash
									    means "we know they have not cleared this"; conflating
									    the two is what let a private profile read as zero. */}
									{p.status === 'failed' ? (
										<Unknown reason={p.reason} />
									) : (
										<Cleared at={unlockedAt(p, h.id)} />
									)}
								</TableCell>
							))}
						</TableRow>
					))}
					{heists.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={5 + players.length}
								className="h-24 text-center text-muted-foreground"
							>
								No heists match these filters.
							</TableCell>
						</TableRow>
					) : null}
				</TableBody>
			</Table>
		</div>
	);
}
