# Vector Similarity Tool

A proof of concept tool for comparing passages from articles to queries using cosine similarity in multidimensional vector space. Built with Next.js, TypeScript, and Google's EmbeddingGemma model.

## Features

- **Vector Embeddings**: Uses Google's EmbeddingGemma model for generating text embeddings
- **Cosine Similarity**: Calculates semantic similarity between queries and passages
- **Client-Side API Keys**: Users can provide their own API keys for cost control
- **Mock Embeddings**: N-gram hash embeddings for development without API costs
- **Modern UI**: Clean, Apple-inspired interface built with Tailwind CSS
- **Real-time Results**: Instant similarity calculations with ranked results
- **Token Analysis**: Advanced tokenization with similarity highlighting
- **Token Suggestions**: AI-powered suggestions for improving passage similarity
- **Dark Mode**: Automatic system-based theme switching
- **Security-First**: API keys stored locally, never sent to our servers
- **TypeScript**: Full type safety throughout the application

## Getting Started

### Prerequisites

- Node.js 18+ 
- Google AI API key (free from [Google AI Studio](https://aistudio.google.com/app/apikey))

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd vector-similarity-tool
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
touch .env.local
```

4. Add your Google API key to `.env.local`:
```
GOOGLE_API_KEY=your_google_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Security & Privacy

### API Key Security
- **Local Storage Only**: API keys are stored exclusively in your browser's localStorage
- **No Server Storage**: Your API keys are never sent to or stored on our servers
- **Client-Side Processing**: API calls are made directly from your browser to Google's servers
- **Automatic Cleanup**: Clear your browser data to remove stored API keys

### Privacy Protection
- **No Data Collection**: We don't collect, store, or analyze your queries or passages
- **Direct API Access**: All embedding requests go directly to Google AI Studio
- **Transparent Processing**: Open source code allows full audit of data handling

## Alternative APIs

While Google AI Studio is free and easy to use, here are other embedding APIs you can use:

### 1. **OpenAI Embeddings** (Recommended for Production)
- **Cost**: $0.0001 per 1K tokens
- **Quality**: Excellent semantic understanding
- **Setup**: Replace Google AI with OpenAI API
- **Rate Limits**: 3,000 RPM, 500,000 TPM

### 2. **Cohere Embed** 
- **Cost**: $0.10 per 1M tokens
- **Quality**: Great for multilingual content
- **Setup**: Easy API integration
- **Rate Limits**: 1,000 requests/minute

### 3. **Hugging Face Inference API**
- **Cost**: Free tier available, then pay-per-use
- **Quality**: Multiple model options
- **Setup**: Simple REST API
- **Rate Limits**: Varies by plan

### 4. **Azure OpenAI**
- **Cost**: Similar to OpenAI
- **Quality**: Enterprise-grade reliability
- **Setup**: Azure integration required
- **Rate Limits**: Based on Azure tier

## Usage

1. **Enter a Query**: Type your search query in the first text area
2. **Add Passages**: Enter article passages (one per line) in the second text area
3. **Calculate Similarity**: Click "Find Similar Passages" to get ranked results
4. **View Results**: See the most similar passages ranked by similarity score

## How It Works

1. **Text Processing**: Both query and passages are processed to generate vector embeddings
2. **Vector Generation**: Uses Google's EmbeddingGemma model to create 768-dimensional vectors
3. **Similarity Calculation**: Computes cosine similarity between query and each passage vector
4. **Ranking**: Results are ranked by similarity score (0-100%)

## Cost Considerations

- **EmbeddingGemma**: Completely free for local/API usage
- **Google AI API**: Free tier available, very affordable for testing
- **No Mixedbread costs**: This implementation uses Google's free model

## Architecture

```
├── app/
│   ├── api/
│   │   ├── embeddings/route.ts    # Generate embeddings
│   │   └── similarity/route.ts    # Calculate similarity
│   └── page.tsx                   # Main UI component
├── lib/
│   └── embeddings.ts              # Core embedding logic
├── types/
│   └── index.ts                   # TypeScript definitions
└── README.md
```

## Alternative Models

This tool can be easily adapted to use other embedding models:

- **Mixedbread**: Replace the embedding service with Mixedbread API
- **OpenAI**: Use OpenAI's text-embedding-ada-002 model
- **Local Models**: Run embedding models locally for complete privacy

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## License

MIT License - feel free to use this code for your own projects!