import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService } from '@/lib/embeddings';

const embeddingService = new EmbeddingService();

export async function POST(request: NextRequest) {
  try {
    const { text, query } = await request.json();

    if (!text || !query) {
      return NextResponse.json(
        { error: 'Both text and query are required' },
        { status: 400 }
      );
    }

    // Generate token suggestions for improving semantic similarity
    const suggestions = embeddingService.generateTokenSuggestions(text, query);

    return NextResponse.json({
      text,
      query,
      suggestions,
      totalSuggestions: suggestions.length
    });
  } catch (error) {
    console.error('Error generating token suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate token suggestions' },
      { status: 500 }
    );
  }
}
