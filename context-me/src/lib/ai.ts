import { UserProfile, ContentAnalysis } from '@/types'

interface AIRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  max_tokens?: number
}

interface AIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface ParsedInsights {
  insights: Array<{
    sectionId: string
    sectionType: string
    insight: string
    relevance: number
    category: 'recommendation' | 'opportunity' | 'warning' | 'information'
    actionItems: string[]
  }>
  summary: string
}

export class AIService {
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY!
    this.baseUrl = process.env.OPENAI_URL!
  }

  async generateInsight(
    userProfile: UserProfile,
    contentAnalysis: ContentAnalysis,
    systemPrompt?: string
  ): Promise<{ content: string; usage?: any; parsedInsights?: ParsedInsights }> {
    const prompt = this.buildInsightPrompt(userProfile, contentAnalysis)

    const request: AIRequest = {
      model: 'THUDM/GLM-4-32B-0414',
      messages: [
        {
          role: 'system',
          content: systemPrompt || this.getDefaultSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status} ${response.statusText}`)
      }

      const data: AIResponse = await response.json()
      const content = data.choices[0]?.message?.content || 'Unable to generate insight'

      return {
        content: content,
        usage: data.usage,
        parsedInsights: this.parseInsightResponse(content)
      }
    } catch (error) {
      console.error('AI service error:', error)
      throw new Error('Failed to generate AI insight')
    }
  }

  private buildInsightPrompt(userProfile: UserProfile, contentAnalysis: ContentAnalysis): string {
    const { background, interests, goals, skills } = userProfile.profileData
    const { title, sections, contentType } = contentAnalysis

    // Ensure sections is an array, even if it's undefined or null
    const sectionsArray = Array.isArray(sections) ? sections : []

    return `
请基于以下用户信息和内容分析，为每个内容段落生成个性化的洞察和建议：

【用户档案】
背景：${background || '未提供'}
兴趣：${interests?.join(', ') || '未提供'}
目标：${goals?.join(', ') || '未提供'}
技能：${skills?.join(', ') || '未提供'}

【内容分析】
标题：${title || '未提供'}
类型：${contentType}

【内容段落】
${sectionsArray.length > 0 ? sectionsArray.map((section, index) => `
段落 ${index + 1} (${section.type || 'text'}):
${section.content || ''}
`).join('\n') : '无可用内容段落'}

请为每个段落生成个性化的洞察，并以JSON格式返回。返回格式如下：
{
  "insights": [
    {
      "sectionId": "section-0",
      "sectionType": "p",
      "insight": "针对该段落的具体洞察和建议",
      "relevance": 0.8,
      "category": "recommendation",
      "actionItems": ["具体行动建议1", "具体行动建议2"]
    }
  ],
  "summary": "整体内容的相关性分析和总体建议"
}

要求：
1. 只对与用户兴趣、目标或技能相关的段落生成洞察
2. 每个洞察要具体、实用，针对段落内容
3. 相关性评分0-1，1表示高度相关
4. 分类：recommendation（建议）、opportunity（机会）、warning（提醒）、information（信息）
5. 请用${userProfile.profileData.preferences?.language === 'zh' ? '中文' : '英文'}回答

请只返回JSON格式的响应，不要包含其他文字。
    `.trim()
  }

  private parseInsightResponse(content: string): ParsedInsights {
    try {
      // 尝试提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        console.log('✅ [AI Service] Successfully parsed structured insights')
        return parsed
      }

      // 如果没有找到JSON，返回fallback格式
      console.log('⚠️ [AI Service] No JSON found in response, using fallback format')
      return {
        insights: [{
          sectionId: 'fallback',
          sectionType: 'general',
          insight: content,
          relevance: 0.5,
          category: 'information',
          actionItems: []
        }],
        summary: content
      }
    } catch (error) {
      console.error('❌ [AI Service] Failed to parse insight response:', error)
      return {
        insights: [{
          sectionId: 'error',
          sectionType: 'general',
          insight: content,
          relevance: 0.3,
          category: 'information',
          actionItems: []
        }],
        summary: '解析洞察时遇到错误，显示原始内容'
      }
    }
  }

  private getDefaultSystemPrompt(): string {
    return `
你是一个专业的个性化内容分析师，擅长根据用户背景和目标提供深度洞察。
你的任务是为用户提供个性化、实用的内容分析和建议。
请保持客观、专业，同时关注用户的实际需求和成长目标。
    `.trim()
  }
}