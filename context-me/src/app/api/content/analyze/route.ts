import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { CacheService } from '@/lib/redis'
import { ApiResponse, ContentAnalysis } from '@/types'
import { createHash } from 'crypto'

const cacheService = new CacheService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, title, content } = body

    if (!url || !content) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'URL and content are required'
      }, { status: 400 })
    }

    // 生成内容指纹
    const contentHash = createHash('sha256').update(content).digest('hex')

    // 检查缓存
    const cached = await cacheService.get<ContentAnalysis>(`content:${contentHash}`)
    if (cached) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: cached,
        message: 'Content analysis retrieved from cache'
      })
    }

    // 检查数据库
    const existing = await prisma.contentFingerprint.findUnique({
      where: { contentHash }
    })

    if (existing) {
      // 缓存结果
      await cacheService.set(`content:${contentHash}`, existing, 86400) // 24小时
      return NextResponse.json<ApiResponse>({
        success: true,
        data: existing,
        message: 'Content analysis retrieved from database'
      })
    }

    // 分析内容类型和提取关键信息
    const analysis = analyzeContent(url, title, content)

    // 保存到数据库
    const savedAnalysis = await prisma.contentFingerprint.create({
      data: {
        contentHash,
        url,
        title,
        contentType: analysis.contentType,
        extractedData: analysis.extractedData
      }
    })

    // 缓存结果
    await cacheService.set(`content:${contentHash}`, savedAnalysis, 86400)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: savedAnalysis,
      message: 'Content analysis completed successfully'
    })
  } catch (error) {
    console.error('Content analysis error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to analyze content'
    }, { status: 500 })
  }
}

function analyzeContent(url: string, title: string, content: string): Omit<ContentAnalysis, 'id' | 'createdAt'> {
  // 简化的内容分析逻辑
  let contentType: ContentAnalysis['contentType'] = 'other'

  // 基于URL和标题判断内容类型
  if (url.includes('course') || title.includes('课程') || title.includes('Course')) {
    contentType = 'course'
  } else if (url.includes('job') || url.includes('career') || title.includes('职位') || title.includes('Job')) {
    contentType = 'job'
  } else if (url.includes('product') || title.includes('产品') || title.includes('Product')) {
    contentType = 'product'
  } else if (url.includes('article') || url.includes('blog') || title.includes('文章') || title.includes('Article')) {
    contentType = 'article'
  }

  // 提取关键信息（简化版）
  const summary = generateSummary(content)
  const keyPoints = extractKeyPoints(content)
  const tags = extractTags(content, title)
  const difficulty = estimateDifficulty(content, contentType)

  return {
    contentHash: '',
    url,
    title,
    contentType,
    extractedData: {
      summary,
      keyPoints,
      tags,
      difficulty
    }
  }
}

function generateSummary(content: string): string {
  // 简化的摘要生成
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
  if (sentences.length === 0) return content.substring(0, 200) + '...'

  // 取前3个句子作为摘要
  return sentences.slice(0, 3).join('. ') + '.'
}

function extractKeyPoints(content: string): string[] {
  // 简化的关键点提取
  const lines = content.split('\n').filter(line => line.trim().length > 0)
  return lines.slice(0, 5).map(line => line.trim())
}

function extractTags(content: string, title: string): string[] {
  const text = (title + ' ' + content).toLowerCase()
  const keywords = ['AI', '机器学习', '编程', '设计', '管理', '数据', '技术', '产品']

  return keywords.filter(keyword => text.includes(keyword))
}

function estimateDifficulty(content: string, contentType: string): 'beginner' | 'intermediate' | 'advanced' {
  const text = content.toLowerCase()
  const advancedTerms = ['advanced', 'expert', '深度学习', '神经网络', '架构', '优化']
  const beginnerTerms = ['beginner', 'intro', '入门', '基础', '教程']

  const hasAdvanced = advancedTerms.some(term => text.includes(term))
  const hasBeginner = beginnerTerms.some(term => text.includes(term))

  if (hasAdvanced) return 'advanced'
  if (hasBeginner) return 'beginner'
  return 'intermediate'
}