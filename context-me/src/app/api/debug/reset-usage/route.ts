import { NextRequest, NextResponse } from 'next/server'
import { CacheService } from '@/lib/redis'
import { ApiResponse } from '@/types'

// 注意：这是一个临时的开发端点，生产环境中应该移除
const cacheService = new CacheService()

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    await cacheService.resetUsageLimit(userId)

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Usage limit reset for user ${userId}`
    })
  } catch (error) {
    console.error('Reset usage error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset usage limit'
    }, { status: 500 })
  }
}