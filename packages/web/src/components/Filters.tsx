import {
	APPROACHES,
	CONTRACTORS,
	DAYS_VALUES,
	DIFFICULTIES,
	type PlayerProgress,
} from '@pd2/shared';
import {
	toApproach,
	toCompletion,
	toContractor,
	toDays,
	toDifficulty,
	type FilterState,
} from '@/lib/filters';

interface Props {
	readonly value: FilterState;
	readonly onChange: (next: FilterState) => void;
	readonly players: readonly PlayerProgress[];
	readonly shown: number;
	readonly total: number;
}

const field =
	'h-9 w-full rounded-md border border-input bg-background px-2 text-sm ' +
	'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';

/**
 * Native <select> rather than a custom dropdown: on a phone these open the OS
 * picker, which is a better experience than any JS menu, and they are keyboard
 * and screen-reader accessible without extra work.
 *
 * One row above the table, as filters should be.
 */
export function Filters({ value, onChange, players, shown, total }: Props) {
	const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
		onChange({ ...value, [key]: v });

	return (
		<section
			aria-label="Filters"
			className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
		>
			<label className="flex flex-col gap-1">
				<span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
					Contractor
				</span>
				<select
					className={field}
					value={value.contractor}
					onChange={(e) => set('contractor', toContractor(e.target.value))}
				>
					<option value="all">All</option>
					{CONTRACTORS.map((c) => (
						<option
							key={c}
							value={c}
						>
							{c}
						</option>
					))}
				</select>
			</label>

			<label className="flex flex-col gap-1">
				<span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
					Approach
				</span>
				<select
					className={field}
					value={value.approach}
					onChange={(e) => set('approach', toApproach(e.target.value))}
				>
					<option value="all">All</option>
					{APPROACHES.map((a) => (
						<option
							key={a}
							value={a}
						>
							{a}
						</option>
					))}
				</select>
			</label>

			<label className="flex flex-col gap-1">
				<span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
					Difficulty
				</span>
				<select
					className={field}
					value={value.difficulty}
					onChange={(e) => set('difficulty', toDifficulty(e.target.value))}
				>
					<option value="all">All</option>
					{DIFFICULTIES.map((d) => (
						<option
							key={d}
							value={d}
						>
							{d}
						</option>
					))}
				</select>
			</label>

			<label className="flex flex-col gap-1">
				<span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
					Days
				</span>
				<select
					className={field}
					value={value.days}
					onChange={(e) => set('days', toDays(e.target.value))}
				>
					<option value="all">All</option>
					{DAYS_VALUES.map((d) => (
						<option
							key={d}
							value={d}
						>
							{d} day{d === 1 ? '' : 's'}
						</option>
					))}
				</select>
			</label>

			<label className="flex flex-col gap-1">
				<span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
					Completion
				</span>
				<select
					className={field}
					value={value.completion}
					onChange={(e) =>
						set('completion', toCompletion(e.target.value, players))
					}
				>
					<option value="all">All</option>
					<option value="both">Cleared by both</option>
					<option value="either">Cleared by either</option>
					<option value="neither">Cleared by neither</option>
					{players.map((p) => (
						<option
							key={p.steamId}
							value={`only:${p.steamId}`}
						>
							Only {p.name}
						</option>
					))}
				</select>
			</label>

			<p className="col-span-2 text-xs text-muted-foreground tabular-nums sm:col-span-3 lg:col-span-5">
				Showing {shown} of {total} heists
			</p>
		</section>
	);
}
