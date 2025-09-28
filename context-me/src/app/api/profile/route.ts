import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { ApiResponse, UserProfile } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    const profile = await prisma.userProfile.findFirst({
      where: { userId },
      orderBy: { version: 'desc' }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: profile
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch profile'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, profileData } = body

    if (!userId || !profileData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User ID and profile data are required'
      }, { status: 400 })
    }

    // 确保用户存在
    let user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      // 创建新用户
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@temp.local` // 临时邮箱
        }
      })
      }

    // 获取最新版本号
    const latestProfile = await prisma.userProfile.findFirst({
      where: { userId },
      orderBy: { version: 'desc' },
      select: { version: true }
    })

    const newVersion = (latestProfile?.version || 0) + 1

    // 创建新版本档案
    const newProfile = await prisma.userProfile.create({
      data: {
        userId,
        profileData,
        version: newVersion
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: newProfile,
      message: 'Profile created successfully'
    })
    } catch (error) {
      console.error('Create profile error:', error)
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, profileData, currentVersion } = body

    if (!userId || !profileData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User ID and profile data are required'
      }, { status: 400 })
    }

    // 检查版本冲突
    const latestProfile = await prisma.userProfile.findFirst({
      where: { userId },
      orderBy: { version: 'desc' }
    })

    if (currentVersion && latestProfile && latestProfile.version !== currentVersion) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Profile version conflict. Please refresh and try again.'
      }, { status: 409 })
    }

    const newVersion = (latestProfile?.version || 0) + 1

    // 创建新版本
    const updatedProfile = await prisma.userProfile.create({
      data: {
        userId,
        profileData,
        version: newVersion
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update profile'
    }, { status: 500 })
  }
}