import { kv } from '@vercel/kv'
import { prisma } from './prisma'

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

export async function rateLimit(userId: string, limit: number = 60): Promise<RateLimitResult> {
  const key = `rate_limit:${userId}`
  const window = 60 * 1000 // 1 minute in milliseconds
  const now = Date.now()
  
  try {
    // Get current count from Redis
    const current = await kv.get<number>(key) || 0
    
    if (current >= limit) {
      const ttl = await kv.ttl(key)
      return {
        success: false,
        remaining: 0,
        resetTime: now + (ttl * 1000)
      }
    }
    
    // Increment counter
    const pipe = kv.pipeline()
    pipe.incr(key)
    pipe.expire(key, 60) // 1 minute TTL
    await pipe.exec()
    
    return {
      success: true,
      remaining: limit - current - 1,
      resetTime: now + window
    }
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Fallback to database-based rate limiting
    return await databaseRateLimit(userId, limit)
  }
}

async function databaseRateLimit(userId: string, limit: number): Promise<RateLimitResult> {
  const now = new Date()
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
  
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (!user) {
    return { success: false, remaining: 0, resetTime: now.getTime() + 60000 }
  }
  
  // Reset counter if minute has passed
  if (user.minuteResetAt < oneMinuteAgo) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        requestsThisMinute: 1,
        minuteResetAt: now
      }
    })
    
    return {
      success: true,
      remaining: limit - 1,
      resetTime: now.getTime() + 60000
    }
  }
  
  if (user.requestsThisMinute >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: user.minuteResetAt.getTime() + 60000
    }
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      requestsThisMinute: user.requestsThisMinute + 1
    }
  })
  
  return {
    success: true,
    remaining: limit - user.requestsThisMinute - 1,
    resetTime: user.minuteResetAt.getTime() + 60000
  }
}
