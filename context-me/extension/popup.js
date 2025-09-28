// ContextMe Popup Script
class ContextMePopup {
  constructor() {
    this.currentProfile = null
    this.initialize()
  }

  async initialize() {
    // 加载用户档案
    await this.loadUserProfile()

    // 加载使用统计
    await this.loadUsageStats()

    // 加载API端口配置
    await this.loadApiPortConfig()

    // 检查连接状态
    await this.checkConnection()

    // 设置事件监听器
    this.setupEventListeners()

    // 初始化标签输入
    this.initializeTagsInput('interestsTags')
    this.initializeTagsInput('goalsTags')
    this.initializeTagsInput('skillsTags')
  }

  async loadUserProfile() {
    try {
      const response = await this.sendMessageToBackground({
        type: 'GET_USER_PROFILE'
      })

      if (response.success) {
        this.currentProfile = response.data
        this.populateForm(this.currentProfile)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
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
      return response.success ? response.data.port : 3000
    } catch (error) {
      return 3000
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

  populateForm(profile) {
    if (!profile || !profile.profileData) return

    const data = profile.profileData

    // 基本信息
    document.getElementById('userName').value = data.name || ''
    document.getElementById('userEmail').value = data.email || ''
    document.getElementById('userBackground').value = data.background || ''

    // 标签
    this.setTags('interestsTags', data.interests || [])
    this.setTags('goalsTags', data.goals || [])
    this.setTags('skillsTags', data.skills || [])

    // 偏好设置
    document.getElementById('language').value = data.preferences?.language || 'zh'
    document.getElementById('insightStyle').value = data.preferences?.insightStyle || 'detailed'
  }

  setupEventListeners() {
    // 保存按钮
    document.getElementById('saveButton').addEventListener('click', () => this.saveProfile())

    // 重置按钮
    document.getElementById('resetButton').addEventListener('click', () => this.resetProfile())

    // 端口更新按钮
    document.getElementById('updatePortButton').addEventListener('click', () => {
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
        name: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        background: document.getElementById('userBackground').value.trim(),
        interests: this.getTags('interestsTags'),
        goals: this.getTags('goalsTags'),
        skills: this.getTags('skillsTags'),
        preferences: {
          language: document.getElementById('language').value,
          insightStyle: document.getElementById('insightStyle').value
        }
      }

      // 验证必填字段
      if (!profileData.interests.length || !profileData.goals.length) {
        this.showStatus('请至少填写兴趣和目标', 'error')
        return
      }

      // 保存到后台
      const response = await this.sendMessageToBackground({
        type: 'SAVE_USER_PROFILE',
        data: {
          userId: this.currentProfile?.userId || 'temp_user',
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
      document.getElementById('userName').value = ''
      document.getElementById('userEmail').value = ''
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
          insightStyle: 'detailed'
        }
      }

      await this.sendMessageToBackground({
        type: 'SAVE_USER_PROFILE',
        data: {
          userId: this.currentProfile?.userId || 'temp_user',
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
    console.log('Sending message to background:', message)
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message send failed:', chrome.runtime.lastError.message)
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          console.log('Message response:', response)
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
}

// 当页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  window.contextMePopup = new ContextMePopup()
})

// 不再需要全局函数，使用事件监听器