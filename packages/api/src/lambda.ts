import { ConfigError, type ApiError } from '@pd2/shared';

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

const fail = (statusCode: number, error: ApiError): LambdaResponse =>
	json(statusCode, error);

export const handler = async (
	event: FunctionUrlEvent,
): Promise<LambdaResponse> => {
	const http = event.requestContext?.http;
	const path = http?.path ?? '/';
	const method = (http?.method ?? 'GET').toUpperCase();

	// Only GET and HEAD reach Steam. Previously any method on any path
	// triggered a live upstream call.
	if (method !== 'GET' && method !== 'HEAD') {
		return fail(405, { error: `${method} is not allowed`, code: 'unexpected' });
	}

	if (path.endsWith('/health')) {
		return json(200, { ok: true, time: new Date().toISOString() });
	}

	try {
		const apiKey = await resolveApiKey();
		const players = resolvePlayers();
		return json(200, await getProgress(players, createSteamClient(apiKey)));
	} catch (cause) {
		console.error('getProgress failed', cause);

		// Configuration faults are the operator's problem and their messages are
		// safe to surface - they name an env var, never a secret value. Anything
		// else stays generic, with detail only in CloudWatch.
		if (cause instanceof ConfigError) {
			return fail(500, { error: cause.message, code: 'misconfigured' });
		}
		return fail(502, {
			error: 'could not read progress from Steam',
			code: 'upstream_failed',
		});
	}
};
