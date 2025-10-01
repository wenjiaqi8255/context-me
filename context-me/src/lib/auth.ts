import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from "@/lib/db"

// 兼容 EdgeOne 和本地开发的环境变量
const nextAuthUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      if (user) {
        token.id = user.id
        token.picture = user.image || undefined
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.accessToken = token.accessToken as string
        session.user.avatar = token.picture as string | undefined
      }
      return session
    },
    async signIn({ user, account }) {
      if (!user.email) return false

      try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        })

        if (!existingUser) {
          // Create new user
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              avatar: user.image,
              googleId: account?.providerAccountId,
              accessToken: account?.access_token,
              refreshToken: account?.refresh_token,
              tokenExpiry: account?.expires_at ? new Date(account.expires_at * 1000) : null,
              lastLoginAt: new Date(),
            }
          })
        } else {
          // Update existing user
          await prisma.user.update({
            where: { email: user.email },
            data: {
              name: user.name,
              avatar: user.image,
              googleId: account?.providerAccountId,
              accessToken: account?.access_token,
              refreshToken: account?.refresh_token,
              tokenExpiry: account?.expires_at ? new Date(account.expires_at * 1000) : null,
              lastLoginAt: new Date(),
            }
          })
        }

        return true
      } catch (error) {
        console.error("Error in signIn callback:", error)
        return false
      }
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
}