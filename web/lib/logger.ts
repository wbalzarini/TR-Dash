/**
 * Server-side logging for upstream failures.
 *
 * Deliberately boring: one line per failure on stderr, which is what Vercel's
 * runtime log drain picks up. The point is that a silently-degrading dashboard
 * leaves a trail.
 */

export function logFailure(source: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `[trident] upstream failure source=${source} at=${new Date().toISOString()} error=${message}`,
  );
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
}

/** Carries the status code so callers can tell "no data" from a real outage. */
export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function logInfo(source: string, message: string): void {
  console.log(`[trident] ${source}: ${message}`);
}

/**
 * `fetch` with a hard timeout and a descriptive error. Every outbound request
 * in this app goes through here so nothing can hang a route indefinitely.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 10_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        "user-agent": "TridentIslandDashboard/1.0 (private family dashboard)",
        ...(rest.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      // Several of these APIs explain themselves in the body and say nothing
      // useful in the status line — USGS answers "no matching data" with a
      // bare 400. Carry a snippet through so the failure is diagnosable from
      // the /api/* route without re-running the request by hand.
      let detail = "";
      try {
        const body = (await response.text()).trim().replace(/\s+/g, " ");
        if (body) detail = `: ${body.slice(0, 300)}`;
      } catch {
        // A body we can't read is not worth failing over.
      }
      throw new HttpError(
        `${response.status} ${response.statusText} from ${hostOf(url)}${detail}`,
        response.status,
      );
    }
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`timed out after ${timeoutMs}ms calling ${hostOf(url)}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
