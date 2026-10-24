import {
	apiErrorSchema,
	ContractError,
	parseProgressResult,
	type ProgressResult,
} from '@pd2/shared';
import { useCallback, useEffect, useState } from 'react';

/** Why the fetch failed, so the UI can say something useful. */
export type FailureKind =
	/** Could not reach the API at all. */
	| 'network'
	/** The API answered with its error envelope. */
	| 'api'
	/** The API answered, but not with the shape we expect. */
	| 'contract';

type State =
	| { status: 'loading' }
	| { status: 'error'; kind: FailureKind; message: string }
	| { status: 'ready'; data: ProgressResult };

/**
 * Fetches /api/progress.
 *
 * Relative URL on purpose: same-origin in dev (Vite middleware) and in
 * production (CloudFront routes /api/* to the Lambda), so there is no API
 * base URL to configure per environment.
 *
 * `load` returns the next state rather than setting it, so the effect applies
 * it from a promise callback. That keeps setState out of the effect body - a
 * synchronous setState there causes the cascading render the hooks lint rule
 * warns about. `null` means the request was aborted and should be ignored.
 */
export function useProgress() {
	const [state, setState] = useState<State>({ status: 'loading' });

	const load = useCallback(
		async (signal?: AbortSignal): Promise<State | null> => {
			try {
				const res = await fetch('/api/progress', { signal, cache: 'no-store' });

				// The body is read BEFORE checking res.ok. Throwing on the status
				// first meant the API's own error envelope was never read, so every
				// server-side failure showed as a bare "API returned 500" and the
				// real reason stayed in CloudWatch.
				let body: unknown;
				try {
					body = await res.json();
				} catch {
					return {
						status: 'error',
						kind: res.ok ? 'contract' : 'network',
						message: `API returned ${res.status} with a non-JSON body`,
					};
				}

				if (!res.ok) {
					const err = apiErrorSchema.safeParse(body);
					return {
						status: 'error',
						kind: 'api',
						message: err.success
							? err.data.error
							: `API returned ${res.status}`,
					};
				}

				return { status: 'ready', data: parseProgressResult(body) };
			} catch (cause) {
				if (signal?.aborted) return null;
				if (cause instanceof ContractError) {
					return { status: 'error', kind: 'contract', message: cause.message };
				}
				return {
					status: 'error',
					kind: 'network',
					message:
						cause instanceof Error ? cause.message : 'could not reach the API',
				};
			}
		},
		[],
	);

	const apply = useCallback((next: State | null) => {
		if (next) setState(next);
	}, []);

	useEffect(() => {
		const ac = new AbortController();
		void load(ac.signal).then(apply);
		return () => ac.abort();
	}, [load, apply]);

	const reload = useCallback(() => {
		setState({ status: 'loading' });
		void load().then(apply);
	}, [load, apply]);

	return { state, reload };
}
