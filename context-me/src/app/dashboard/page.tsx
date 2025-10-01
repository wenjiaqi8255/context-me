"use client"

import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FaUser, FaCog, FaChartBar, FaSignOutAlt } from "react-icons/fa"

interface UserProfile {
  id?: string
  userId: string
  profileData: {
    name?: string
    email?: string
    background?: string
    interests: string[]
    goals: string[]
    skills: string[]
    preferences?: {
      language?: string
      insightStyle?: 'detailed' | 'concise' | 'actionable'
      aiEnabled?: boolean
    }
  }
  version: number
  createdAt: Date
  updatedAt: Date
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (status === "authenticated") {
      fetchProfile()
    }
  }, [status, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/auth-profile")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setProfile(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">ContextMe</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {session.user.avatar ? (
                  <Image
                    src={session.user.avatar}
                    alt={session.user.name || "User"}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {(session.user.name || session.user.email || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {session.user.name || session.user.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FaSignOutAlt />
                <span>退出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <FaUser className="text-blue-600" />
                <h2 className="text-lg font-semibold">用户档案</h2>
              </div>

              {profile?.profileData ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                    <p className="text-gray-900">{profile.profileData.name || "未设置"}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                    <p className="text-gray-900">{profile.profileData.email || session.user.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">兴趣</label>
                    <div className="flex flex-wrap gap-2">
                      {profile.profileData.interests.map((interest, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">目标</label>
                    <div className="flex flex-wrap gap-2">
                      {profile.profileData.goals.map((goal, index) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {goal}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AI功能</label>
                    <p className={`text-sm ${profile.profileData.preferences?.aiEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {profile.profileData.preferences?.aiEnabled ? '已启用' : '已禁用'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">暂无档案信息</p>
              )}
            </div>
          </div>

          {/* Stats Section */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FaChartBar className="text-green-600" />
                  <h2 className="text-lg font-semibold">使用统计</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">今日使用</span>
                    <span className="font-medium">0 次</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">总计使用</span>
                    <span className="font-medium">0 次</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">订阅状态</span>
                    <span className="font-medium text-green-600">免费版</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FaCog className="text-purple-600" />
                  <h2 className="text-lg font-semibold">快速操作</h2>
                </div>
                <div className="space-y-3">
                  <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    编辑档案
                  </button>
                  <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    查看使用日志
                  </button>
                  <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    升级订阅
                  </button>
                </div>
              </div>
            </div>

            {/* Extension Instructions */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">扩展使用指南</h2>
              <div className="space-y-3 text-sm text-gray-600">
                <p>1. 确保已安装 ContextMe Chrome 扩展</p>
                <p>2. 点击扩展图标打开设置页面</p>
                <p>3. 您的档案信息将自动同步到扩展</p>
                <p>4. 启用 AI 功能以获得个性化内容洞察</p>
                <p>5. 浏览网页时，扩展会自动分析内容并提供洞察</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}