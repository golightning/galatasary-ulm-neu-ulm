/**
 * Rate-Limiter mit Upstash Redis (Produktion) oder In-Memory (lokal/Fallback).
 *
 * Konfiguration für Produktion (Vercel):
 *   UPSTASH_REDIS_REST_URL  → Upstash Redis REST URL
 *   UPSTASH_REDIS_REST_TOKEN → Upstash Redis REST Token
 *
 * Ohne diese Variablen wird auf In-Memory zurückgefallen (nur für lokale Entwicklung
 * oder Single-Instance-Deploys geeignet).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Upstash-basierter Limiter ────────────────────────────────────────────────
// Instanzen werden gecacht um pro Request keine neue Redis-Verbindung zu öffnen

const limiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(maxRequests: number, windowSeconds: number): Ratelimit {
  const cacheKey = `${maxRequests}:${windowSeconds}`;
  if (!limiterCache.has(cacheKey)) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    limiterCache.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
        analytics: false,
      })
    );
  }
  return limiterCache.get(cacheKey)!;
}

async function upstashRateLimit(
  key: string,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number }> {
  const limiter = getUpstashLimiter(maxRequests, 60);
  const { success, remaining } = await limiter.limit(key);
  return { allowed: success, remaining };
}

// ── In-Memory-Fallback (Single-Instance) ────────────────────────────────────

const windowMs = 60 * 1000;
const requests = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of requests) {
    if (val.resetAt < now) requests.delete(key);
  }
}, 5 * 60 * 1000);

function inMemoryRateLimit(
  key: string,
  maxRequests: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = requests.get(key);

  if (!entry || entry.resetAt < now) {
    requests.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { allowed: entry.count <= maxRequests, remaining };
}

// ── Öffentliche API ──────────────────────────────────────────────────────────

export async function rateLimit(
  key: string,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number }> {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return upstashRateLimit(key, maxRequests);
  }
  return inMemoryRateLimit(key, maxRequests);
}
