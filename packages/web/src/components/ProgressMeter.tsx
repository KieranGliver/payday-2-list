import type { PlayerProgress } from '@pd2/shared';

interface Props {
  readonly both: number;
  readonly total: number;
  readonly players: readonly PlayerProgress[];
}

/**
 * A single ratio against a limit, so the form is a meter, not a chart.
 *
 * The track is a lighter step of the fill's own hue (blue on blue) so state
 * reads across the whole bar. Both steps are validator-checked against the
 * real surfaces - see the comment in index.css.
 *
 * Exactly one hero figure per view: the count cleared by both players, which
 * is the number actually being tracked.
 */
export function ProgressMeter({ both, total, players }: Props) {
  const pct = total === 0 ? 0 : (both / total) * 100;

  return (
    <section aria-labelledby="progress-heading">
      <h2 id="progress-heading" className="text-muted-foreground text-sm font-medium">
        Cleared together
      </h2>

      {/* Hero figure: proportional figures, not tabular - tabular-nums makes a
          large number look loose at display sizes. */}
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-5xl font-semibold tracking-tight">{both}</span>
        <span className="text-muted-foreground text-xl">/ {total}</span>
        <span className="text-muted-foreground ml-auto text-sm tabular-nums">
          {pct.toFixed(1)}%
        </span>
      </p>

      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: 'var(--meter-track)' }}
        role="meter"
        aria-valuenow={both}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${both} of ${total} heists cleared by both players`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: 'var(--meter-fill)' }}
        />
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {players.map((p) => (
          <div key={p.steamId} className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">{p.name}</dt>
            <dd className="font-medium tabular-nums">
              {p.completed}/{total}
            </dd>
            {p.error ? (
              <dd className="text-destructive text-xs">({p.error})</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
