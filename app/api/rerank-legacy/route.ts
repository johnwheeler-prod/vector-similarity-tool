import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService, EmbeddingProvider, EmbeddingModel } from '@/lib/embeddings';
import { RerankingService, RerankProvider, RerankModel } from '@/lib/reranking';

// Legacy route for backward compatibility - no authentication required
// This allows the app to work without requiring users to sign in
export async function POST(request: NextRequest) {
  try {
    const { 
      query, 
      passages, 
      provider = 'google', 
      model = 'gemini-embedding-001',
      rerankProvider = 'mock',
      rerankModel = 'cross-encoder-ms-marco-MiniLM-L-6-v2'
    } = await request.json();

    console.log('🔧 Legacy Rerank API Route called');
    console.log('🔧 Provider:', provider);
    console.log('🔧 Model:', model);
    console.log('📝 Query:', query.substring(0, 50) + '...');
    console.log('📄 Passages count:', passages.length);

    if (!query || !passages || !Array.isArray(passages)) {
      return NextResponse.json(
        { error: 'Query and passages array are required' },
        { status: 400 }
      );
    }

    // Create embedding service with server-side API keys
    const service = new EmbeddingService(provider as EmbeddingProvider, model as EmbeddingModel);
    
    console.log('🔧 Using service: Server-side API keys');

    // Generate embeddings for query and passages to get embedding scores
    console.log('🔄 Starting reranking process...');
    
    const [queryEmbedding, passageEmbeddings] = await Promise.all([
      service.generateEmbedding(query),
      service.generateEmbeddings(passages)
    ]);

    // Calculate embedding similarities
    const embeddingScores = passageEmbeddings.map(passageEmbedding => 
      calculateCosineSimilarity(queryEmbedding, passageEmbedding)
    );

    // Create reranking service with server-side API keys
    const rerankingService = new RerankingService(
      rerankProvider as RerankProvider,
      rerankModel as RerankModel
    );

    // Perform reranking
    const similarities = await rerankingService.rerankPassages(query, passages, embeddingScores);

    console.log('✅ Reranking complete');
    console.log('📊 Results count:', similarities.length);
    console.log('🔍 Embedding API used:', service.wasRealAPIUsed());
    console.log('🔍 Rerank API used:', rerankingService.wasRealAPIUsed());
    
    return NextResponse.json({
      query,
      results: similarities,
      totalPassages: passages.length,
      embeddingProvider: service.getProvider(),
      rerankProvider: rerankingService.getProvider(),
      rerankModel: rerankingService.getModel(),
      usedRealAPI: service.wasRealAPIUsed() || rerankingService.wasRealAPIUsed()
    });
  } catch (error) {
    console.error('❌ Error in reranking:', error);
    return NextResponse.json(
      { error: 'Failed to rerank passages' },
      { status: 500 }
    );
  }
}

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}
