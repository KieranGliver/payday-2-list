import { CATALOG, type PlayerProgress } from '@pd2/shared';
import { RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Filters } from '@/components/Filters';
import { HeistTable } from '@/components/HeistTable';
import { ProgressMeter } from '@/components/ProgressMeter';
import { Button } from '@/components/ui/button';
import { applyFilters, INITIAL_FILTERS, type FilterState } from '@/lib/filters';
import { INITIAL_SORT, sortHeists, type SortKey, type SortState } from '@/lib/sort';
import { useProgress } from '@/lib/useProgress';

/** Stable identity, so the memos below don't re-run on every render. */
const NO_PLAYERS: readonly PlayerProgress[] = [];

export default function App() {
  const { state, reload } = useProgress();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [sort, setSort] = useState<SortState>(INITIAL_SORT);

  const players = useMemo(
    () => (state.status === 'ready' ? state.data.players : NO_PLAYERS),
    [state],
  );

  const rows = useMemo(
    () => sortHeists(applyFilters(CATALOG, players, filters), sort, players),
    [players, filters, sort],
  );

  const both = useMemo(
    () =>
      players.length === 0
        ? 0
        : CATALOG.filter((h) => players.every((p) => h.id in p.unlocked)).length,
    [players],
  );

  /** Clicking the active column flips direction; a new column starts ascending. */
  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: false }));

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-wide uppercase">
              Payday 2 <span className="text-primary">One Down</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              {state.status === 'ready' ? (
                <>Synced from Steam {new Date(state.data.fetchedAt).toLocaleTimeString()}</>
              ) : state.status === 'loading' ? (
                'Reading achievements from Steam…'
              ) : (
                <span className="text-destructive">{state.message}</span>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reload} disabled={state.status === 'loading'}>
            <RefreshCw className={state.status === 'loading' ? 'animate-spin' : ''} aria-hidden />
            Refresh
          </Button>
        </header>

        <ProgressMeter both={both} total={CATALOG.length} players={players} />

        <Filters
          value={filters}
          onChange={setFilters}
          players={players}
          shown={rows.length}
          total={CATALOG.length}
        />

        <HeistTable heists={rows} players={players} sort={sort} onSort={onSort} />
      </div>
    </div>
  );
}
