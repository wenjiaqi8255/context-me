import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { ApiResponse, User } from '@/types'
import { requireAuth } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
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
    console.error('Get user error:', error)
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch user'
    }, { status: 500 })
  }
}