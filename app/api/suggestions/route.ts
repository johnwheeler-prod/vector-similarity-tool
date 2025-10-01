import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService } from '@/lib/embeddings';

const embeddingService = new EmbeddingService();

export async function POST(request: NextRequest) {
  try {
    const { text, query, apiKey } = await request.json();

    console.log('🔧 Suggestions API Route called');
    console.log('🔑 API Key received:', !!apiKey);
    console.log('🔑 API Key length:', apiKey?.length || 0);
    console.log('📝 Text:', text?.substring(0, 50) + '...');
    console.log('🔍 Query:', query?.substring(0, 50) + '...');

    if (!text || !query) {
      return NextResponse.json(
        { error: 'Both text and query are required' },
        { status: 400 }
      );
    }

    // Create embedding service with client-provided API key if available
    const service = apiKey ? new EmbeddingService(apiKey) : embeddingService;
    
    console.log('🔧 Using service:', apiKey ? 'Client-provided API key' : 'Default service');
    
    // Generate token suggestions for improving semantic similarity
    const suggestions = service.generateTokenSuggestions(text, query);

    console.log('✅ Token suggestions generated');
    console.log('📊 Suggestions count:', suggestions.length);

    return NextResponse.json({
      text,
      query,
      suggestions,
      totalSuggestions: suggestions.length
    });
  } catch (error) {
    console.error('❌ Error generating token suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate token suggestions' },
      { status: 500 }
    );
  }
}