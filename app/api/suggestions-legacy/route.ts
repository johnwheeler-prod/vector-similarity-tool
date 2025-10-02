import { NextRequest, NextResponse } from 'next/server';
import { EmbeddingService, EmbeddingProvider, EmbeddingModel } from '@/lib/embeddings';

// Legacy route for backward compatibility - no authentication required
export async function POST(request: NextRequest) {
  try {
    const { 
      text, 
      query, 
      apiKey, 
      provider = 'google', 
      model = 'gemini-embedding-001' 
    } = await request.json();

    console.log('🔧 Legacy Suggestions API Route called');
    console.log('🔧 Provider:', provider);
    console.log('🔧 Model:', model);
    console.log('🔑 API Key received:', !!apiKey);

    if (!text || !query) {
      return NextResponse.json(
        { error: 'Both text and query are required' },
        { status: 400 }
      );
    }

    // Create embedding service with client-provided API key if available
    const service = apiKey ? 
      new EmbeddingService(provider as EmbeddingProvider, model as EmbeddingModel, apiKey) : 
      new EmbeddingService(provider as EmbeddingProvider, model as EmbeddingModel);
    
    console.log('🔧 Using service:', apiKey ? `Client-provided ${provider.toUpperCase()} API key` : 'Default service');
    
    // Generate token suggestions for improving semantic similarity
    const suggestions = service.generateTokenSuggestions(text, query);

    return NextResponse.json({
      text,
      query,
      suggestions,
      totalSuggestions: suggestions.length,
      provider: service.getProvider(),
      model: service.getModel()
    });
  } catch (error) {
    console.error('❌ Error generating token suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate token suggestions' },
      { status: 500 }
    );
  }
}
