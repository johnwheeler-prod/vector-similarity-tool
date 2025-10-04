import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { EmbeddingService, findMostSimilar, EmbeddingProvider, EmbeddingModel } from '@/lib/embeddings'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Rate limiting
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const rateLimitResult = await rateLimit(user.id, 60) // 60 requests per minute
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          resetTime: rateLimitResult.resetTime,
          remaining: rateLimitResult.remaining
        }, 
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      )
    }

    // 3. Parse request
    const { 
      query, 
      passages, 
      topK = 5, 
      provider = 'google', 
      model = 'gemini-embedding-001' 
    } = await request.json()

    console.log('🔧 Secure API Route called')
    console.log('👤 User:', session.user.email)
    console.log('🔧 Provider:', provider)
    console.log('🔧 Model:', model)
    console.log('📝 Query:', query?.substring(0, 50) + '...')
    console.log('📄 Passages count:', passages?.length || 0)

    if (!query || !passages || !Array.isArray(passages)) {
      return NextResponse.json(
        { error: 'Query and passages array are required' },
        { status: 400 }
      )
    }

    // 4. Create embedding service with server-side API keys
    const service = new EmbeddingService(provider as EmbeddingProvider, model as EmbeddingModel)
    
    console.log('🔑 Using server-side API keys')

    // 5. Generate embeddings
    console.log('🚀 Starting embedding generation...')
    const startTime = Date.now()
    
    const [queryEmbedding, passageEmbeddings] = await Promise.all([
      service.generateEmbedding(query),
      service.generateEmbeddings(passages)
    ])

    const duration = Date.now() - startTime
    console.log(`✅ Embeddings generated in ${duration}ms`)
    console.log('📊 Query embedding dimensions:', queryEmbedding.length)
    console.log('📊 Passage embeddings count:', passageEmbeddings.length)

    // 6. Calculate similarity
    const results = findMostSimilar(queryEmbedding, passageEmbeddings, passages, topK)
    
    console.log('🎯 Similarity calculation complete')
    console.log('📊 Results count:', results.length)
    console.log('🔍 Real API used:', service.wasRealAPIUsed())

    // 7. Track usage
    const tokensUsed = estimateTokens(query, passages)
    const cost = estimateCost(provider, model, tokensUsed)
    
    await Promise.all([
      // Update user usage stats
      prisma.user.update({
        where: { id: user.id },
        data: {
          totalRequests: { increment: 1 },
          monthlyRequests: { increment: 1 },
          lastRequestAt: new Date()
        }
      }),
      // Log API usage
      prisma.apiUsage.create({
        data: {
          userId: user.id,
          provider,
          model,
          tokens: tokensUsed,
          cost
        }
      })
    ])
    
    return NextResponse.json({ 
      query,
      results,
      totalPassages: passages.length,
      usedRealAPI: service.wasRealAPIUsed(),
      provider: service.getProvider(),
      model: service.getModel(),
      usage: {
        tokens: tokensUsed,
        estimatedCost: cost,
        remaining: rateLimitResult.remaining
      }
    }, {
      headers: {
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
      }
    })
  } catch (error) {
    console.error('❌ Error calculating similarity:', error)
    return NextResponse.json(
      { error: 'Failed to calculate similarity' },
      { status: 500 }
    )
  }
}

function estimateTokens(query: string, passages: string[]): number {
  // Rough estimation: 1 token ≈ 4 characters
  const queryTokens = Math.ceil(query.length / 4)
  const passageTokens = passages.reduce((total, passage) => total + Math.ceil(passage.length / 4), 0)
  return queryTokens + passageTokens
}

function estimateCost(provider: string, model: string, tokens: number): number {
  // Cost estimation in USD
  if (provider === 'openai') {
    if (model === 'text-embedding-3-small') {
      return (tokens / 1000) * 0.00002 // $0.00002 per 1K tokens
    } else if (model === 'text-embedding-3-large') {
      return (tokens / 1000) * 0.00013 // $0.00013 per 1K tokens
    }
  } else if (provider === 'google') {
    // Google AI is currently free, but we'll estimate for future pricing
    return (tokens / 1000) * 0.0001 // Estimated $0.0001 per 1K tokens
  }
  return 0
}