import { DIFFICULTIES, type Heist, type PlayerProgress } from '@pd2/shared';

export type SortKey =
  | 'heist'
  | 'contractor'
  | 'approach'
  | 'difficulty'
  | 'globalPct'
  | `player:${string}`;

export interface SortState {
  readonly key: SortKey;
  readonly desc: boolean;
}

/** Contractor, then heist name - the spreadsheet's original order. */
export const INITIAL_SORT: SortState = { key: 'contractor', desc: false };

/** EASY < MEDIUM < HARD, so difficulty sorts by severity not alphabetically. */
const difficultyRank = (h: Heist) => DIFFICULTIES.indexOf(h.perceivedDifficulty);

function value(heist: Heist, key: SortKey, players: readonly PlayerProgress[]): string | number {
  switch (key) {
    case 'heist':
      return heist.heist;
    case 'contractor':
      return heist.contractor;
    case 'approach':
      return heist.approach;
    case 'difficulty':
      return difficultyRank(heist);
    case 'globalPct':
      return heist.globalPct;
    default: {
      const steamId = key.slice('player:'.length);
      const player = players.find((p) => p.steamId === steamId);
      // Unlock time doubles as the sort value, so a player column orders by
      // when each heist was cleared. Uncleared sorts last either way.
      return player?.unlocked[heist.id] ?? -1;
    }
  }
}

export function sortHeists(
  heists: readonly Heist[],
  sort: SortState,
  players: readonly PlayerProgress[],
): readonly Heist[] {
  const dir = sort.desc ? -1 : 1;
  return [...heists].sort((a, b) => {
    const av = value(a, sort.key, players);
    const bv = value(b, sort.key, players);
    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
    // Heist name is always the tiebreaker, so equal keys stay stable and
    // readable rather than falling back to catalog order.
    return cmp !== 0 ? cmp * dir : a.heist.localeCompare(b.heist);
  });
}
