import { health } from './health';

/** Minimal shape of a Lambda Function URL invocation event. */
interface FunctionUrlEvent {
  readonly rawQueryString?: string;
  readonly requestContext?: {
    readonly http?: { readonly path?: string; readonly method?: string };
  };
}

interface LambdaResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export const handler = async (event: FunctionUrlEvent): Promise<LambdaResponse> => {
  const http = event.requestContext?.http;
  const result = health({
    path: http?.path ?? null,
    method: http?.method ?? null,
    query: event.rawQueryString ?? null,
  });
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(result),
  };
};
