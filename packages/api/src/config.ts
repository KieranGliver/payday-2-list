import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { ConfigError, parsePlayers, type Player } from '@pd2/shared';

let cachedKey: string | undefined;

/** Steam web API keys are 32 hex characters. */
const API_KEY_PATTERN = /^[0-9A-Fa-f]{32}$/;

function assertUsableKey(value: string, source: string): string {
	const key = value.trim();
	// A truncated or whitespace-padded key previously passed the old
	// truthiness check, then produced a per-player HTTP 403 - which reads as
	// "that profile is private" rather than "your key is wrong".
	if (!API_KEY_PATTERN.test(key)) {
		throw new ConfigError(`${source} is not a 32-character Steam API key`);
	}
	return key;
}

/**
 * Resolves the Steam Web API key.
 *
 * Local dev reads STEAM_API_KEY from the environment. Lambda reads the
 * SecureString named by STEAM_API_KEY_PARAM, once per cold start.
 */
export async function resolveApiKey(): Promise<string> {
	if (cachedKey) return cachedKey;

	const direct = process.env['STEAM_API_KEY'];
	if (direct?.trim()) {
		cachedKey = assertUsableKey(direct, 'STEAM_API_KEY');
		return cachedKey;
	}

	const name = process.env['STEAM_API_KEY_PARAM'];
	if (!name) {
		throw new ConfigError(
			'neither STEAM_API_KEY nor STEAM_API_KEY_PARAM is set',
		);
	}

	const ssm = new SSMClient({});
	const res = await ssm.send(
		new GetParameterCommand({ Name: name, WithDecryption: true }),
	);
	const value = res.Parameter?.Value;
	if (!value) throw new ConfigError(`SSM parameter ${name} is empty`);

	cachedKey = assertUsableKey(value, `SSM parameter ${name}`);
	return cachedKey;
}

/**
 * Players to report on.
 *
 * Server-side config rather than a query parameter, so the endpoint can't be
 * used to look up arbitrary Steam profiles on our API quota. The parser lives
 * in @pd2/shared so the Vite dev middleware uses exactly the same one.
 */
export function resolvePlayers(): readonly Player[] {
	return parsePlayers(process.env['PD2_PLAYERS']);
}
