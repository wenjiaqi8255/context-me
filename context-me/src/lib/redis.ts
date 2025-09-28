import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export default redis

export class CacheService {
  private redis: Redis

  constructor() {
    this.redis = redis
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.redis.get(key)
      return result ? JSON.parse(result as string) : null
    } catch (error) {
      console.error('Redis GET error:', error)
      return null
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      console.error('Redis SET error:', error)
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key)
    } catch (error) {
      console.error('Redis DEL error:', error)
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Redis EXISTS error:', error)
      return false
    }
  }

  async incr(key: string, ttl: number = 60): Promise<number> {
    try {
      const result = await this.redis.incr(key)
      if (result === 1) {
        await this.redis.expire(key, ttl)
      }
      return result
    } catch (error) {
      console.error('Redis INCR error:', error)
      return 0
    }
  }
}