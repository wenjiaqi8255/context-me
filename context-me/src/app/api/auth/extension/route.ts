import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/db'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isActive: true
      }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    if (!user.isActive) {
      return NextResponse.json({
        success: false,
        error: 'User account is inactive'
      }, { status: 403 })
    }

    // Generate JWT token valid for 30 days
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        type: 'extension'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar
        }
      }
    })

  } catch (error) {
    console.error('Extension auth error:', error)
    return NextResponse.json({
      success: false,
      error: 'Authentication failed'
    }, { status: 500 })
  }
}