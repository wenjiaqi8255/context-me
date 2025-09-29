import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { CacheService } from '@/lib/redis'
import { AIService } from '@/lib/ai'
import { ApiResponse, Insight, UserProfile, ContentAnalysis } from '@/types'
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

    // 确保用户存在
    await ensureUserExists(userId)

    // 检查使用限制（简化版）
    await checkUsageLimit(userId)

    // 生成AI洞察
    const aiResponse = await aiService.generateInsight(userProfile, contentAnalysis)

    // 处理结构化洞察响应
    let insightsToReturn = []

    if (aiResponse.parsedInsights && aiResponse.parsedInsights.insights.length > 0) {
      // 使用解析后的结构化洞察
      insightsToReturn = aiResponse.parsedInsights.insights.map((insight, index) => ({
        id: generateId() + '-' + index,
        userId,
        contentHash,
        sectionId: insight.sectionId,
        sectionType: insight.sectionType,
        insight: insight.insight,
        relevanceScore: insight.relevance,
        category: insight.category,
        actionItems: insight.actionItems,
        createdAt: new Date()
      }))
      console.log(`✅ [Insights] Generated ${insightsToReturn.length} structured insights`)
    } else {
      // 回退到单一洞察格式
      const relevanceScore = calculateRelevanceScore(userProfile, contentAnalysis)
      insightsToReturn = [{
        id: generateId(),
        userId,
        contentHash,
        sectionId: 'general',
        sectionType: 'general',
        insight: aiResponse.content,
        relevanceScore,
        category: categorizeInsight(aiResponse.content),
        actionItems: [],
        createdAt: new Date()
      }]
      console.log('⚠️ [Insights] Using fallback single insight format')
    }

    // 缓存所有洞察
    const cachePromises = insightsToReturn.map(insight =>
      cacheService.set(`insight:${userId}:${contentHash}:${insight.id}`, insight, 3600)
    )
    await Promise.all(cachePromises)

    // 记录使用日志
    const totalTokens = aiResponse.usage?.total_tokens || 0
    await prisma.usageLog.create({
      data: {
        userId,
        actionType: 'generate_insight',
        contentHash,
        tokensUsed: totalTokens,
        costCents: calculateCost(totalTokens),
        metadata: {
          insightsCount: insightsToReturn.length,
          structured: aiResponse.parsedInsights ? true : false
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        insights: insightsToReturn,
        summary: aiResponse.parsedInsights?.summary || 'Content analysis completed',
        structured: aiResponse.parsedInsights ? true : false
      },
      message: `Generated ${insightsToReturn.length} insights successfully`
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

  // 获取当前使用次数，如果没有则设置为0
  let currentUsage = await cacheService.get<number>(usageKey)
  if (currentUsage === null) {
    currentUsage = 0
  }

  const limit = 1000 // 临时提高限制用于开发测试
  console.log(`[Usage Limit] User ${userId} current usage: ${currentUsage}, limit: ${limit}`)

  if (currentUsage >= limit) {
    console.log(`[Usage Limit] User ${userId} exceeded daily limit of ${limit}`)
    throw new Error('Daily usage limit exceeded')
  }

  // 增加使用计数
  const newUsage = await cacheService.incr(usageKey, 86400) // 24小时过期
  console.log(`[Usage Limit] User ${userId} usage incremented to: ${newUsage}`)
}

function calculateRelevanceScore(userProfile: UserProfile, contentAnalysis: ContentAnalysis): number {
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

async function ensureUserExists(userId: string): Promise<void> {
  try {
    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      console.log(`👤 [Insights] Creating new user: ${userId}`)

      // 创建新用户
      await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@temp.contextme.local`, // 临时邮箱
          name: 'Temp User',
          isActive: true,
          subscriptionStatus: 'free',
          subscriptionTier: 'basic'
        }
      })

      console.log(`✅ [Insights] User created successfully: ${userId}`)
    }
  } catch (error) {
    console.error('❌ [Insights] Failed to ensure user exists:', error)
    throw new Error('Failed to create user record')
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}