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

export class AIService {
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY!
    this.baseUrl = process.env.OPENAI_URL!
  }

  async generateInsight(
    userProfile: any,
    contentAnalysis: any,
    systemPrompt?: string
  ): Promise<{ content: string; usage?: any }> {
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

      return {
        content: data.choices[0]?.message?.content || 'Unable to generate insight',
        usage: data.usage
      }
    } catch (error) {
      console.error('AI service error:', error)
      throw new Error('Failed to generate AI insight')
    }
  }

  private buildInsightPrompt(userProfile: any, contentAnalysis: any): string {
    const { background, interests, goals, skills } = userProfile.profileData
    const { title, contentType, extractedData } = contentAnalysis

    return `
请基于以下用户信息和内容分析，生成个性化的洞察和建议：

【用户档案】
背景：${background || '未提供'}
兴趣：${interests?.join(', ') || '未提供'}
目标：${goals?.join(', ') || '未提供'}
技能：${skills?.join(', ') || '未提供'}

【内容分析】
标题：${title || '未提供'}
类型：${contentType}
摘要：${extractedData?.summary || '未提供'}
关键点：${extractedData?.keyPoints?.join(', ') || '未提供'}
难度：${extractedData?.difficulty || '未提供'}

请生成个性化的洞察，包括：
1. 这份内容对用户的相关性分析
2. 基于用户目标的具体建议
3. 可能的后续行动推荐
4. 潜在的注意事项或提醒

请用${userProfile.profileData.preferences?.language === 'zh' ? '中文' : '英文'}回答，风格为${userProfile.profileData.preferences?.insightStyle || 'detailed'}。
    `.trim()
  }

  private getDefaultSystemPrompt(): string {
    return `
你是一个专业的个性化内容分析师，擅长根据用户背景和目标提供深度洞察。
你的任务是为用户提供个性化、实用的内容分析和建议。
请保持客观、专业，同时关注用户的实际需求和成长目标。
    `.trim()
  }
}