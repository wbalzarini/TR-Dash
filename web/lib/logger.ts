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
      throw new Error(`${response.status} ${response.statusText} from ${hostOf(url)}`);
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
