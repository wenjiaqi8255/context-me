// ContextMe Background Service Worker
class ContextMeBackground {
  constructor() {
    this.apiPort = 3000 // 默认端口，可以通过配置修改
    this.apiBase = `http://localhost:${this.apiPort}/api`
    this.loadSavedPort().then(() => this.initialize())
  }

  async initialize() {
    // 监听来自content script和popup的消息
    const self = this
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      self.handleMessage(message, sender, sendResponse)
      return true // 保持消息通道开放
    })

    console.log('ContextMe background service initialized')
  }

  async handleMessage(message, sender, sendResponse) {
    const { type, data } = message

    console.log('Background received message:', { type, data })

    try {
      switch (type) {
        case 'ANALYZE_CONTENT':
          const analysis = await this.analyzeContent(data)
          sendResponse({ success: true, data: analysis })
          break

        case 'GENERATE_INSIGHT':
          const insight = await this.generateInsight(data)
          sendResponse({ success: true, data: insight })
          break

        case 'GET_PROFILE':
          const profile = await this.getProfile(data.userId)
          sendResponse({ success: true, data: profile })
          break

        case 'SAVE_PROFILE':
          const savedProfile = await this.saveProfile(data)
          sendResponse({ success: true, data: savedProfile })
          break

        // Popup 消息处理
        case 'GET_USER_PROFILE':
          const userProfile = await this.getLocalProfile()
          sendResponse({ success: true, data: userProfile })
          break

        case 'SAVE_USER_PROFILE':
          await this.saveLocalProfile(data.profileData)
          await this.syncProfileToCloud({ userId: data.userId, profileData: data.profileData })
          sendResponse({ success: true, data: { userId: data.userId, profileData: data.profileData } })
          break

        case 'GET_USAGE_STATS':
          const stats = await this.getUsageStats()
          sendResponse({ success: true, data: stats })
          break

        case 'SET_API_PORT':
          this.apiPort = data.port || 3000
          this.apiBase = `http://localhost:${this.apiPort}/api`
          await this.savePortToStorage(this.apiPort)
          console.log('API port updated to:', this.apiPort, 'API base:', this.apiBase)
          sendResponse({ success: true, data: { port: this.apiPort, apiBase: this.apiBase } })
          break

        case 'GET_API_PORT':
          sendResponse({ success: true, data: { port: this.apiPort, apiBase: this.apiBase } })
          break

        default:
          sendResponse({ success: false, error: 'Unknown message type' })
      }
    } catch (error) {
      console.error('Background handler error:', error)
      sendResponse({ success: false, error: error.message })
    }
  }

  
  async analyzeContent({ url, title, content }) {
    // 检查本地缓存
    const cacheKey = `content:${this.hashContent(content)}`
    const cached = await this.getCachedData(cacheKey)
    if (cached) {
      return cached
    }

    const response = await fetch(`${this.apiBase}/content/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, title, content })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      // 缓存结果
      await this.setCachedData(cacheKey, result.data, 86400) // 24小时
      return result.data
    } else {
      throw new Error(result.error || 'Failed to analyze content')
    }
  }

  async generateInsight({ userId, contentHash, userProfile, contentAnalysis }) {
    // 检查本地缓存
    const cacheKey = `insight:${userId}:${contentHash}`
    const cached = await this.getCachedData(cacheKey)
    if (cached) {
      return cached
    }

    const response = await fetch(`${this.apiBase}/insights/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        contentHash,
        userProfile,
        contentAnalysis
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      // 缓存结果
      await this.setCachedData(cacheKey, result.data, 3600) // 1小时
      return result.data
    } else {
      throw new Error(result.error || 'Failed to generate insight')
    }
  }

  async getProfile(userId) {
    const response = await fetch(`${this.apiBase}/profile?userId=${userId}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.success ? result.data : null
  }

  async saveProfile(profileData) {
    const { userId, profileData: data } = profileData

    if (!userId) {
      throw new Error('User ID is required')
    }

    const payload = {
      userId,
      profileData: data
    }

    const response = await fetch(`${this.apiBase}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`)
    }

    const result = await response.json()
    return result.success ? result.data : null
  }

  async getLocalProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userProfile'], (result) => {
        resolve(result.userProfile || null)
      })
    })
  }

  async saveLocalProfile(profile) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ userProfile: profile }, () => {
        resolve()
      })
    })
  }

  async syncProfileToCloud(profileData) {
    try {
      const userId = await this.getCurrentUserId()
      await this.saveProfile({
        userId,
        profileData
      })
    } catch (error) {
      console.error('Failed to sync profile to cloud:', error)
    }
  }

  async getCurrentUserId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userId'], (result) => {
        resolve(result.userId || null)
      })
    })
  }

  async getUsageStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['usageStats'], (result) => {
        resolve(result.usageStats || { today: 0, total: 0 })
      })
    })
  }

  async getCachedData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        if (result[key] && result[key].expiry > Date.now()) {
          resolve(result[key].data)
        } else {
          resolve(null)
        }
      })
    })
  }

  async setCachedData(key, data, ttlSeconds) {
    const expiry = Date.now() + (ttlSeconds * 1000)
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: { data, expiry } }, () => {
        resolve()
      })
    })
  }

  hashContent(content) {
    // 简单的哈希函数
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(36)
  }

  async savePortToStorage(port) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ apiPort: port }, () => {
        console.log('Port saved to storage:', port)
        resolve()
      })
    })
  }

  async loadSavedPort() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiPort'], (result) => {
        if (result.apiPort) {
          this.apiPort = result.apiPort
          this.apiBase = `http://localhost:${this.apiPort}/api`
          console.log('Port loaded from storage:', this.apiPort)
        }
        resolve()
      })
    })
  }
}

// 初始化background service worker
const contextMe = new ContextMeBackground()