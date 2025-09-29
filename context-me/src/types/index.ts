export interface UserProfile {
  id?: string
  userId: string
  profileData: ProfileData
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface ProfileData {
  name?: string
  email?: string
  background?: string
  interests: string[]
  goals: string[]
  skills: string[]
  preferences?: {
    language?: string
    insightStyle?: 'detailed' | 'concise' | 'actionable'
  }
}

export interface ContentSection {
  id: string
  type: string
  content: string
  element?: any
  position?: {
    top: number
    left: number
  }
}

export interface ContentAnalysis {
  id?: string
  contentHash: string
  url?: string
  title?: string
  contentType: 'course' | 'job' | 'product' | 'article' | 'other'
  sections?: ContentSection[]
  extractedData: {
    summary?: string
    keyPoints?: string[]
    tags?: string[]
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
  }
  createdAt: Date
}

export interface Insight {
  id: string
  userId: string
  contentHash: string
  sectionId?: string
  sectionType?: string
  insight: string
  relevanceScore: number
  category: 'opportunity' | 'recommendation' | 'warning' | 'information'
  actionItems?: string[]
  createdAt: Date
}

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  googleId?: string
  isActive: boolean
  stripeCustomerId?: string
  subscriptionStatus: 'free' | 'active' | 'cancelled' | 'past_due'
  subscriptionTier: 'basic' | 'pro' | 'enterprise'
  trialEndsAt?: Date
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  user: {
    id: string
    email: string
    name?: string
    avatar?: string
  }
  accessToken?: string
}

export interface UsageLog {
  id: string
  userId: string
  actionType: 'generate_insight' | 'view_content' | 'update_profile'
  contentHash?: string
  tokensUsed?: number
  costCents?: number
  metadata?: Record<string, any>
  createdAt: Date
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}