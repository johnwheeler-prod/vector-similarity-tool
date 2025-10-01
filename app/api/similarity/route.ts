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
    
    // Provide more specific error messages for different error types
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        return NextResponse.json(
          { 
            error: 'API rate limit exceeded. The system will automatically retry and fall back to mock embeddings if needed.',
            details: 'Google AI API has rate limits. Please wait a moment and try again.'
          },
          { status: 429 }
        );
      }
      
      if (error.message.includes('quota') || error.message.includes('billing')) {
        return NextResponse.json(
          { 
            error: 'API quota exceeded',
            details: 'Please check your Google AI Studio billing and quota settings.'
          },
          { status: 402 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to calculate similarity',
        details: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    );
  }
}
