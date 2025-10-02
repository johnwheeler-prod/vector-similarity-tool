import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService, findMostSimilar, EmbeddingProvider, EmbeddingModel } from '@/lib/embeddings';

// Legacy route for backward compatibility - no authentication required
// This allows the app to work without requiring users to sign in
export async function POST(request: NextRequest) {
  try {
    const { 
      query, 
      passages, 
      topK = 5, 
      apiKey, 
      provider = 'google', 
      model = 'gemini-embedding-001' 
    } = await request.json();

    console.log('🔧 Legacy API Route called');
    console.log('🔧 Provider:', provider);
    console.log('🔧 Model:', model);
    console.log('🔑 API Key received:', !!apiKey);
    console.log('🔑 API Key length:', apiKey?.length || 0);
    console.log('🔑 API Key preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');

    if (!query || !passages || !Array.isArray(passages)) {
      return NextResponse.json(
        { error: 'Query and passages array are required' },
        { status: 400 }
      );
    }

    // Create embedding service with client-provided API key if available
    const service = apiKey ? 
      new EmbeddingService(provider as EmbeddingProvider, model as EmbeddingModel, apiKey) : 
      new EmbeddingService(provider as EmbeddingProvider, model as EmbeddingModel);
    
    console.log('🔧 Using service:', apiKey ? `Client-provided ${provider.toUpperCase()} API key` : 'Default service');

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
      usedRealAPI: service.wasRealAPIUsed(),
      provider: service.getProvider(),
      model: service.getModel()
    });
  } catch (error) {
    console.error('❌ Error calculating similarity:', error);
    return NextResponse.json(
      { error: 'Failed to calculate similarity' },
      { status: 500 }
    );
  }
}
