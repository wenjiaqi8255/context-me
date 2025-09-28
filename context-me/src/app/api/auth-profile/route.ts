import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { ApiResponse, UserProfile } from '@/types'
import { requireAuth } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const profile = await prisma.userProfile.findFirst({
      where: { userId: user.id },
      orderBy: { version: 'desc' }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: profile
    })
  } catch (error) {
    console.error('Get profile error:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch profile'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { profileData } = await request.json()

    if (!profileData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Profile data is required'
      }, { status: 400 })
    }

    // 获取最新版本号
    const latestProfile = await prisma.userProfile.findFirst({
      where: { userId: user.id },
      orderBy: { version: 'desc' },
      select: { version: true }
    })

    const newVersion = (latestProfile?.version || 0) + 1

    // 创建新版本档案
    const newProfile = await prisma.userProfile.create({
      data: {
        userId: user.id,
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
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: `Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { profileData, currentVersion } = await request.json()

    if (!profileData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Profile data is required'
      }, { status: 400 })
    }

    // 检查版本冲突
    const latestProfile = await prisma.userProfile.findFirst({
      where: { userId: user.id },
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
        userId: user.id,
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
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update profile'
    }, { status: 500 })
  }
}