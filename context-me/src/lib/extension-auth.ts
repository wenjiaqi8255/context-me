import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import prisma from '@/lib/db'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export interface ExtensionUser {
  userId: string
  email: string
}

export async function validateExtensionToken(request: NextRequest): Promise<ExtensionUser | null> {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)

    const decoded = jwt.verify(token, JWT_SECRET) as any

    if (decoded.type !== 'extension') {
      return null
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, isActive: true }
    })

    if (!user || !user.isActive) {
      return null
    }

    return {
      userId: user.id,
      email: user.email
    }
  } catch (error) {
    console.error('Token validation error:', error)
    return null
  }
}

export async function requireExtensionAuth(request: NextRequest): Promise<ExtensionUser> {
  const user = await validateExtensionToken(request)

  if (!user) {
    throw new Error('Invalid or expired extension token')
  }

  return user
}