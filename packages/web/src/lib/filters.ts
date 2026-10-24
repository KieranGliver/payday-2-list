import type { Approach, Contractor, Heist, PerceivedDifficulty, PlayerProgress } from '@pd2/shared';

export type Completion = 'all' | 'both' | 'either' | 'neither' | `only:${string}`;

export interface FilterState {
  readonly contractor: Contractor | 'all';
  readonly approach: Approach | 'all';
  readonly difficulty: PerceivedDifficulty | 'all';
  readonly completion: Completion;
}

export const INITIAL_FILTERS: FilterState = {
  contractor: 'all',
  approach: 'all',
  difficulty: 'all',
  completion: 'all',
};

const done = (player: PlayerProgress, heist: Heist) => heist.id in player.unlocked;

export function matchesCompletion(
  heist: Heist,
  players: readonly PlayerProgress[],
  completion: Completion,
): boolean {
  if (completion === 'all') return true;

  const cleared = players.filter((p) => done(p, heist));

  if (completion === 'both') return cleared.length === players.length;
  if (completion === 'either') return cleared.length > 0;
  if (completion === 'neither') return cleared.length === 0;

  // only:<steamId> - that player has it and nobody else does
  const steamId = completion.slice('only:'.length);
  return cleared.length === 1 && cleared[0]?.steamId === steamId;
}

export function applyFilters(
  catalog: readonly Heist[],
  players: readonly PlayerProgress[],
  f: FilterState,
): readonly Heist[] {
  return catalog.filter(
    (h) =>
      (f.contractor === 'all' || h.contractor === f.contractor) &&
      (f.approach === 'all' || h.approach === f.approach) &&
      (f.difficulty === 'all' || h.perceivedDifficulty === f.difficulty) &&
      matchesCompletion(h, players, f.completion),
  );
}
