import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { CacheService } from '@/lib/redis'
import { AIService } from '@/lib/ai'
import { ApiResponse, Insight } from '@/types'
import { createHash } from 'crypto'

const cacheService = new CacheService()
const aiService = new AIService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, contentHash, userProfile, contentAnalysis } = body

    if (!userId || !contentHash || !userProfile || !contentAnalysis) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // 生成洞察缓存键
    const insightCacheKey = `insight:${userId}:${contentHash}`

    // 检查缓存
    const cachedInsight = await cacheService.get<Insight>(insightCacheKey)
    if (cachedInsight) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: cachedInsight,
        message: 'Insight retrieved from cache'
      })
    }

    // 检查使用限制（简化版）
    await checkUsageLimit(userId)

    // 生成AI洞察
    const aiResponse = await aiService.generateInsight(userProfile, contentAnalysis)

    // 计算相关性分数（简化算法）
    const relevanceScore = calculateRelevanceScore(userProfile, contentAnalysis)

    // 创建洞察对象
    const insight: Omit<Insight, 'id' | 'createdAt'> = {
      userId,
      contentHash,
      insight: aiResponse.content,
      relevanceScore,
      category: categorizeInsight(aiResponse.content)
    }

    // 这里应该保存到数据库，但为了简化，我们直接返回并缓存
    const finalInsight: Insight = {
      ...insight,
      id: generateId(),
      createdAt: new Date()
    }

    // 缓存洞察结果
    await cacheService.set(insightCacheKey, finalInsight, 3600) // 1小时

    // 记录使用日志
    await prisma.usageLog.create({
      data: {
        userId,
        actionType: 'generate_insight',
        contentHash,
        tokensUsed: aiResponse.usage?.total_tokens,
        costCents: calculateCost(aiResponse.usage?.total_tokens || 0),
        metadata: {
          relevanceScore,
          category: finalInsight.category
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: finalInsight,
      message: 'Insight generated successfully'
    })
  } catch (error) {
    console.error('Generate insight error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate insight'
    }, { status: 500 })
  }
}

async function checkUsageLimit(userId: string): Promise<void> {
  // 简化的使用限制检查
  const today = new Date().toDateString()
  const usageKey = `usage:${userId}:${today}`

  const currentUsage = await cacheService.get<number>(usageKey) || 0
  const limit = 100 // 简化：每日100次限制

  if (currentUsage >= limit) {
    throw new Error('Daily usage limit exceeded')
  }

  await cacheService.incr(usageKey, 86400) // 24小时过期
}

function calculateRelevanceScore(userProfile: any, contentAnalysis: any): number {
  // 简化的相关性计算
  const userInterests = userProfile.profileData.interests || []
  const userGoals = userProfile.profileData.goals || []
  const contentTags = contentAnalysis.extractedData.tags || []

  let score = 0.5 // 基础分数

  // 兴趣匹配
  const interestMatches = userInterests.filter((interest: string) =>
    contentTags.some((tag: string) => tag.toLowerCase().includes(interest.toLowerCase()))
  )
  score += interestMatches.length * 0.1

  // 目标匹配
  const goalMatches = userGoals.filter((goal: string) =>
    contentAnalysis.extractedData.summary?.toLowerCase().includes(goal.toLowerCase())
  )
  score += goalMatches.length * 0.15

  return Math.min(score, 1.0)
}

function categorizeInsight(content: string): Insight['category'] {
  const text = content.toLowerCase()

  if (text.includes('建议') || text.includes('推荐') || text.includes('should')) {
    return 'recommendation'
  }
  if (text.includes('机会') || text.includes('opportunity') || text.includes('可能')) {
    return 'opportunity'
  }
  if (text.includes('注意') || text.includes('warning') || text.includes('风险')) {
    return 'warning'
  }

  return 'information'
}

function calculateCost(tokens: number): number {
  // 简化的成本计算
  return Math.ceil(tokens * 0.0002) // $0.002 per 1K tokens
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}