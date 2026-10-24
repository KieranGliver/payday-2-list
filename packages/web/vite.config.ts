import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';

/** Resolved lazily through Vite so their TypeScript is transformed for us. */
const API_ENTRY = fileURLToPath(
	new URL('../api/src/index.ts', import.meta.url),
);
const SHARED_ENTRY = fileURLToPath(
	new URL('../shared/src/index.ts', import.meta.url),
);

type ApiModule = typeof import('@pd2/api');
type SharedModule = typeof import('@pd2/shared');

/**
 * Serves /api/progress locally using the same pure handler the Lambda runs.
 *
 * Without this, the request falls through to Vite's SPA fallback and returns
 * index.html with a 200, so response.json() fails on "<!doctype html>".
 *
 * The module is loaded via server.ssrLoadModule rather than a top-level
 * import: vite.config.ts is evaluated by Node, which cannot resolve the
 * workspace package's extensionless TypeScript imports. Loading it through
 * Vite also means edits to the handler hot-reload.
 *
 * STEAM_API_KEY comes from loadEnv, so it stays in the Node process and never
 * reaches the browser bundle.
 */
function localApi(env: Record<string, string>): Plugin {
	return {
		name: 'pd2-local-api',
		configureServer(server: ViteDevServer) {
			server.middlewares.use('/api/progress', async (_req, res) => {
				res.setHeader('content-type', 'application/json');
				res.setHeader('cache-control', 'no-store');
				try {
					const apiKey = env['STEAM_API_KEY'];
					if (!apiKey) {
						throw new Error(
							'STEAM_API_KEY missing - copy .env.example to .env.local',
						);
					}
					const { getProgress, createSteamClient } =
						(await server.ssrLoadModule(API_ENTRY)) as unknown as ApiModule;
					// The SAME parser the Lambda uses. These were previously two
					// separate implementations that disagreed - the dev one accepted
					// a nameless entry that production rejected - quietly defeating
					// the "both run identical logic" guarantee this plugin claims.
					const { parsePlayers } = (await server.ssrLoadModule(
						SHARED_ENTRY,
					)) as unknown as SharedModule;

					const players = parsePlayers(env['PD2_PLAYERS']);
					res.end(
						JSON.stringify(
							await getProgress(players, createSteamClient(apiKey)),
						),
					);
				} catch (cause) {
					res.statusCode = 500;
					server.config.logger.error(`[pd2-local-api] ${String(cause)}`);
					// Same envelope shape as the Lambda, so the client's error
					// handling is exercised in dev rather than only in production.
					res.end(
						JSON.stringify({
							error: cause instanceof Error ? cause.message : String(cause),
							code: 'misconfigured',
						}),
					);
				}
			});
		},
	};
}

export default defineConfig(({ mode }) => {
	// '' prefix loads every var, not just VITE_*.
	const env = loadEnv(mode, import.meta.dirname, '');
	return {
		plugins: [react(), tailwindcss(), localApi(env)],
		resolve: {
			alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
		},
	};
});
