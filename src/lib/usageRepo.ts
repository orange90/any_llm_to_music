import type { Redis as RedisType } from '@upstash/redis';

export interface UsageRow {
  day: string;
  count: number;
}

export interface UsageRepo {
  today(): Promise<UsageRow>;
  increment(): Promise<UsageRow>;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readRedisCreds(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    '';
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    '';
  if (!url || !token) return null;
  return { url, token };
}

const PREFIX = 'default_llm_usage:';

let _redisClient: RedisType | null = null;
async function getRedis(creds: { url: string; token: string }): Promise<RedisType> {
  if (_redisClient) return _redisClient;
  const mod = await import('@upstash/redis');
  _redisClient = new mod.Redis({ url: creds.url, token: creds.token });
  return _redisClient;
}

function createRedisRepo(creds: { url: string; token: string }): UsageRepo {
  return {
    async today(): Promise<UsageRow> {
      const redis = await getRedis(creds);
      const day = todayKey();
      const value = await redis.get<number>(`${PREFIX}${day}`);
      return { day, count: typeof value === 'number' ? value : 0 };
    },
    async increment(): Promise<UsageRow> {
      const redis = await getRedis(creds);
      const day = todayKey();
      const key = `${PREFIX}${day}`;
      const count = await redis.incr(key);
      await redis.expire(key, 60 * 60 * 24 * 3);
      return { day, count };
    },
  };
}

function createSqliteRepo(): UsageRepo {
  return {
    async today(): Promise<UsageRow> {
      const mod = await import('./db');
      return mod.defaultUsageRepo.today();
    },
    async increment(): Promise<UsageRow> {
      const mod = await import('./db');
      return mod.defaultUsageRepo.increment();
    },
  };
}

let _repo: UsageRepo | null = null;

export function getUsageRepo(): UsageRepo {
  if (_repo) return _repo;
  const creds = readRedisCreds();
  _repo = creds ? createRedisRepo(creds) : createSqliteRepo();
  return _repo;
}

export const defaultUsageRepo: UsageRepo = {
  today: () => getUsageRepo().today(),
  increment: () => getUsageRepo().increment(),
};
