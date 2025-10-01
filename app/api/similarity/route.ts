import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService, findMostSimilar } from '@/lib/embeddings';

const embeddingService = new EmbeddingService();

export async function POST(request: NextRequest) {
  try {
    const { query, passages, topK = 5, apiKey } = await request.json();

    console.log('🔧 API Route called');
    console.log('🔑 API Key received:', !!apiKey);
    console.log('🔑 API Key length:', apiKey?.length || 0);
    console.log('🔑 API Key preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');
    console.log('📝 Query:', query?.substring(0, 50) + '...');
    console.log('📄 Passages count:', passages?.length || 0);

    if (!query || !passages || !Array.isArray(passages)) {
      return NextResponse.json(
        { error: 'Query and passages array are required' },
        { status: 400 }
      );
    }

    // Create embedding service with client-provided API key if available
    const service = apiKey ? new EmbeddingService(apiKey) : embeddingService;
    
    console.log('🔧 Using service:', apiKey ? 'Client-provided API key' : 'Default service');

    // Generate embeddings for query and passages
    console.log('🚀 Starting embedding generation...');
    const [queryEmbedding, passageEmbeddings] = await Promise.all([
      service.generateEmbedding(query),
      service.generateEmbeddings(passages)
    ]);

    console.log('✅ Embeddings generated successfully');
    console.log('📊 Query embedding dimensions:', queryEmbedding.length);
    console.log('📊 Passage embeddings count:', passageEmbeddings.length);

    // Find most similar passages
    const results = findMostSimilar(queryEmbedding, passageEmbeddings, passages, topK);
    
    console.log('🎯 Similarity calculation complete');
    console.log('📊 Results count:', results.length);
    console.log('🔍 Real API used:', service.wasRealAPIUsed());
    
    return NextResponse.json({ 
      query,
      results,
      totalPassages: passages.length,
      usedRealAPI: service.wasRealAPIUsed()
    });
  } catch (error) {
    console.error('❌ Error calculating similarity:', error);
    return NextResponse.json(
      { error: 'Failed to calculate similarity' },
      { status: 500 }
    );
  }
}