import { resolveApiKey, resolvePlayers } from './config.js';
import { getProgress } from './getProgress.js';
import { createSteamClient } from './steam.js';

interface FunctionUrlEvent {
	readonly requestContext?: {
		readonly http?: { readonly path?: string; readonly method?: string };
	};
}

interface LambdaResponse {
	readonly statusCode: number;
	readonly headers: Record<string, string>;
	readonly body: string;
}

/**
 * Deliberately uncached.
 *
 * Progress should reflect a heist the moment it is finished, so every request
 * hits Steam. Two players per request against a 100k/day key quota leaves
 * ample headroom - 1000 page loads a day is 2000 calls, under 2% of it.
 */
const json = (statusCode: number, body: unknown): LambdaResponse => ({
	statusCode,
	headers: {
		'content-type': 'application/json',
		'cache-control': 'no-store',
	},
	body: JSON.stringify(body),
});

export const handler = async (
	event: FunctionUrlEvent,
): Promise<LambdaResponse> => {
	const path = event.requestContext?.http?.path ?? '/';

	if (path.endsWith('/health')) {
		return json(200, { ok: true, time: new Date().toISOString() });
	}

	try {
		const apiKey = await resolveApiKey();
		const players = resolvePlayers();
		return json(200, await getProgress(players, createSteamClient(apiKey)));
	} catch (cause) {
		// Configuration and unexpected failures. Per-player Steam errors are
		// already folded into the successful response by getProgress.
		console.error('getProgress failed', cause);
		return json(500, { error: 'could not read progress' });
	}
};
