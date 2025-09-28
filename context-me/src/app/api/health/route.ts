import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import redis from '@/lib/redis'

export async function GET() {
  try {
    // 测试数据库连接
    await prisma.$queryRaw`SELECT 1`

    // 测试Redis连接
    await redis.ping()

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      redis: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}