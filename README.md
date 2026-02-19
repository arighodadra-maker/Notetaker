# NotesAI

A minimal AI-powered note-taking web app that transforms lecture transcripts into structured notes using OpenAI's GPT-4o-mini.

## Features

- Convert transcripts to three formats:
  - **Bullet Points**: Hierarchical structure with headers and bullets
  - **Cornell Notes**: Two-column format with cues and notes
  - **Flashcards**: Q&A pairs for studying
- Clean, minimal UI with responsive design
- Copy to clipboard functionality
- Real-time loading states and error handling

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API (gpt-4o-mini)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This app is ready to deploy on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add your `OPENAI_API_KEY` in Vercel's environment variables
4. Deploy!

## Project Structure

```
/app
  - page.tsx (main page)
  - layout.tsx
  - globals.css
  /api
    /format
      - route.ts (API endpoint)
/lib
  - prompts.ts (prompt templates)
```
