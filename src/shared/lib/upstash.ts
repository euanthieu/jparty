import { Redis } from "@upstash/redis";

let client: Redis | null = null;

/** Vercel's dashboard stores a cleared variable as "", not undefined — treat blank the same as absent. */
function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** Thrown when Upstash credentials are absent, so callers can tell config errors from network errors. */
export class UpstashNotConfiguredError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Upstash is not configured. Missing: ${missing.join(", ")}.`);
    this.name = "UpstashNotConfiguredError";
    this.missing = missing;
  }
}

/**
 * A database connected through the Vercel Marketplace may expose its REST
 * credentials as KV_REST_API_*, so accept either naming.
 */
function credentials() {
  return {
    url: read("UPSTASH_REDIS_REST_URL") ?? read("KV_REST_API_URL"),
    token: read("UPSTASH_REDIS_REST_TOKEN") ?? read("KV_REST_API_TOKEN"),
  };
}

/** Names of the vars that are absent or blank. Empty array means the credentials are present. */
export function missingUpstashVars(): string[] {
  const { url, token } = credentials();
  return [
    url ? null : "UPSTASH_REDIS_REST_URL",
    token ? null : "UPSTASH_REDIS_REST_TOKEN",
  ].filter((name): name is string => name !== null);
}

/**
 * Lazily constructed so a missing config doesn't crash the whole app at
 * import time — only requests that actually need storage fail.
 */
export function getRedis(): Redis {
  if (client) return client;

  const missing = missingUpstashVars();
  if (missing.length > 0) {
    throw new UpstashNotConfiguredError(missing);
  }

  const { url, token } = credentials();
  client = new Redis({ url: url as string, token: token as string });
  return client;
}
