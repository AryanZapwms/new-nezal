import redis from "./redis";

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.error(`[cache] read failed for key "${key}":`, err);
  }

  const fresh = await fetcher();

  try {
    await redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds);
  } catch (err) {
    console.error(`[cache] write failed for key "${key}":`, err);
  }

  return fresh;
}

export async function invalidateCache(pattern: string) {
  if (!pattern.includes("*")) {
    await redis.del(pattern);
    return;
  }
  const keys = await redis.keys(pattern);
  if (keys.length) {
    await redis.del(...keys);
  }
}