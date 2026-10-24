import { APPROACHES, CONTRACTORS, DIFFICULTIES, type PlayerProgress } from '@pd2/shared';
import type { Completion, FilterState } from '@/lib/filters';

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
    <section aria-label="Filters" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">Contractor</span>
        <select
          className={field}
          value={value.contractor}
          onChange={(e) => set('contractor', e.target.value as FilterState['contractor'])}
        >
          <option value="all">All</option>
          {CONTRACTORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">Approach</span>
        <select
          className={field}
          value={value.approach}
          onChange={(e) => set('approach', e.target.value as FilterState['approach'])}
        >
          <option value="all">All</option>
          {APPROACHES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">Difficulty</span>
        <select
          className={field}
          value={value.difficulty}
          onChange={(e) => set('difficulty', e.target.value as FilterState['difficulty'])}
        >
          <option value="all">All</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">Completion</span>
        <select
          className={field}
          value={value.completion}
          onChange={(e) => set('completion', e.target.value as Completion)}
        >
          <option value="all">All</option>
          <option value="both">Cleared by both</option>
          <option value="either">Cleared by either</option>
          <option value="neither">Cleared by neither</option>
          {players.map((p) => (
            <option key={p.steamId} value={`only:${p.steamId}`}>
              Only {p.name}
            </option>
          ))}
        </select>
      </label>

      <p className="text-muted-foreground col-span-2 text-xs tabular-nums sm:col-span-4">
        Showing {shown} of {total} heists
      </p>
    </section>
  );
}
