/** Payday 2. */
const APPID = 218620;

const ENDPOINT = 'https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/';

export class SteamError extends Error {
  constructor(
    message: string,
    readonly steamId: string,
  ) {
    super(message);
    this.name = 'SteamError';
  }
}

interface RawAchievement {
  readonly apiname: string;
  readonly achieved: 0 | 1;
  readonly unlocktime: number;
}

interface RawResponse {
  readonly playerstats?: {
    readonly success?: boolean;
    readonly error?: string;
    readonly achievements?: readonly RawAchievement[];
  };
}

/** Maps a Steam achievement id to the unix time it was unlocked. */
export type Unlocked = ReadonlyMap<string, number>;

export interface SteamClient {
  getUnlocked(steamId: string): Promise<Unlocked>;
}

/**
 * Reads unlocked achievements for a player.
 *
 * Steam returns all ~1342 achievements with an `achieved` flag; we keep only
 * the unlocked ones and their `unlocktime`, which is why no completion history
 * needs storing anywhere.
 *
 * A profile with Game details set to anything but Public comes back with
 * `success: false` and an error string rather than an empty list.
 */
export function createSteamClient(apiKey: string): SteamClient {
  return {
    async getUnlocked(steamId) {
      const url = new URL(ENDPOINT);
      url.searchParams.set('key', apiKey);
      url.searchParams.set('steamid', steamId);
      url.searchParams.set('appid', String(APPID));

      let res: Response;
      try {
        res = await fetch(url);
      } catch (cause) {
        throw new SteamError(`network error reaching Steam: ${String(cause)}`, steamId);
      }

      if (!res.ok) {
        // Never surface the URL - it contains the API key.
        throw new SteamError(`Steam returned HTTP ${res.status}`, steamId);
      }

      const body = (await res.json()) as RawResponse;
      const stats = body.playerstats;

      if (!stats?.success) {
        throw new SteamError(stats?.error ?? 'Steam reported failure with no error message', steamId);
      }

      return new Map(
        (stats.achievements ?? [])
          .filter((a) => a.achieved === 1)
          .map((a) => [a.apiname, a.unlocktime] as const),
      );
    },
  };
}
