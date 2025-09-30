import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService } from '@/lib/embeddings';

const embeddingService = new EmbeddingService();

export async function POST(request: NextRequest) {
  try {
    const { texts } = await request.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: 'Texts array is required' },
        { status: 400 }
      );
    }

    const embeddings = await embeddingService.generateEmbeddings(texts);
    
    return NextResponse.json({ embeddings });
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return NextResponse.json(
      { error: 'Failed to generate embeddings' },
      { status: 500 }
    );
  }
}
