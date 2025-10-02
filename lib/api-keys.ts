import { prisma } from './prisma'
import { decrypt } from './encryption'

// Helper function to get decrypted API key for internal use
export async function getUserApiKey(email: string, provider: 'google' | 'openai'): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      googleApiKey: true,
      openaiApiKey: true,
    }
  })

  if (!user) return null

  const encryptedKey = provider === 'google' ? user.googleApiKey : user.openaiApiKey
  if (!encryptedKey) return null

  try {
    return decrypt(encryptedKey)
  } catch (error) {
    console.error('Error decrypting API key:', error)
    return null
  }
}
