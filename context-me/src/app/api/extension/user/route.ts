import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { ApiResponse, User } from '@/types'
import { requireExtensionAuth } from '@/lib/extension-auth'

export async function GET(request: NextRequest) {
  try {
    const extUser = await requireExtensionAuth(request)

    const dbUser = await prisma.user.findUnique({
      where: { id: extUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isActive: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        trialEndsAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!dbUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: dbUser
    })
  } catch (error) {
    console.error('Get extension user error:', error)
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid authentication token'
      }, { status: 401 })
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch user'
    }, { status: 500 })
  }
}