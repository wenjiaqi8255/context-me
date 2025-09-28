// ContextMe Popup Script
class ContextMePopup {
  constructor() {
    this.currentProfile = null
    this.isAuthenticated = false
    this.initialize()
  }

  async initialize() {
    // 检查认证状态
    await this.checkAuthStatus()

    // 根据认证状态初始化界面
    if (this.isAuthenticated) {
      // 加载用户档案
      await this.loadUserProfile()

      // 加载使用统计
      await this.loadUsageStats()

      // 加载AI功能状态
      await this.loadAIStatus()

      // 加载Mock AI功能状态
      await this.loadMockAIStatus()

      // 初始化标签输入
      this.initializeTagsInput('interestsTags')
      this.initializeTagsInput('goalsTags')
      this.initializeTagsInput('skillsTags')
    }

    // 加载API端口配置
    await this.loadApiPortConfig()

    // 检查连接状态
    await this.checkConnection()

    // 设置事件监听器
    this.setupEventListeners()

    // 显示开发模式工具
    this.showDevelopmentTools()

    // 更新界面显示
    this.updateUI()
  }

  async loadUserProfile() {
    console.log('🔍 [ContextMe Popup] Starting to load user profile...')
    try {
      console.log('📤 [ContextMe Popup] Sending GET_USER_PROFILE message to background...')
      const response = await this.sendMessageToBackground({
        type: 'GET_USER_PROFILE'
      })

      console.log('📥 [ContextMe Popup] Received profile response:', response)

      if (response.success) {
        console.log('✅ [ContextMe Popup] Profile loaded successfully:', response.data)
        this.currentProfile = response.data
        console.log('🔧 [ContextMe Popup] Populating form with profile data...')
        this.populateForm(this.currentProfile)
        console.log('✅ [ContextMe Popup] Form populated successfully')
      } else {
        console.warn('⚠️ [ContextMe Popup] Failed to load profile - no success in response:', response)
      }
    } catch (error) {
      console.error('❌ [ContextMe Popup] Failed to load profile:', error)
      console.error('❌ [ContextMe Popup] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
  }

  async loadUsageStats() {
    try {
      const response = await this.sendMessageToBackground({
        type: 'GET_USAGE_STATS'
      })

      if (response.success) {
        const stats = response.data
        document.getElementById('todayUsage').textContent = stats.today || 0
        document.getElementById('totalUsage').textContent = stats.total || 0
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error)
    }
  }

  async checkConnection() {
    try {
      const port = await this.getApiPort()
      const response = await fetch(`http://localhost:${port}/api/health`)
      if (response.ok) {
        document.getElementById('connectionStatus').textContent = '已连接'
        document.getElementById('connectionStatus').style.color = '#10b981'
      } else {
        throw new Error('API not responding')
      }
    } catch (error) {
      document.getElementById('connectionStatus').textContent = '未连接'
      document.getElementById('connectionStatus').style.color = '#ef4444'
    }
  }

  async getApiPort() {
    try {
      const response = await this.sendMessageToBackground({
        type: 'GET_API_PORT'
      })
      return response.success ? response.data.port : 3001
    } catch (error) {
      return 3001
    }
  }

  async setApiPort(port) {
    try {
      const response = await this.sendMessageToBackground({
        type: 'SET_API_PORT',
        data: { port }
      })
      return response.success
    } catch (error) {
      return false
    }
  }

  async loadApiPortConfig() {
    try {
      const port = await this.getApiPort()
      document.getElementById('apiPort').value = port
    } catch (error) {
      console.error('Failed to load API port config:', error)
    }
  }

  async loadAIStatus() {
    console.log('🤖 [ContextMe Popup] Loading AI status...')
    try {
      const response = await this.sendMessageToBackground({
        type: 'GET_AI_STATUS'
      })

      console.log('📥 [ContextMe Popup] AI status response:', response)

      if (response.success) {
        const { enabled } = response.data
        const aiEnabledCheckbox = document.getElementById('aiEnabled')
        const aiStatusText = document.getElementById('aiStatus')

        if (aiEnabledCheckbox) {
          aiEnabledCheckbox.checked = enabled
          console.log('✅ [ContextMe Popup] AI checkbox set to:', enabled)
        } else {
          console.error('❌ [ContextMe Popup] AI enabled checkbox not found')
        }

        if (aiStatusText) {
          aiStatusText.textContent = enabled ? '已启用' : '未启用'
          aiStatusText.style.color = enabled ? '#10b981' : '#6b7280'
          console.log('✅ [ContextMe Popup] AI status text updated to:', enabled ? '已启用' : '未启用')
        } else {
          console.error('❌ [ContextMe Popup] AI status text element not found')
        }
      } else {
        console.warn('⚠️ [ContextMe Popup] Failed to load AI status:', response.error)
      }
    } catch (error) {
      console.error('❌ [ContextMe Popup] Failed to load AI status:', error)
    }
  }

  async loadMockAIStatus() {
    console.log('🎭 [ContextMe Popup] Loading Mock AI status...')
    try {
      const response = await this.sendMessageToBackground({
        type: 'GET_MOCK_AI_STATUS'
      })

      console.log('📥 [ContextMe Popup] Mock AI status response:', response)

      if (response.success) {
        const { enabled } = response.data
        const mockAIEnabledCheckbox = document.getElementById('mockAIEnabled')
        const mockAIStatusText = document.getElementById('mockAIStatus')

        if (mockAIEnabledCheckbox) {
          mockAIEnabledCheckbox.checked = enabled
          console.log('✅ [ContextMe Popup] Mock AI checkbox set to:', enabled)
        } else {
          console.error('❌ [ContextMe Popup] Mock AI enabled checkbox not found')
        }

        if (mockAIStatusText) {
          mockAIStatusText.textContent = enabled ? '已启用' : '未启用'
          mockAIStatusText.style.color = enabled ? '#d97706' : '#6b7280'
          console.log('✅ [ContextMe Popup] Mock AI status text updated to:', enabled ? '已启用' : '未启用')
        } else {
          console.error('❌ [ContextMe Popup] Mock AI status text element not found')
        }
      } else {
        console.warn('⚠️ [ContextMe Popup] Failed to load Mock AI status:', response.error)
      }
    } catch (error) {
      console.error('❌ [ContextMe Popup] Failed to load Mock AI status:', error)
    }
  }

  async checkAuthStatus() {
    console.log('🔐 [ContextMe Popup] Checking auth status...')
    try {
      const response = await this.sendMessageToBackground({
        type: 'CHECK_AUTH_STATUS'
      })

      if (response.success) {
        this.isAuthenticated = response.data.isAuthenticated
        console.log('✅ [ContextMe Popup] Auth status checked:', this.isAuthenticated)
      } else {
        console.warn('⚠️ [ContextMe Popup] Failed to check auth status')
      }
    } catch (error) {
      console.error('❌ [ContextMe Popup] Failed to check auth status:', error)
    }
  }

  async handleLogin() {
    console.log('🔐 [ContextMe Popup] Handling Google OAuth login...')

    try {
      this.showLoading(true)

      // 使用 Chrome Identity API 获取 Google OAuth token
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({
          interactive: true
        }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(token)
          }
        })
      })

      if (!token) {
        throw new Error('Failed to get authentication token')
      }

      console.log('✅ [ContextMe Popup] Got Google token, sending to backend...')

      // 发送 token 到后端验证
      const response = await this.sendMessageToBackground({
        type: 'EXTENSION_LOGIN',
        data: { token }
      })

      if (response.success) {
        this.isAuthenticated = true
        alert('Google 登录成功！正在重新加载...')
        // 重新初始化
        await this.initialize()
      } else {
        throw new Error(response.error || '后端验证失败')
      }
    } catch (error) {
      console.error('❌ [ContextMe Popup] Google login failed:', error)
      alert('Google 登录失败: ' + error.message)
    } finally {
      this.showLoading(false)
    }
  }

  async handleLogout() {
    console.log('🚪 [ContextMe Popup] Handling logout...')
    if (!confirm('确定要退出登录吗？')) {
      return
    }

    try {
      this.showLoading(true)

      // 清除 Chrome Identity 缓存的 token
      await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (token) {
            chrome.identity.removeCachedAuthToken({ token }, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
              } else {
                resolve()
              }
            })
          } else {
            resolve()
          }
        })
      })

      // 通知后端退出登录
      const response = await this.sendMessageToBackground({
        type: 'EXTENSION_LOGOUT'
      })

      if (response.success) {
        this.isAuthenticated = false
        this.currentProfile = null
        alert('已退出 Google 登录')
        // 重新初始化
        await this.initialize()
      } else {
        throw new Error(response.error || '退出登录失败')
      }
    } catch (error) {
      console.error('❌ [ContextMe Popup] Logout failed:', error)
      alert('退出登录失败: ' + error.message)
    } finally {
      this.showLoading(false)
    }
  }

  updateUI() {
    const loginSection = document.getElementById('loginSection')
    const profileSection = document.getElementById('profileSection')

    if (this.isAuthenticated) {
      if (loginSection) loginSection.style.display = 'none'
      if (profileSection) profileSection.style.display = 'block'
    } else {
      if (loginSection) loginSection.style.display = 'block'
      if (profileSection) profileSection.style.display = 'none'
    }
  }

  async setAIStatus(enabled) {
    console.log('🤖 [ContextMe Popup] Setting AI status to:', enabled)

    // 检查用户信息是否已填写
    if (enabled) {
      const hasUserData = this.hasUserData()
      if (!hasUserData) {
        console.log('⚠️ [ContextMe Popup] No user data, disabling AI')
        const aiEnabledCheckbox = document.getElementById('aiEnabled')
        if (aiEnabledCheckbox) {
          aiEnabledCheckbox.checked = false
        }
        this.showStatus('请先填写您的目标信息再启用AI模式', 'error')
        return
      }
    }

    try {
      const response = await this.sendMessageToBackground({
        type: 'SET_AI_STATUS',
        data: { enabled }
      })

      console.log('📥 [ContextMe Popup] Set AI status response:', response)

      if (response.success) {
        const aiStatusText = document.getElementById('aiStatus')
        const refreshInstructions = document.getElementById('refreshInstructions')

        if (aiStatusText) {
          aiStatusText.textContent = enabled ? '已启用' : '未启用'
          aiStatusText.style.color = enabled ? '#10b981' : '#6b7280'
          console.log('✅ [ContextMe Popup] AI status text updated successfully')
        }

        if (refreshInstructions) {
          refreshInstructions.style.display = enabled ? 'block' : 'none'
        }

        console.log('✅ [ContextMe Popup] AI status set successfully')
      } else {
        console.error('❌ [ContextMe Popup] Failed to set AI status:', response.error)
      }
    } catch (error) {
      console.error('❌ [ContextMe Popup] Failed to set AI status:', error)
    }
  }

  hasUserData() {
    const background = document.getElementById('userBackground').value.trim()
    const interests = this.getTags('interestsTags')
    const goals = this.getTags('goalsTags')
    const skills = this.getTags('skillsTags')

    return background || interests.length > 0 || goals.length > 0 || skills.length > 0
  }

  injectTestUI() {
    console.log('🔧 [ContextMe Popup] Injecting test UI...')
    this.toggleMockUI(true)
  }

  injectTestUIContent() {
    // 创建Mock UI样式，与真实AI洞察使用相同的样式
    const style = document.createElement('style')
    style.textContent = `
      .contextme-insight {
        margin: 16px 0;
        padding: 16px;
        background: #f8fafc;
        border-left: 4px solid #3b82f6;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .contextme-insight .insight-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }
      .contextme-insight .insight-badge {
        display: inline-block;
        padding: 4px 8px;
        background: #dbeafe;
        color: #1e40af;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }
      .contextme-insight .insight-title {
        margin: 0;
        color: #1e40af;
        font-size: 14px;
        font-weight: 600;
        flex: 1;
      }
      .contextme-insight .insight-content {
        color: #374151;
        font-size: 13px;
        line-height: 1.5;
        margin-bottom: 8px;
      }
      .contextme-insight .insight-suggestion {
        color: #6b7280;
        font-size: 12px;
        font-style: italic;
        border-top: 1px solid #e5e7eb;
        padding-top: 8px;
        margin-top: 8px;
      }
    `
    document.head.appendChild(style)

    // 在每个段落后面注入Mock UI
    const paragraphs = document.querySelectorAll('p')
    paragraphs.forEach((paragraph, index) => {
      if (paragraph.textContent.length > 30) { // 为较长的段落添加
        const mockInsight = document.createElement('div')
        mockInsight.className = 'contextme-insight'
        mockInsight.setAttribute('data-mock', 'true')
        mockInsight.innerHTML = `
          <div class="insight-header">
            <span class="insight-badge">Mock AI</span>
            <h4 class="insight-title">定制解读</h4>
          </div>
          <div class="insight-content">
            这是针对该段落的模拟AI分析内容。基于您的学习目标，这段内容包含了重要的概念和知识点，建议重点关注其中的实践方法和理论框架。
          </div>
          <div class="insight-suggestion">
            💡 建议：将此内容与您已有的知识体系结合，形成更完整的理解。
          </div>
        `
        paragraph.parentNode.insertBefore(mockInsight, paragraph.nextSibling)
      }
    })

    console.log('🎭 Mock AI UI已注入到页面中')
  }

  removeMockUI() {
    // 移除所有Mock UI元素
    const mockInsights = document.querySelectorAll('.contextme-insight[data-mock="true"]')
    mockInsights.forEach(element => element.remove())
    console.log('🎭 Mock AI UI已从页面中移除')
  }

  async setMockAIStatus(enabled) {
    console.log('🎭 [ContextMe Popup] Setting Mock AI status to:', enabled)

    // 更新UI状态
    const mockAIStatusText = document.getElementById('mockAIStatus')

    if (mockAIStatusText) {
      mockAIStatusText.textContent = enabled ? '已启用' : '未启用'
      mockAIStatusText.style.color = enabled ? '#d97706' : '#6b7280'
      console.log('✅ [ContextMe Popup] Mock AI status text updated successfully')
    }

    console.log('✅ [ContextMe Popup] Mock AI status set successfully')

    // 向content script发送消息以注入/移除Mock UI
    await this.toggleMockUI(enabled)
  }

  async toggleMockUI(enabled) {
    console.log('🎭 [ContextMe Popup] Toggling Mock UI:', enabled)

    // 首先保存Mock AI状态到background
    await this.sendMessageToBackground({
      type: 'SET_MOCK_AI_STATUS',
      data: { enabled }
    })

    // 向当前活动标签页发送消息
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'MOCK_AI_TOGGLED',
          enabled: enabled
        }, (response) => {
          console.log('📥 [ContextMe Popup] Mock AI toggle response:', response)
        })
      }
    })
  }

  populateForm(profile) {
    console.log('🔧 [ContextMe Popup] Starting populateForm with profile:', profile)

    if (!profile) {
      console.warn('⚠️ [ContextMe Popup] No profile provided to populateForm')
      return
    }

    if (!profile.profileData) {
      console.warn('⚠️ [ContextMe Popup] Profile has no profileData:', profile)
      return
    }

    const data = profile.profileData
    console.log('📋 [ContextMe Popup] Profile data to populate:', data)

    try {
      // 基本信息
      console.log('📝 [ContextMe Popup] Populating basic fields...')
      const userBackgroundField = document.getElementById('userBackground')

      if (userBackgroundField) {
        userBackgroundField.value = data.background || ''
        console.log('✅ [ContextMe Popup] Background field populated:', data.background ? '(has content)' : '(empty)')
      } else {
        console.error('❌ [ContextMe Popup] userBackground field not found')
      }

      // 标签
      console.log('🏷️ [ContextMe Popup] Populating tags...')
      console.log('🏷️ [ContextMe Popup] Interests to set:', data.interests || [])
      this.setTags('interestsTags', data.interests || [])

      console.log('🎯 [ContextMe Popup] Goals to set:', data.goals || [])
      this.setTags('goalsTags', data.goals || [])

      console.log('🛠️ [ContextMe Popup] Skills to set:', data.skills || [])
      this.setTags('skillsTags', data.skills || [])

      // 偏好设置
      console.log('⚙️ [ContextMe Popup] Populating preferences...')
      const languageField = document.getElementById('language')
      const insightStyleField = document.getElementById('insightStyle')
      const aiEnabledCheckbox = document.getElementById('aiEnabled')
      const aiStatusText = document.getElementById('aiStatus')

      if (languageField) {
        languageField.value = data.preferences?.language || 'zh'
        console.log('✅ [ContextMe Popup] Language field populated:', data.preferences?.language || 'zh')
      } else {
        console.error('❌ [ContextMe Popup] language field not found')
      }

      if (insightStyleField) {
        insightStyleField.value = data.preferences?.insightStyle || 'detailed'
        console.log('✅ [ContextMe Popup] Insight style field populated:', data.preferences?.insightStyle || 'detailed')
      } else {
        console.error('❌ [ContextMe Popup] insightStyle field not found')
      }

      // AI功能状态
      const aiEnabled = data.preferences?.aiEnabled ?? false
      if (aiEnabledCheckbox) {
        aiEnabledCheckbox.checked = aiEnabled
        console.log('✅ [ContextMe Popup] AI enabled field populated:', aiEnabled)
      } else {
        console.error('❌ [ContextMe Popup] AI enabled checkbox not found')
      }

      if (aiStatusText) {
        aiStatusText.textContent = aiEnabled ? '已启用' : '未启用'
        aiStatusText.style.color = aiEnabled ? '#10b981' : '#6b7280'
        console.log('✅ [ContextMe Popup] AI status text populated:', aiEnabled ? '已启用' : '未启用')
      } else {
        console.error('❌ [ContextMe Popup] AI status text element not found')
      }

      console.log('✅ [ContextMe Popup] Form population completed successfully')

    } catch (error) {
      console.error('❌ [ContextMe Popup] Error during form population:', error)
      console.error('❌ [ContextMe Popup] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }
  }

  setupEventListeners() {
    // 登录按钮
    const loginButton = document.getElementById('loginButton')
    if (loginButton) {
      loginButton.addEventListener('click', () => this.handleLogin())
    }

    // 退出登录按钮
    const logoutButton = document.getElementById('logoutButton')
    if (logoutButton) {
      logoutButton.addEventListener('click', () => this.handleLogout())
    }

    // 保存按钮
    const saveButton = document.getElementById('saveButton')
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveProfile())
    }

    // 重置按钮
    const resetButton = document.getElementById('resetButton')
    if (resetButton) {
      resetButton.addEventListener('click', () => this.resetProfile())
    }

    // 端口更新按钮
    const updatePortButton = document.getElementById('updatePortButton')
    if (updatePortButton) {
      updatePortButton.addEventListener('click', () => {
        const port = parseInt(document.getElementById('apiPort').value)
        if (port && port > 0 && port < 65536) {
          this.setApiPort(port).then(success => {
            if (success) {
              alert('API端口已更新，将重新检查连接状态')
              this.checkConnection()
            } else {
              alert('更新API端口失败')
            }
          })
        } else {
          alert('请输入有效的端口号 (1-65535)')
        }
      })
    }

    // AI功能开关
    const aiEnabledCheckbox = document.getElementById('aiEnabled')
    if (aiEnabledCheckbox) {
      aiEnabledCheckbox.addEventListener('change', (e) => {
        console.log('🔄 [ContextMe Popup] AI checkbox changed to:', e.target.checked)
        this.setAIStatus(e.target.checked)
      })
      console.log('✅ [ContextMe Popup] AI checkbox event listener added')
    } else {
      console.error('❌ [ContextMe Popup] AI enabled checkbox not found for event listener')
    }

    // Mock AI功能开关
    const mockAIEnabledCheckbox = document.getElementById('mockAIEnabled')
    if (mockAIEnabledCheckbox) {
      mockAIEnabledCheckbox.addEventListener('change', (e) => {
        console.log('🎭 [ContextMe Popup] Mock AI checkbox changed to:', e.target.checked)
        this.setMockAIStatus(e.target.checked)
      })
      console.log('✅ [ContextMe Popup] Mock AI checkbox event listener added')
    }
  }

  initializeTagsInput(containerId) {
    const container = document.getElementById(containerId)
    const input = container.querySelector('input')

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const value = input.value.trim()
        if (value && !this.hasTag(container, value)) {
          this.addTag(container, value)
          input.value = ''
        }
      }
    })

    // 点击容器时聚焦输入框
    container.addEventListener('click', (e) => {
      if (e.target === container) {
        input.focus()
      }
    })
  }

  addTag(container, text) {
    const tag = document.createElement('div')
    tag.className = 'tag'
    tag.innerHTML = `
      <span>${text}</span>
      <span class="remove" onclick="this.parentElement.remove()">×</span>
    `

    // 在输入框前插入标签
    const input = container.querySelector('input')
    container.insertBefore(tag, input)
  }

  hasTag(container, text) {
    const tags = container.querySelectorAll('.tag span:first-child')
    return Array.from(tags).some(tag => tag.textContent === text)
  }

  setTags(containerId, tags) {
    const container = document.getElementById(containerId)
    const existingTags = container.querySelectorAll('.tag')
    existingTags.forEach(tag => tag.remove())

    tags.forEach(tag => this.addTag(container, tag))
  }

  getTags(containerId) {
    const container = document.getElementById(containerId)
    const tags = container.querySelectorAll('.tag span:first-child')
    return Array.from(tags).map(tag => tag.textContent)
  }

  async saveProfile() {
    try {
      this.showLoading(true)
      this.hideStatus()

      // 收集表单数据
      const profileData = {
        background: document.getElementById('userBackground').value.trim(),
        interests: this.getTags('interestsTags'),
        goals: this.getTags('goalsTags'),
        skills: this.getTags('skillsTags'),
        preferences: {
          language: document.getElementById('language').value,
          insightStyle: document.getElementById('insightStyle').value,
          aiEnabled: document.getElementById('aiEnabled').checked
        }
      }

      // 验证必填字段
      if (!profileData.background && !profileData.interests.length && !profileData.goals.length) {
        this.showStatus('请至少填写您的目标、兴趣或目标', 'error')
        return
      }

      // 保存到后台
      const response = await this.sendMessageToBackground({
        type: 'SAVE_USER_PROFILE',
        data: {
          profileData: profileData
        }
      })

      if (response.success) {
        this.currentProfile = response.data
        this.showStatus('保存成功！', 'success')
      } else {
        throw new Error(response.error || 'Failed to save profile')
      }

    } catch (error) {
      console.error('Save profile error:', error)
      this.showStatus('保存失败: ' + error.message, 'error')
    } finally {
      this.showLoading(false)
    }
  }

  async resetProfile() {
    if (!confirm('确定要重置所有设置吗？')) return

    try {
      this.showLoading(true)

      // 清空表单
      document.getElementById('userBackground').value = ''
      this.setTags('interestsTags', [])
      this.setTags('goalsTags', [])
      this.setTags('skillsTags', [])
      document.getElementById('language').value = 'zh'
      document.getElementById('insightStyle').value = 'detailed'

      // 保存空档案
      const profileData = {
        interests: [],
        goals: [],
        skills: [],
        preferences: {
          language: 'zh',
          insightStyle: 'detailed',
          aiEnabled: false
        }
      }

      await this.sendMessageToBackground({
        type: 'SAVE_USER_PROFILE',
        data: {
          profileData: profileData
        }
      })

      this.currentProfile = null
      this.showStatus('重置成功', 'success')

    } catch (error) {
      console.error('Reset profile error:', error)
      this.showStatus('重置失败: ' + error.message, 'error')
    } finally {
      this.showLoading(false)
    }
  }

  sendMessageToBackground(message) {
    console.log('📤 [ContextMe Popup] Sending message to background:', message)
    console.log('📤 [ContextMe Popup] Message type:', message.type)
    console.log('📤 [ContextMe Popup] Message data:', message.data)

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ [ContextMe Popup] Message send failed:', chrome.runtime.lastError.message)
          console.error('❌ [ContextMe Popup] Chrome runtime error details:', chrome.runtime.lastError)
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          console.log('📥 [ContextMe Popup] Message response received:', response)
          console.log('📥 [ContextMe Popup] Response type:', typeof response)
          console.log('📥 [ContextMe Popup] Response success:', response?.success)
          if (response?.success) {
            console.log('📥 [ContextMe Popup] Response data:', response.data)
          }
          if (!response?.success) {
            console.log('📥 [ContextMe Popup] Response error:', response?.error)
          }
          resolve(response)
        }
      })
    })
  }

  showLoading(show) {
    const loading = document.getElementById('loading')
    if (show) {
      loading.classList.add('active')
    } else {
      loading.classList.remove('active')
    }
  }

  showStatus(message, type) {
    const status = document.getElementById('status')
    status.textContent = message
    status.className = `status ${type}`
    status.style.display = 'block'

    // 3秒后自动隐藏
    setTimeout(() => {
      this.hideStatus()
    }, 3000)
  }

  hideStatus() {
    const status = document.getElementById('status')
    status.style.display = 'none'
  }

  showDevelopmentTools() {
    // 在开发模式下显示开发工具
    const developmentSection = document.getElementById('developmentSection')
    if (developmentSection) {
      developmentSection.style.display = 'block'
    }
  }
}

// 当页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  window.contextMePopup = new ContextMePopup()
})

// 不再需要全局函数，使用事件监听器