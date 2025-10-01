# Vector Similarity Tool

A proof of concept tool for comparing passages from articles to queries using cosine similarity in multidimensional vector space. Built with Next.js, TypeScript, and Google's EmbeddingGemma model.

## Features

- **Vector Embeddings**: Uses Google's EmbeddingGemma model for generating text embeddings
- **Cosine Similarity**: Calculates semantic similarity between queries and passages
- **Modern UI**: Clean, Apple-inspired interface built with Tailwind CSS
- **Real-time Results**: Instant similarity calculations with ranked results
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

3. Get your Google AI Studio API key:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key" 
   - Copy the generated API key

4. Create environment file:
```bash
# Create .env.local file in the project root
touch .env.local
```

5. Add your Google AI API key to `.env.local`:
```bash
# Google AI Studio API Key
GOOGLE_API_KEY=your_actual_api_key_here
```

**Important**: Replace `your_actual_api_key_here` with the API key you copied from Google AI Studio.

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

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