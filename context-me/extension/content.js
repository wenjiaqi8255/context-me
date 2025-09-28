// ContextMe Content Script
class ContextMeContent {
  constructor() {
    this.apiBase = 'http://localhost:3000/api'
    this.insightsContainer = null
    this.currentInsights = []
    this.isProcessing = false
    this.userId = null

    this.initialize()
  }

  async initialize() {
    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start())
    } else {
      this.start()
    }
  }

  async start() {
    console.log('ContextMe content script initialized')

    // 获取用户ID
    await this.getUserId()

    // 检查是否应该分析当前页面
    if (this.shouldAnalyzePage()) {
      await this.analyzeCurrentPage()
    }

    // 监听页面变化（SPA支持）
    this.setupPageChangeObserver()

    // 创建洞察UI容器
    this.createInsightsContainer()
  }

  async getUserId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userId'], (result) => {
        if (result.userId) {
          this.userId = result.userId
          resolve(result.userId)
        } else {
          // 生成新的用户ID
          const newUserId = 'user_' + Math.random().toString(36).substr(2, 9)
          chrome.storage.local.set({ userId: newUserId }, () => {
            this.userId = newUserId
            resolve(newUserId)
          })
        }
      })
    })
  }

  shouldAnalyzePage() {
    // 排除不需要分析的页面
    const excludedUrls = [
      'chrome://',
      'chrome-extension://',
      'about:',
      'data:',
      'file:',
      'moz-extension://'
    ]

    const currentUrl = window.location.href
    return !excludedUrls.some(prefix => currentUrl.startsWith(prefix))
  }

  async analyzeCurrentPage() {
    if (this.isProcessing) return

    this.isProcessing = true

    try {
      // 提取页面内容
      const pageContent = this.extractPageContent()

      // 分析内容
      const contentAnalysis = await this.analyzeContent(pageContent)

      // 生成洞察
      await this.generateInsights(contentAnalysis)

    } catch (error) {
      console.error('Page analysis error:', error)
    } finally {
      this.isProcessing = false
    }
  }

  extractPageContent() {
    const title = document.title
    const url = window.location.href

    // 提取主要内容
    let content = ''

    // 尝试获取文章内容
    const article = document.querySelector('article')
    if (article) {
      content = article.textContent || article.innerText
    } else {
      // 获取body内容，排除脚本和样式
      const body = document.body.cloneNode(true)
      const scripts = body.querySelectorAll('script, style, noscript')
      scripts.forEach(el => el.remove())
      content = body.textContent || body.innerText
    }

    // 清理内容
    content = content.replace(/\s+/g, ' ').trim()

    return {
      url,
      title,
      content: content.substring(0, 5000) // 限制长度
    }
  }

  async analyzeContent(pageContent) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'ANALYZE_CONTENT',
        data: pageContent
      }, (response) => {
        if (response && response.success) {
          resolve(response.data)
        } else {
          reject(new Error(response?.error || 'Failed to analyze content'))
        }
      })
    })
  }

  async generateInsights(contentAnalysis) {
    try {
      // 获取用户档案
      const userProfile = await this.getUserProfile()

      if (!userProfile) {
        console.log('No user profile found, skipping insight generation')
        return
      }

      // 生成洞察
      const insight = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'GENERATE_INSIGHT',
          data: {
            userId: this.userId,
            contentHash: contentAnalysis.contentHash,
            userProfile,
            contentAnalysis
          }
        }, (response) => {
          if (response && response.success) {
            resolve(response.data)
          } else {
            reject(new Error(response?.error || 'Failed to generate insight'))
          }
        })
      })

      // 显示洞察
      this.displayInsight(insight, contentAnalysis)

    } catch (error) {
      console.error('Insight generation error:', error)
    }
  }

  async getUserProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userProfile'], (result) => {
        resolve(result.userProfile || null)
      })
    })
  }

  displayInsight(insight, contentAnalysis) {
    if (!this.insightsContainer) {
      this.createInsightsContainer()
    }

    const insightElement = this.createInsightElement(insight, contentAnalysis)
    this.insightsContainer.appendChild(insightElement)

    // 更新统计
    this.updateUsageStats()
  }

  createInsightsContainer() {
    if (this.insightsContainer) return

    this.insightsContainer = document.createElement('div')
    this.insightsContainer.id = 'contextme-insights-container'
    this.insightsContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `

    document.body.appendChild(this.insightsContainer)
  }

  createInsightElement(insight, contentAnalysis) {
    const element = document.createElement('div')
    element.className = 'contextme-insight'
    element.style.cssText = `
      background: white;
      border: 1px solid #e1e8ed;
      border-radius: 12px;
      margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    `

    const relevanceColor = this.getRelevanceColor(insight.relevanceScore)
    const categoryIcon = this.getCategoryIcon(insight.category)

    element.innerHTML = `
      <div style="padding: 16px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="margin-right: 8px;">${categoryIcon}</span>
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">
            ContextMe 洞察
          </h3>
          <div style="margin-left: auto; width: 8px; height: 8px; border-radius: 50%; background: ${relevanceColor};"></div>
        </div>

        <div style="font-size: 13px; line-height: 1.5; color: #4b5563; margin-bottom: 12px;">
          ${this.formatInsightText(insight.insight)}
        </div>

        <div style="font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between;">
          <span>相关性: ${Math.round(insight.relevanceScore * 100)}%</span>
          <span>${this.getTimeAgo(new Date(insight.createdAt))}</span>
        </div>
      </div>
    `

    // 添加交互
    element.addEventListener('click', () => {
      this.toggleInsightExpansion(element, insight)
    })

    return element
  }

  formatInsightText(text) {
    // 简单的文本格式化
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
  }

  getRelevanceColor(score) {
    if (score >= 0.8) return '#10b981' // 绿色
    if (score >= 0.6) return '#f59e0b' // 黄色
    return '#ef4444' // 红色
  }

  getCategoryIcon(category) {
    const icons = {
      opportunity: '💡',
      recommendation: '🎯',
      warning: '⚠️',
      information: 'ℹ️'
    }
    return icons[category] || '📄'
  }

  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000)

    if (seconds < 60) return '刚刚'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`
    return `${Math.floor(seconds / 86400)}天前`
  }

  toggleInsightExpansion(element, insight) {
    // 切换洞察展开/收起状态
    const isExpanded = element.dataset.expanded === 'true'

    if (isExpanded) {
      element.dataset.expanded = 'false'
      // 收起逻辑
    } else {
      element.dataset.expanded = 'true'
      // 展开逻辑
    }
  }

  setupPageChangeObserver() {
    // 监听URL变化（SPA支持）
    let lastUrl = location.href
    new MutationObserver(() => {
      const url = location.href
      if (url !== lastUrl) {
        lastUrl = url
        setTimeout(() => this.analyzeCurrentPage(), 1000)
      }
    }).observe(document, { subtree: true, childList: true })
  }

  updateUsageStats() {
    chrome.storage.local.get(['usageStats'], (result) => {
      const stats = result.usageStats || { today: 0, total: 0 }
      const today = new Date().toDateString()

      if (stats.date !== today) {
        stats.date = today
        stats.today = 1
      } else {
        stats.today++
      }
      stats.total++

      chrome.storage.local.set({ usageStats: stats })
    })
  }
}

// 启动content script
const contextMe = new ContextMeContent()