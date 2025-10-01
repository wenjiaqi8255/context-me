import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/db'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    console.log('🔐 [Auth] Verifying Google token for extension...')

    // 验证 Google OAuth token
    try {
      const oauth2Client = new google.auth.OAuth2()
      oauth2Client.setCredentials({ access_token: token })

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const { data: userInfo } = await oauth2.userinfo.get()

      console.log('✅ [Auth] Google token verified for:', userInfo.email)

      // 查找或创建用户
      let user = await prisma.user.findUnique({
        where: { email: userInfo.email || undefined }
      })

      if (!user) {
        console.log('👤 [Auth] Creating new user...')
        user = await prisma.user.create({
          data: {
            email: userInfo.email || '',
            name: userInfo.name || undefined,
            avatar: userInfo.picture || undefined,
            googleId: userInfo.id || undefined,
            isActive: true,
            lastLoginAt: new Date(),
          }
        })
        console.log('✅ [Auth] New user created:', user.id)
      } else {
        console.log('👤 [Auth] Updating existing user...')
        user = await prisma.user.update({
          where: { email: userInfo.email || undefined },
          data: {
            name: userInfo.name || undefined,
            avatar: userInfo.picture || undefined,
            googleId: userInfo.id || undefined,
            lastLoginAt: new Date(),
          }
        })
        console.log('✅ [Auth] User updated:', user.id)
      }

      // 生成应用内 JWT token
      const appToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          type: 'extension'
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      )

      console.log('🎫 [Auth] App token generated for user:', user.id)

      return NextResponse.json({
        success: true,
        data: {
          token: appToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar
          }
        }
      })

    } catch (googleError) {
      console.error('❌ [Auth] Google token verification failed:', googleError)
      return NextResponse.json(
        { success: false, error: 'Invalid Google token' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('❌ [Auth] Extension auth error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}