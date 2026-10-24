/** Contractors as grouped in the tracker. */
export const CONTRACTORS = [
  'Bain',
  'Classic',
  'Events',
  'Hector',
  'Locke',
  'The Butcher',
  'The Dentist',
  'The Elephant',
  'Vlad',
  'Other',
] as const;
export type Contractor = (typeof CONTRACTORS)[number];

/** How the heist is approached. */
export const APPROACHES = ['LOUD', 'STEALTH', 'BOTH'] as const;
export type Approach = (typeof APPROACHES)[number];

/** Our own difficulty call, not Steam's. */
export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type PerceivedDifficulty = (typeof DIFFICULTIES)[number];

/** Facts that come from Steam. Regenerated; never hand-edited. */
export interface SteamHeist {
  /** Steam achievement `api_name` - the join key against GetPlayerAchievements. */
  readonly id: string;
  readonly heist: string;
  /** Human-facing achievement name, e.g. "Disaster Tourist". */
  readonly achievement: string;
  /** Percentage of all Payday 2 owners who have this achievement. */
  readonly globalPct: number;
  /** Steam CDN hash for the colour achievement icon (64x64 jpeg). */
  readonly icon: string;
  /** Steam CDN hash for the greyed-out variant. */
  readonly iconGray: string;
}

/** Builds a Steam CDN URL from an icon hash stored in the catalog. */
export const iconUrl = (hash: string): string =>
  `https://shared.fastly.steamstatic.com/community_assets/images/apps/218620/${hash}.jpg`;

/** Our judgements. Hand-maintained; never regenerated. */
export interface Rating {
  readonly contractor: Contractor;
  readonly approach: Approach;
  readonly perceivedDifficulty: PerceivedDifficulty;
}

/** A heist with Steam's facts and our judgements joined. */
export interface Heist extends SteamHeist, Rating {}
