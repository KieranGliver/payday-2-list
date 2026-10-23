export interface HealthInput {
  readonly path: string | null;
  readonly method: string | null;
  readonly query: string | null;
}

export interface HealthResult extends HealthInput {
  readonly ok: true;
  readonly time: string;
}

/**
 * Pure handler logic. Deliberately free of AWS types so the same function
 * backs both the Lambda adapter and the Vite dev-server middleware.
 */
export function health(input: HealthInput): HealthResult {
  return { ok: true, ...input, time: new Date().toISOString() };
}
