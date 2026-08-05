import 'server-only';

import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: number; resetAt: number; retryAfterSec: number };

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex').slice(0, 40);
}

function memoryConsume(key: string, limit: number, windowMs: number, now: number): RateLimitResult {
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  memoryBuckets.set(key, existing);
  return { ok: true, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}

/**
 * Sliding fixed-window rate limit. Prefers Firestore so limits survive
 * multi-instance deploys; falls back to in-memory if Firebase is unavailable.
 */
export async function enforceRateLimit(opts: {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const now = Date.now();
  const docId = hashKey(`${opts.namespace}:${opts.key}`);
  const memoryKey = `${opts.namespace}:${docId}`;

  const db = getAdminDb();
  if (!db) {
    return memoryConsume(memoryKey, opts.limit, opts.windowMs, now);
  }

  const ref = db.collection('rate_limits').doc(docId);

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : null;
      const resetAt = typeof data?.resetAt === 'number' ? data.resetAt : 0;
      const count = typeof data?.count === 'number' ? data.count : 0;

      if (!snap.exists || resetAt <= now) {
        const nextReset = now + opts.windowMs;
        tx.set(ref, {
          namespace: opts.namespace,
          count: 1,
          resetAt: nextReset,
          updatedAt: new Date(now).toISOString(),
        });
        return { ok: true as const, remaining: Math.max(0, opts.limit - 1), resetAt: nextReset };
      }

      if (count >= opts.limit) {
        return {
          ok: false as const,
          remaining: 0,
          resetAt,
          retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
        };
      }

      tx.update(ref, {
        count: count + 1,
        updatedAt: new Date(now).toISOString(),
      });
      return { ok: true as const, remaining: Math.max(0, opts.limit - (count + 1)), resetAt };
    });
  } catch (error) {
    console.error('[rate-limit] Firestore failed, using memory', error);
    return memoryConsume(memoryKey, opts.limit, opts.windowMs, now);
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

export function getOrCreateStatsSessionId(request: NextRequest): {
  sessionId: string;
  setCookie: boolean;
} {
  const existing = request.cookies.get('ucu_stats_sid')?.value?.trim();
  if (existing && /^[a-f0-9]{32}$/i.test(existing)) {
    return { sessionId: existing.toLowerCase(), setCookie: false };
  }

  const sessionId = createHash('sha256')
    .update(`${Date.now()}:${Math.random()}:${getClientIp(request)}`)
    .digest('hex')
    .slice(0, 32);

  return { sessionId, setCookie: true };
}

export function applyStatsSessionCookie(
  response: { cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void } },
  sessionId: string
) {
  response.cookies.set('ucu_stats_sid', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.ok
      ? {}
      : { 'Retry-After': String(result.retryAfterSec) }),
  };
}
