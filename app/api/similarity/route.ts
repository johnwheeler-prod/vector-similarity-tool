import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService, findMostSimilar } from '@/lib/embeddings';

const embeddingService = new EmbeddingService();

export async function POST(request: NextRequest) {
  try {
    const { query, passages, topK = 5 } = await request.json();

    if (!query || !passages || !Array.isArray(passages)) {
      return NextResponse.json(
        { error: 'Query and passages array are required' },
        { status: 400 }
      );
    }

    // Generate embeddings for query and passages
    const [queryEmbedding, passageEmbeddings] = await Promise.all([
      embeddingService.generateEmbedding(query),
      embeddingService.generateEmbeddings(passages)
    ]);

    // Find most similar passages
    const results = findMostSimilar(queryEmbedding, passageEmbeddings, topK);
    
    return NextResponse.json({ 
      query,
      results,
      totalPassages: passages.length
    });
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return NextResponse.json(
      { error: 'Failed to calculate similarity' },
      { status: 500 }
    );
  }
}
