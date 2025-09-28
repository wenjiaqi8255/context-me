import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { ApiResponse, UserProfile } from '@/types'
import { requireExtensionAuth } from '@/lib/extension-auth'

export async function GET(request: NextRequest) {
  try {
    const extUser = await requireExtensionAuth(request)

    const profile = await prisma.userProfile.findFirst({
      where: { userId: extUser.userId },
      orderBy: { version: 'desc' }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: profile
    })
  } catch (error) {
    console.error('Get extension profile error:', error)
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid authentication token'
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
    const extUser = await requireExtensionAuth(request)
    const { profileData } = await request.json()

    if (!profileData) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Profile data is required'
      }, { status: 400 })
    }

    // 获取最新版本号
    const latestProfile = await prisma.userProfile.findFirst({
      where: { userId: extUser.userId },
      orderBy: { version: 'desc' },
      select: { version: true }
    })

    const newVersion = (latestProfile?.version || 0) + 1

    // 创建新版本档案
    const newProfile = await prisma.userProfile.create({
      data: {
        userId: extUser.userId,
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
    console.error('Create extension profile error:', error)
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid authentication token'
      }, { status: 401 })
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: `Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}