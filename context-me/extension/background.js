// ContextMe Background Service Worker
class ContextMeBackground {
  constructor() {
    this.apiPort = 3001 // 默认端口，可以通过配置修改
    this.apiBase = `http://localhost:${this.apiPort}/api`
    this.aiEnabled = false // AI功能默认关闭
    this.mockAIEnabled = false // Mock AI功能默认关闭
    console.log('🚀 [ContextMe Background] Initializing background service...')
    this.loadSavedPort().then(() => this.loadAIStatus().then(() => this.loadMockAIStatus().then(() => this.initialize())))
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

    console.log('📥 [ContextMe Background] Received message:', { type, data })
    console.log('📥 [ContextMe Background] Message from:', sender)
    console.log('📥 [ContextMe Background] Current AI status:', this.aiEnabled)
    console.log('📥 [ContextMe Background] Current API port:', this.apiPort)

    // 特殊日志用于Mock AI消息
    if (type === 'SET_MOCK_AI_STATUS') {
      console.log('🎭 [ContextMe Background] Received Mock AI status message:', data)
    }

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
          await this.syncProfileToCloud(data.profileData)
          sendResponse({ success: true, data: { profileData: data.profileData } })
          break

        case 'EXTENSION_LOGIN':
          await this.handleExtensionLogin(data)
          sendResponse({ success: true })
          break

        case 'EXTENSION_LOGOUT':
          await this.handleExtensionLogout()
          sendResponse({ success: true })
          break

        case 'CHECK_AUTH_STATUS':
          const authToken = await this.getAuthToken()
          const isAuthenticated = !!authToken
          sendResponse({ success: true, data: { isAuthenticated } })
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

        case 'GET_AI_STATUS':
          sendResponse({ success: true, data: { enabled: this.aiEnabled } })
          break

        case 'SET_AI_STATUS':
          this.aiEnabled = data.enabled
          await this.saveAIStatus(data.enabled)
          console.log('🤖 [ContextMe Background] AI status set to:', data.enabled)
          sendResponse({ success: true, data: { enabled: this.aiEnabled } })
          break

        case 'SET_MOCK_AI_STATUS':
          this.mockAIEnabled = data.enabled
          await this.saveMockAIStatus(data.enabled)
          console.log('🎭 [ContextMe Background] Mock AI status set to:', data.enabled)
          sendResponse({ success: true, data: { enabled: this.mockAIEnabled } })
          break

        case 'GET_MOCK_AI_STATUS':
          sendResponse({ success: true, data: { enabled: this.mockAIEnabled } })
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
    console.log('👤 [ContextMe Background] Getting local user profile...')
    return new Promise((resolve) => {
      chrome.storage.local.get(['userProfile', 'authToken'], (result) => {
        if (result.authToken) {
          console.log('🔐 [ContextMe Background] Auth token found, fetching from cloud...')
          this.fetchProfileFromCloud(result.authToken).then(resolve).catch(() => {
            console.log('📥 [ContextMe Background] Fallback to local profile:', result.userProfile ? 'exists' : 'not found')
            resolve(result.userProfile || null)
          })
        } else {
          console.log('📥 [ContextMe Background] No auth token, using local profile:', result.userProfile ? 'exists' : 'not found')
          resolve(result.userProfile || null)
        }
      })
    })
  }

  async saveLocalProfile(profile) {
    console.log('💾 [ContextMe Background] Saving local user profile...')
    console.log('📝 [ContextMe Background] Profile data to save:', profile)
    return new Promise((resolve) => {
      chrome.storage.local.set({ userProfile: profile }, () => {
        console.log('✅ [ContextMe Background] Local profile saved successfully')
        resolve()
      })
    })
  }

  async syncProfileToCloud(profileData) {
    try {
      const authToken = await this.getAuthToken()
      if (authToken) {
        await this.saveProfileToCloud(authToken, profileData)
      }
    } catch (error) {
      console.error('Failed to sync profile to cloud:', error)
    }
  }

  async getAuthToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken'], (result) => {
        resolve(result.authToken || null)
      })
    })
  }

  async saveAuthToken(token) {
    console.log('🔐 [ContextMe Background] Saving auth token...')
    return new Promise((resolve) => {
      chrome.storage.local.set({ authToken: token }, () => {
        console.log('✅ [ContextMe Background] Auth token saved successfully')
        resolve()
      })
    })
  }

  async fetchProfileFromCloud(authToken) {
    try {
      const response = await fetch(`${this.apiBase}/extension/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        console.log('✅ [ContextMe Background] Profile fetched from cloud:', result.data)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch profile')
      }
    } catch (error) {
      console.error('❌ [ContextMe Background] Failed to fetch profile from cloud:', error)
      throw error
    }
  }

  async saveProfileToCloud(authToken, profileData) {
    try {
      const response = await fetch(`${this.apiBase}/extension/profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profileData })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        console.log('✅ [ContextMe Background] Profile saved to cloud:', result.data)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to save profile')
      }
    } catch (error) {
      console.error('❌ [ContextMe Background] Failed to save profile to cloud:', error)
      throw error
    }
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
          console.log('🔌 [ContextMe Background] Port loaded from storage:', this.apiPort)
        }
        resolve()
      })
    })
  }

  async loadAIStatus() {
    console.log('🤖 [ContextMe Background] Loading AI status from storage...')
    return new Promise((resolve) => {
      chrome.storage.local.get(['aiEnabled'], (result) => {
        if (result.aiEnabled !== undefined) {
          this.aiEnabled = result.aiEnabled
          console.log('✅ [ContextMe Background] AI status loaded from storage:', this.aiEnabled)
        } else {
          console.log('📝 [ContextMe Background] No AI status found, using default:', this.aiEnabled)
        }
        resolve()
      })
    })
  }

  async saveAIStatus(enabled) {
    console.log('💾 [ContextMe Background] Saving AI status to storage:', enabled)
    return new Promise((resolve) => {
      chrome.storage.local.set({ aiEnabled: enabled }, () => {
        console.log('✅ [ContextMe Background] AI status saved successfully')
        resolve()
      })
    })
  }

  async saveMockAIStatus(enabled) {
    console.log('💾 [ContextMe Background] Saving Mock AI status to storage:', enabled)
    return new Promise((resolve) => {
      chrome.storage.local.set({ mockAIEnabled: enabled }, () => {
        console.log('✅ [ContextMe Background] Mock AI status saved successfully')
        resolve()
      })
    })
  }

  async loadMockAIStatus() {
    console.log('🎭 [ContextMe Background] Loading Mock AI status from storage...')
    return new Promise((resolve) => {
      chrome.storage.local.get(['mockAIEnabled'], (result) => {
        if (result.mockAIEnabled !== undefined) {
          this.mockAIEnabled = result.mockAIEnabled
          console.log('✅ [ContextMe Background] Mock AI status loaded from storage:', this.mockAIEnabled)
        } else {
          console.log('📝 [ContextMe Background] No Mock AI status found, using default:', this.mockAIEnabled)
        }
        resolve()
      })
    })
  }

  async handleExtensionLogin(data) {
    console.log('🔐 [ContextMe Background] Handling extension login with data:', data)
    try {
      // 检查是否使用 Google OAuth token
      if (data.token) {
        console.log('🔐 [ContextMe Background] Using Google OAuth token for login')
        const response = await fetch(`${this.apiBase}/auth/google-extension`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: data.token })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        if (result.success) {
          const { token } = result.data
          await this.saveAuthToken(token)
          console.log('✅ [ContextMe Background] Google extension login successful')

          // Notify popup of successful login
          chrome.runtime.sendMessage({ type: 'LOGIN_SUCCESS' })
          return
        }
      } else if (data.email) {
        // 兼容旧的邮箱登录方式
        console.log('🔐 [ContextMe Background] Using email login for:', data.email)
        const response = await fetch(`${this.apiBase}/auth/extension`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: data.email })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        if (result.success) {
          const { token } = result.data
          await this.saveAuthToken(token)
          console.log('✅ [ContextMe Background] Extension email login successful')

          // Notify popup of successful login
          chrome.runtime.sendMessage({ type: 'LOGIN_SUCCESS' })
          return
        }
      }

      throw new Error('Login failed - no valid authentication method provided')
    } catch (error) {
      console.error('❌ [ContextMe Background] Extension login error:', error)
      throw error
    }
  }

  async handleExtensionLogout() {
    console.log('🚪 [ContextMe Background] Handling extension logout...')
    try {
      // Remove auth token
      await new Promise((resolve) => {
        chrome.storage.local.remove(['authToken'], resolve)
      })

      // Clear local profile but keep settings
      const settings = await new Promise((resolve) => {
        chrome.storage.local.get(['aiEnabled', 'apiPort', 'usageStats'], resolve)
      })

      await new Promise((resolve) => {
        chrome.storage.local.clear(() => {
          chrome.storage.local.set(settings, resolve)
        })
      })

      console.log('✅ [ContextMe Background] Extension logout successful')

      // Notify popup of logout
      chrome.runtime.sendMessage({ type: 'LOGOUT_SUCCESS' })
    } catch (error) {
      console.error('❌ [ContextMe Background] Extension logout failed:', error)
      throw error
    }
  }
}

// 初始化background service worker
const contextMe = new ContextMeBackground()