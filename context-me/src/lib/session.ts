import { getServerSession } from "next-auth"
import { authOptions } from "./auth"

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  return session.user
}

export async function requireAuth() {
  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  return user
}