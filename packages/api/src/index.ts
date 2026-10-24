/**
 * The pure, environment-free half of the API.
 *
 * Imported by the Lambda adapter in production and by the Vite dev-server
 * middleware locally, so both run identical logic. Deliberately does not
 * export anything from config.ts, which pulls in the AWS SDK.
 */
export {
	getProgress,
	type Player,
	type PlayerProgress,
	type ProgressResult,
} from './getProgress.js';
export {
	createSteamClient,
	SteamError,
	type SteamClient,
	type SteamFailure,
	type Unlocked,
} from './steam.js';
