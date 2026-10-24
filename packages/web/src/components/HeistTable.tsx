import type { Heist, PlayerProgress } from '@pd2/shared';
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Minus } from 'lucide-react';
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
      <Icon className="size-3.5 shrink-0" aria-hidden />
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
function Cleared({ at }: { at: number | undefined }) {
  if (at === undefined) {
    return (
      <>
        <Minus className="text-muted-foreground mx-auto size-4" aria-hidden />
        <span className="sr-only">Not cleared</span>
      </>
    );
  }
  const when = new Date(at * 1000).toLocaleDateString();
  return (
    <span title={`Cleared ${when}`}>
      <Check className="mx-auto size-4" style={{ color: 'var(--status-good)' }} aria-hidden />
      <span className="sr-only">Cleared {when}</span>
    </span>
  );
}

const difficultyTone: Record<string, string> = {
  EASY: 'text-muted-foreground',
  MEDIUM: 'text-foreground',
  HARD: 'text-foreground font-medium',
};

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
            <TableHead className="bg-background sticky left-0 z-10 min-w-44 border-r">
              <SortButton label="Heist" columnKey="heist" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="min-w-32">
              <SortButton label="Contractor" columnKey="contractor" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="min-w-28">
              <SortButton label="Approach" columnKey="approach" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="min-w-28">
              <SortButton label="Difficulty" columnKey="difficulty" sort={sort} onSort={onSort} />
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
              <TableHead key={p.steamId} className="min-w-28 text-center">
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
              <TableCell className="bg-background sticky left-0 z-10 border-r font-medium">
                {h.heist}
              </TableCell>
              <TableCell className="text-muted-foreground">{h.contractor}</TableCell>
              <TableCell>
                <Badge variant="outline">{h.approach}</Badge>
              </TableCell>
              <TableCell className={difficultyTone[h.perceivedDifficulty]}>
                {h.perceivedDifficulty}
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {h.globalPct.toFixed(1)}%
              </TableCell>
              {players.map((p) => (
                <TableCell key={p.steamId} className="text-center">
                  <Cleared at={p.unlocked[h.id]} />
                </TableCell>
              ))}
            </TableRow>
          ))}
          {heists.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5 + players.length} className="text-muted-foreground h-24 text-center">
                No heists match these filters.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
