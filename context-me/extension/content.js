// ContextMe Content Script
class ContextMeContent {
  constructor() {
    this.apiBase = 'http://localhost:3000/api'
    this.insightsContainer = null
    this.currentInsights = []
    this.isProcessing = false
    this.userId = null
    this.aiEnabled = false
    this.mockAIEnabled = false
    this.mockAIElements = []

    console.log('🚀 [ContextMe Content] Initializing content script...')
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
    console.log('✅ [ContextMe Content] Content script started')

    // 获取用户ID
    await this.getUserId()

    // 检查AI功能状态
    await this.checkAIStatus()

    // 检查Mock AI状态
    await this.checkMockAIStatus()

    // 创建洞察UI容器
    this.createInsightsContainer()

    // 监听消息
    this.setupMessageListener()

    // 检查是否应该分析当前页面
    if (this.shouldAnalyzePage()) {
      console.log('🔍 [ContextMe Content] Page should be analyzed, checking AI status...')
      if (this.aiEnabled) {
        console.log('🤖 [ContextMe Content] AI is enabled, waiting for page to fully load...')
        // 等待页面完全加载，避免标题为 "Loading" 的问题
        await this.waitForPageLoad()
        console.log('🤖 [ContextMe Content] Page loaded, starting analysis...')
        await this.analyzeCurrentPage()
      } else {
        console.log('⏸️ [ContextMe Content] AI is disabled, skipping analysis')
      }
    } else {
      console.log('🚫 [ContextMe Content] Page should not be analyzed')
    }

    // 监听页面变化（SPA支持）
    this.setupPageChangeObserver()
  }

  async getUserId() {
    console.log('🆔 [ContextMe Content] Getting user ID...')
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken', 'userId'], (result) => {
        if (result.authToken) {
          // 如果有认证token，使用authenticated user
          this.userId = 'authenticated_user'
          console.log('✅ [ContextMe Content] Authenticated user detected')
          resolve(this.userId)
        } else if (result.userId) {
          // 回退到临时用户ID
          this.userId = result.userId
          console.log('✅ [ContextMe Content] Temp user ID found:', this.userId)
          resolve(result.userId)
        } else {
          // 生成新的临时用户ID
          const newUserId = 'user_' + Math.random().toString(36).substr(2, 9)
          console.log('🆕 [ContextMe Content] Generating new temp user ID:', newUserId)
          chrome.storage.local.set({ userId: newUserId }, () => {
            this.userId = newUserId
            console.log('✅ [ContextMe Content] New temp user ID saved:', this.userId)
            resolve(newUserId)
          })
        }
      })
    })
  }

  async checkAIStatus() {
    console.log('🤖 [ContextMe Content] Checking AI status...')
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'GET_AI_STATUS'
        }, (response) => {
          console.log('📥 [ContextMe Content] AI status response:', response)
          resolve(response)
        })
      })

      if (response && response.success) {
        this.aiEnabled = response.data.enabled
        console.log('✅ [ContextMe Content] AI status updated:', this.aiEnabled)
      } else {
        console.warn('⚠️ [ContextMe Content] Failed to get AI status, using default:', this.aiEnabled)
      }
    } catch (error) {
      console.error('❌ [ContextMe Content] Error checking AI status:', error)
    }
  }

  async checkMockAIStatus() {
    console.log('🎭 [ContextMe Content] Checking Mock AI status...')
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'GET_MOCK_AI_STATUS'
        }, (response) => {
          console.log('📥 [ContextMe Content] Mock AI status response:', response)
          resolve(response)
        })
      })

      if (response && response.success) {
        this.mockAIEnabled = response.data.enabled
        console.log('✅ [ContextMe Content] Mock AI status updated:', this.mockAIEnabled)
        if (this.mockAIEnabled) {
          this.injectMockAIUI()
        }
      } else {
        console.warn('⚠️ [ContextMe Content] Failed to get Mock AI status, using default:', this.mockAIEnabled)
      }
    } catch (error) {
      console.error('❌ [ContextMe Content] Error checking Mock AI status:', error)
    }
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
    if (this.isProcessing) {
      console.log('⏳ [ContextMe Content] Already processing, skipping...')
      return
    }

    if (!this.aiEnabled) {
      console.log('⏸️ [ContextMe Content] AI disabled, skipping analysis')
      return
    }

    console.log('🔍 [ContextMe Content] Starting page analysis...')
    this.isProcessing = true

    try {
      // 提取页面内容
      console.log('📄 [ContextMe Content] Extracting page content...')
      const pageContent = this.extractPageContent()
      console.log('📝 [ContextMe Content] Page content extracted:', {
        title: pageContent.title,
        url: pageContent.url,
        sectionsCount: pageContent.sections.length,
        contentLength: pageContent.fullContent.length
      })

      // 验证内容是否有效
      if (!pageContent.fullContent || pageContent.fullContent.length === 0) {
        console.error('❌ [ContextMe Content] No content extracted from page')
        this.showErrorIndicator('无法提取页面内容，请确保页面包含足够的文本内容')
        return
      }

      // 分析内容
      console.log('🧠 [ContextMe Content] Analyzing content...')
      const contentAnalysis = await this.analyzeContent(pageContent)
      console.log('✅ [ContextMe Content] Content analysis completed:', contentAnalysis)

      // 生成洞察
      console.log('💡 [ContextMe Content] Generating insights...')
      await this.generateInsights(contentAnalysis)
      console.log('✅ [ContextMe Content] Insights generation completed')

    } catch (error) {
      console.error('❌ [ContextMe Content] Page analysis error:', error)
      console.error('❌ [ContextMe Content] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })

      // 显示错误提示
      this.showErrorIndicator(error.message)
    } finally {
      this.isProcessing = false
      console.log('🏁 [ContextMe Content] Page analysis finished')
    }
  }

  extractPageContent() {
    const title = document.title
    const url = window.location.href

    // 提取分段的页面内容
    const sections = this.extractContentSections()
    const fullContent = sections.map(s => s.content).join('\n\n').substring(0, 8000)

    console.log('📄 [ContextMe Content] Page content extraction result:', {
      title,
      url,
      sectionsCount: sections.length,
      fullContentLength: fullContent.length,
      hasContent: fullContent.length > 0
    })

    return {
      url,
      title,
      sections,
      fullContent
    }
  }

  extractContentSections() {
    const sections = []

    // 1. 尝试提取文章段落
    const article = document.querySelector('article')
    if (article) {
      const paragraphs = article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')
      paragraphs.forEach((el, index) => {
        const content = (el.textContent || el.innerText).trim()
        if (content.length > 50) { // 只保留有实质内容的段落
          sections.push({
            id: `section-${index}`,
            type: el.tagName.toLowerCase(),
            content: content,
            element: el,
            position: this.getElementPosition(el)
          })
        }
      })
    }

    // 2. 如果没有文章，提取body中的主要内容区块
    if (sections.length === 0) {
      const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div[class*="content"], div[class*="section"]')
      contentElements.forEach((el, index) => {
        const content = (el.textContent || el.innerText).trim()
        if (content.length > 50 && content.length < 1000) { // 限制段落长度
          sections.push({
            id: `section-${index}`,
            type: el.tagName.toLowerCase(),
            content: content,
            element: el,
            position: this.getElementPosition(el)
          })
        }
      })
    }

    // 3. 去重和清理
    const uniqueSections = sections.filter((section, index, arr) => {
      return arr.findIndex(s => s.content === section.content) === index
    })

    console.log(`📑 [ContextMe Content] Extracted ${uniqueSections.length} content sections`)
    return uniqueSections.slice(0, 10) // 限制最多10个段落
  }

  getElementPosition(element) {
    const rect = element.getBoundingClientRect()
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    }
  }

  async analyzeContent(pageContent) {
    console.log('🧠 [ContextMe Content] Starting content analysis...')
    console.log('📤 [ContextMe Content] Sending ANALYZE_CONTENT message...')

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'ANALYZE_CONTENT',
        data: pageContent
      }, (response) => {
        console.log('📥 [ContextMe Content] Content analysis response:', response)
        if (response && response.success) {
          console.log('✅ [ContextMe Content] Content analysis completed successfully')
          console.log('📊 [ContextMe Content] Analysis result:', {
            contentType: response.data.contentType,
            hasContent: !!response.data.extractedData,
            contentHash: response.data.contentHash
          })
          resolve(response.data)
        } else {
          console.error('❌ [ContextMe Content] Content analysis failed:', response?.error)
          reject(new Error(response?.error || 'Failed to analyze content'))
        }
      })
    })
  }

  async generateInsights(contentAnalysis) {
    console.log('💡 [ContextMe Content] Starting insight generation...')

    try {
      // 获取用户档案
      console.log('👤 [ContextMe Content] Getting user profile for insight generation...')
      const userProfile = await this.getUserProfile()

      if (!userProfile) {
        console.log('⚠️ [ContextMe Content] No user profile found, skipping insight generation')
        this.showErrorIndicator('请先在插件设置中配置您的个人信息')
        return
      }

      if (!userProfile.profileData) {
        console.log('⚠️ [ContextMe Content] User profile has no profile data, skipping insight generation')
        console.log('📋 [ContextMe Content] Actual userProfile structure:', JSON.stringify(userProfile, null, 2))
        this.showErrorIndicator('用户档案数据不完整，请检查设置')
        return
      }

      if (!userProfile.profileData.interests || !userProfile.profileData.goals) {
        console.log('⚠️ [ContextMe Content] User profile missing interests or goals, skipping insight generation')
        console.log('📋 [ContextMe Content] Profile details:', {
          interests: userProfile.profileData.interests,
          goals: userProfile.profileData.goals,
          fullProfile: JSON.stringify(userProfile.profileData, null, 2)
        })
        this.showErrorIndicator('请至少填写兴趣和目标信息')
        return
      }

      console.log('✅ [ContextMe Content] User profile validated, generating insight...')

      // 生成洞察
      const insight = await new Promise((resolve, reject) => {
        console.log('📤 [ContextMe Content] Sending GENERATE_INSIGHT message...')
        chrome.runtime.sendMessage({
          type: 'GENERATE_INSIGHT',
          data: {
            userId: this.userId,
            contentHash: contentAnalysis.contentHash,
            userProfile,
            contentAnalysis
          }
        }, (response) => {
          console.log('📥 [ContextMe Content] Insight generation response:', response)
          if (response && response.success) {
            console.log('✅ [ContextMe Content] Insight generated successfully:', response.data)
            resolve(response.data)
          } else {
            console.error('❌ [ContextMe Content] Insight generation failed:', response?.error)
            reject(new Error(response?.error || 'Failed to generate insight'))
          }
        })
      })

      // 处理新的结构化洞察响应
      if (insight && insight.insights && Array.isArray(insight.insights)) {
        console.log(`🎯 [ContextMe Content] Displaying ${insight.insights.length} structured insights`)
        this.displayStructuredInsights(insight.insights, contentAnalysis)
      } else if (insight) {
        // 回退到单一洞察显示
        console.log('⚠️ [ContextMe Content] Using fallback single insight display')
        this.displayInsight(insight, contentAnalysis)
      } else {
        console.error('❌ [ContextMe Content] No insight data received')
        this.showErrorIndicator('未收到洞察数据，请稍后重试')
      }
      console.log('✅ [ContextMe Content] Insight generation process completed')

    } catch (error) {
      console.error('❌ [ContextMe Content] Insight generation error:', error)
      console.error('❌ [ContextMe Content] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })

      // 显示用户友好的错误信息
      let userErrorMessage = '洞察生成失败'
      if (error.message.includes('API')) {
        userErrorMessage = 'AI服务暂时不可用，请稍后重试'
      } else if (error.message.includes('network')) {
        userErrorMessage = '网络连接失败，请检查网络设置'
      } else if (error.message.includes('profile')) {
        userErrorMessage = '用户配置不完整，请检查设置'
      }

      this.showErrorIndicator(userErrorMessage)
    }
  }

  async getUserProfile() {
    console.log('👤 [ContextMe Content] Getting user profile...')
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken', 'userProfile'], (result) => {
        console.log('📥 [ContextMe Content] User profile from storage:', result.userProfile ? 'exists' : 'not found')
        if (result.authToken) {
          console.log('🔐 [ContextMe Content] User is authenticated, using stored profile')
          if (result.userProfile) {
            console.log('📋 [ContextMe Content] User profile data:', {
              hasProfileData: !!result.userProfile.profileData,
              hasInterests: result.userProfile.profileData?.interests?.length > 0,
              hasGoals: result.userProfile.profileData?.goals?.length > 0
            })
          }
          resolve(result.userProfile || null)
        } else {
          console.log('📝 [ContextMe Content] User not authenticated, using local profile')
          if (result.userProfile) {
            console.log('📋 [ContextMe Content] Local profile data:', {
              hasProfileData: !!result.userProfile.profileData,
              hasInterests: result.userProfile.profileData?.interests?.length > 0,
              hasGoals: result.userProfile.profileData?.goals?.length > 0
            })
          }
          resolve(result.userProfile || null)
        }
      })
    })
  }

  displayInsight(insight, contentAnalysis) {
    console.log('🎨 [ContextMe Content] Displaying insight:', insight)

    if (!this.insightsContainer) {
      console.log('📦 [ContextMe Content] Creating insights container...')
      this.createInsightsContainer()
    }

    const insightElement = this.createInsightElement(insight, contentAnalysis)
    console.log('✅ [ContextMe Content] Insight element created')

    this.insightsContainer.appendChild(insightElement)
    console.log('✅ [ContextMe Content] Insight element added to container')

    // 更新统计
    this.updateUsageStats()
    console.log('📊 [ContextMe Content] Usage stats updated')
  }

  displayStructuredInsights(insights, contentAnalysis) {
    console.log('🎯 [ContextMe Content] Displaying structured insights:', insights.length)

    // 清除旧的洞察容器
    if (this.insightsContainer) {
      this.insightsContainer.remove()
      this.insightsContainer = null
    }

    insights.forEach((insight, index) => {
      if (insight.sectionId && contentAnalysis.sections) {
        // 找到对应的页面元素
        const targetSection = contentAnalysis.sections.find(s => s.id === insight.sectionId)
        if (targetSection && targetSection.element) {
          this.createInlineInsight(insight, targetSection.element)
        } else {
          // 如果找不到对应元素，回退到右上角容器
          this.createFloatingInsight(insight, index)
        }
      } else {
        // 如果没有sectionId，使用浮动容器
        this.createFloatingInsight(insight, index)
      }
    })

    console.log('✅ [ContextMe Content] All structured insights displayed')
  }

  createInlineInsight(insight, targetElement) {
    console.log(`📍 [ContextMe Content] Creating inline insight for ${insight.sectionId}`)

    const insightContainer = document.createElement('div')
    insightContainer.className = 'contextme-inline-insight'
    insightContainer.style.cssText = `
      margin: 8px 0;
      padding: 12px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-left: 4px solid #0ea5e9;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease-out;
    `

    const relevanceColor = this.getRelevanceColor(insight.relevanceScore)
    const categoryIcon = this.getCategoryIcon(insight.category)

    insightContainer.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <span style="font-size: 16px; margin-top: 2px;">${categoryIcon}</span>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="font-weight: 600; color: #1f2937; font-size: 12px;">ContextMe 洞察</span>
            <span style="background: ${relevanceColor}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 500;">
              ${Math.round(insight.relevanceScore * 100)}% 相关
            </span>
          </div>
          <div style="color: #374151; margin-bottom: 8px;">
            ${insight.insight}
          </div>
          ${insight.actionItems && insight.actionItems.length > 0 ? `
            <div style="margin-top: 8px;">
              <div style="font-weight: 500; color: #1f2937; font-size: 12px; margin-bottom: 4px;">建议行动：</div>
              <ul style="margin: 0; padding-left: 16px; color: #4b5563; font-size: 12px;">
                ${insight.actionItems.map(item => `<li style="margin-bottom: 2px;">${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `

    // 添加CSS动画
    const style = document.createElement('style')
    style.textContent = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `
    document.head.appendChild(style)

    // 插入洞察到目标元素后面
    targetElement.parentNode.insertBefore(insightContainer, targetElement.nextSibling)

    console.log(`✅ [ContextMe Content] Inline insight created for ${insight.sectionId}`)
  }

  createFloatingInsight(insight, index) {
    if (!this.insightsContainer) {
      this.createInsightsContainer()
    }

    const insightElement = this.createInsightElement(insight, null)
    this.insightsContainer.appendChild(insightElement)
  }

  showErrorIndicator(errorMessage) {
    console.log('❌ [ContextMe Content] Showing error indicator:', errorMessage)

    if (!this.insightsContainer) {
      console.log('📦 [ContextMe Content] Creating insights container for error...')
      this.createInsightsContainer()
    }

    const errorElement = document.createElement('div')
    errorElement.className = 'contextme-error'
    errorElement.style.cssText = `
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      font-size: 12px;
      color: #dc2626;
      display: flex;
      align-items: center;
      gap: 8px;
    `

    errorElement.innerHTML = `
      <span>⚠️</span>
      <div>
        <div style="font-weight: 600; margin-bottom: 2px;">ContextMe 分析失败</div>
        <div style="opacity: 0.8;">${errorMessage}</div>
      </div>
    `

    this.insightsContainer.appendChild(errorElement)
    console.log('❌ [ContextMe Content] Error indicator added to container')
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

  setupMessageListener() {
    // 监听来自popup的Mock AI状态变化
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📥 [ContextMe Content] Received message:', message)

      if (message.type === 'MOCK_AI_TOGGLED') {
        console.log('🎭 [ContextMe Content] Mock AI toggle received:', message.enabled)
        this.handleMockAIToggle(message.enabled)
        sendResponse({ success: true })
      }
    })
  }

  async handleMockAIToggle(enabled) {
    console.log('🎭 [ContextMe Content] Handling Mock AI toggle:', enabled)

    if (enabled) {
      await this.injectMockAIUI()
    } else {
      this.removeMockAIUI()
    }
  }

  async injectMockAIUI() {
    console.log('🎭 [ContextMe Content] Injecting Mock AI UI...')

    // 注入样式
    this.injectMockAIStyles()

    // 查找所有段落并注入Mock AI洞察
    const contentElements = document.querySelectorAll('p, div, article, section')
    contentElements.forEach((element, index) => {
      if (this.shouldInjectMockInsight(element)) {
        const mockInsight = this.createMockInsightElement(element, index)
        this.mockAIElements.push(mockInsight)

        // 插入到元素后面
        if (element.nextSibling) {
          element.parentNode.insertBefore(mockInsight, element.nextSibling)
        } else {
          element.parentNode.appendChild(mockInsight)
        }
      }
    })

    console.log(`✅ [ContextMe Content] Mock AI UI injected, ${this.mockAIElements.length} insights created`)
  }

  injectMockAIStyles() {
    const styleId = 'contextme-mock-ai-styles'

    // 检查是否已存在
    if (document.getElementById(styleId)) {
      return
    }

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .contextme-mock-insight {
        margin: 16px 0;
        padding: 16px;
        background: #f8fafc;
        border-left: 4px solid #3b82f6;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        position: relative;
        z-index: 9999;
      }

      .contextme-mock-insight .insight-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .contextme-mock-insight .insight-badge {
        display: inline-block;
        padding: 4px 8px;
        background: #dbeafe;
        color: #1e40af;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .contextme-mock-insight .insight-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
      }

      .contextme-mock-insight .insight-content {
        font-size: 13px;
        line-height: 1.5;
        color: #4b5563;
        margin-bottom: 8px;
      }

      .contextme-mock-insight .insight-suggestion {
        font-size: 12px;
        color: #6b7280;
        font-style: italic;
      }

      .contextme-mock-insight .insight-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #e5e7eb;
        font-size: 11px;
        color: #9ca3af;
      }
    `

    document.head.appendChild(style)
    console.log('✅ [ContextMe Content] Mock AI styles injected')
  }

  shouldInjectMockInsight(element) {
    // 检查元素是否有足够的文本内容
    const textContent = element.textContent || ''
    const textLength = textContent.trim().length

    // 排除已包含洞察的元素
    if (element.classList.contains('contextme-mock-insight') ||
        element.classList.contains('contextme-insight') ||
        element.querySelector('.contextme-mock-insight') ||
        element.querySelector('.contextme-insight')) {
      return false
    }

    // 只在文本内容超过30个字符的元素上注入
    return textLength > 30
  }

  createMockInsightElement(element, index) {
    const mockInsight = document.createElement('div')
    mockInsight.className = 'contextme-mock-insight'
    mockInsight.setAttribute('data-mock-index', index)

    // 分析元素内容生成相关洞察
    const elementText = element.textContent || ''
    const insightContent = this.generateMockInsightContent(elementText)

    mockInsight.innerHTML = `
      <div class="insight-header">
        <span class="insight-badge">Mock AI</span>
        <h4 class="insight-title">定制解读</h4>
      </div>
      <div class="insight-content">
        ${insightContent}
      </div>
      <div class="insight-suggestion">
        💡 建议：将此内容与您已有的知识体系结合，形成更完整的理解。
      </div>
      <div class="insight-meta">
        <span>相关性: ${Math.floor(Math.random() * 40) + 60}%</span>
        <span>刚刚</span>
      </div>
    `

    return mockInsight
  }

  generateMockInsightContent(elementText) {
    // 根据元素内容生成相关的Mock洞察内容
    const text = elementText.toLowerCase()

    if (text.includes('学习') || text.includes('学习')) {
      return '这段内容包含了重要的学习方法和技巧。建议结合实践来加深理解，并尝试将所学知识应用到实际场景中。'
    }

    if (text.includes('技术') || text.includes('开发') || text.includes('编程')) {
      return '这是一个技术相关的知识点。建议您重点关注其中的实现细节和最佳实践，可以考虑动手实践来巩固理解。'
    }

    if (text.includes('设计') || text.includes('用户体验')) {
      return '这段内容涉及设计理念或用户体验。建议从用户角度思考，理解背后的设计原则和思维模式。'
    }

    if (text.includes('数据') || text.includes('分析')) {
      return '这是关于数据分析的内容。建议您关注数据背后的逻辑和分析方法，培养数据思维对理解复杂问题很有帮助。'
    }

    if (text.includes('产品') || text.includes('管理')) {
      return '这段内容涉及产品或管理知识。建议结合实际案例来理解，思考如何将这些理论应用到具体工作中。'
    }

    // 默认通用洞察
    return '这是针对该段落的模拟AI分析内容。基于您的学习目标，这段内容包含了重要的概念和知识点，建议重点关注其中的实践方法和理论框架。'
  }

  removeMockAIUI() {
    console.log('🗑️ [ContextMe Content] Removing Mock AI UI...')

    this.mockAIElements.forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element)
      }
    })

    this.mockAIElements = []

    // 移除样式
    const style = document.getElementById('contextme-mock-ai-styles')
    if (style) {
      style.parentNode.removeChild(style)
    }

    console.log('✅ [ContextMe Content] Mock AI UI removed')
  }

  async waitForPageLoad() {
    return new Promise((resolve) => {
      const checkPageReady = () => {
        // 检查页面是否已经完全加载
        const title = document.title
        const hasContent = document.body.textContent.trim().length > 100

        // 如果标题不是 "Loading" 且有足够内容，则认为页面已加载完成
        if (title !== 'Loading' && hasContent) {
          console.log('📄 [ContextMe Content] Page is ready for analysis')
          resolve()
        } else {
          // 继续等待，最多等待10秒
          setTimeout(checkPageReady, 500)
        }
      }

      // 设置超时，最多等待10秒
      const timeout = setTimeout(() => {
        console.log('⏰ [ContextMe Content] Page load timeout, proceeding with analysis')
        resolve()
      }, 10000)

      // 开始检查
      checkPageReady()

      // 监听页面变化
      const observer = new MutationObserver(() => {
        if (document.title !== 'Loading') {
          clearTimeout(timeout)
          observer.disconnect()
          setTimeout(checkPageReady, 1000) // 额外等待1秒确保内容稳定
        }
      })

      observer.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      })
    })
  }
}

// 启动content script
const contextMe = new ContextMeContent()