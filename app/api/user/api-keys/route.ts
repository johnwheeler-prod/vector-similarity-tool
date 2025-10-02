import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        googleApiKey: true,
        openaiApiKey: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Return whether keys exist (don't return actual keys)
    return NextResponse.json({
      hasGoogleKey: !!user.googleApiKey,
      hasOpenaiKey: !!user.openaiApiKey,
    })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { provider, apiKey } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 })
    }

    if (!['google', 'openai'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Validate API key format
    const isValidKey = validateApiKey(provider, apiKey)
    if (!isValidKey) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 })
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey)

    // Update user's API key
    const updateData = provider === 'google' 
      ? { googleApiKey: encryptedKey }
      : { openaiApiKey: encryptedKey }

    await prisma.user.upsert({
      where: { email: session.user.email },
      update: updateData,
      create: {
        email: session.user.email,
        name: session.user.name,
        ...updateData
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { provider } = await request.json()

    if (!provider || !['google', 'openai'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Remove the API key
    const updateData = provider === 'google' 
      ? { googleApiKey: null }
      : { openaiApiKey: null }

    await prisma.user.update({
      where: { email: session.user.email },
      data: updateData
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function validateApiKey(provider: string, apiKey: string): boolean {
  if (provider === 'google') {
    return /^AIza[0-9A-Za-z_-]{35}$/.test(apiKey)
  } else if (provider === 'openai') {
    return /^sk-[0-9A-Za-z_-]{20,200}$/.test(apiKey)
  }
  return false
}
