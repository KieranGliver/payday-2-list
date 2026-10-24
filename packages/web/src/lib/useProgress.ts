import type { ProgressResult } from '@pd2/shared';
import { useCallback, useEffect, useState } from 'react';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
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

  const load = useCallback(async (signal?: AbortSignal): Promise<State | null> => {
    try {
      const res = await fetch('/api/progress', { signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = (await res.json()) as ProgressResult | { error: string };
      if ('error' in data) throw new Error(data.error);
      return { status: 'ready', data };
    } catch (cause) {
      if (signal?.aborted) return null;
      return { status: 'error', message: cause instanceof Error ? cause.message : String(cause) };
    }
  }, []);

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
