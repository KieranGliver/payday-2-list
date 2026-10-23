import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import type { Player } from './getProgress';

let cachedKey: string | undefined;

/**
 * Resolves the Steam Web API key.
 *
 * Local dev reads STEAM_API_KEY from the environment. Lambda reads the
 * SecureString named by STEAM_API_KEY_PARAM, once per cold start.
 */
export async function resolveApiKey(): Promise<string> {
  if (cachedKey) return cachedKey;

  const direct = process.env['STEAM_API_KEY'];
  if (direct) {
    cachedKey = direct;
    return cachedKey;
  }

  const name = process.env['STEAM_API_KEY_PARAM'];
  if (!name) {
    throw new Error('neither STEAM_API_KEY nor STEAM_API_KEY_PARAM is set');
  }

  const ssm = new SSMClient({});
  const res = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  const value = res.Parameter?.Value;
  if (!value) throw new Error(`SSM parameter ${name} is empty`);

  cachedKey = value;
  return cachedKey;
}

/**
 * Players to report on, from PD2_PLAYERS as `steamid:name` pairs:
 *
 *   PD2_PLAYERS=76561198103504838:yogizmo,76561198096708910:Eggsenbacon
 *
 * Server-side config rather than a query parameter, so the endpoint can't be
 * used to look up arbitrary Steam profiles on our API quota.
 */
export function resolvePlayers(): readonly Player[] {
  const raw = process.env['PD2_PLAYERS'];
  if (!raw) throw new Error('PD2_PLAYERS is not set');

  const players = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [steamId, ...rest] = entry.split(':');
      const name = rest.join(':').trim();
      if (!steamId || !name) {
        throw new Error(`PD2_PLAYERS entry is not "steamid:name": ${entry}`);
      }
      return { steamId: steamId.trim(), name };
    });

  if (players.length === 0) throw new Error('PD2_PLAYERS contained no entries');
  return players;
}
