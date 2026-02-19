export type NoteFormat = "cornell" | "bullet" | "flashcards";

/**
 * Generate prompt for Cornell Notes format
 */
export function getCornellNotesPrompt(transcript: string): string {
  return `You are an expert note-taking assistant. Convert the following lecture transcript into Cornell Notes format.

Cornell Notes Format Requirements:
- Left Column (Cues): Key questions, terms, concepts, or prompts
- Right Column (Notes): Detailed explanations, definitions, and information
- Summary Section: A concise summary at the bottom (2-3 sentences)

Format the output using markdown:
- Use "## Cues" and "## Notes" headers
- Use "### Summary" for the summary section
- Use tables or two-column layout if helpful
- Bold important terms

Transcript:
${transcript}

Generate the Cornell Notes:`;
}

/**
 * Generate prompt for Bullet Points format
 */
export function getBulletPointsPrompt(transcript: string): string {
  return `You are an expert note-taking assistant. Convert the following lecture transcript into well-organized bullet points.

Bullet Points Format Requirements:
- Use hierarchical structure with headers and sub-bullets
- Bold key terms and important concepts
- Use clear section headers (## Header)
- Organize information logically
- Include main points and supporting details

Format the output using markdown:
- Use ## for main sections
- Use ### for subsections
- Use - for bullet points
- Use **bold** for key terms
- Keep it scannable and easy to read

Transcript:
${transcript}

Generate the bullet point notes:`;
}

/**
 * Generate prompt for Flashcards format
 */
export function getFlashcardsPrompt(transcript: string): string {
  return `You are an expert note-taking assistant. Convert the following lecture transcript into flashcards.

Flashcards Format Requirements:
- Create 10-15 question and answer pairs
- Cover the most important concepts from the transcript
- Questions should be clear and test understanding
- Answers should be concise but complete
- Mix different types: definitions, concepts, examples

Format the output using markdown:
- Use "## Flashcard 1", "## Flashcard 2", etc. for each card
- Use **Q:** for questions
- Use **A:** for answers
- Keep each flashcard on a separate section

Transcript:
${transcript}

Generate the flashcards:`;
}

/**
 * Get the appropriate prompt based on format type
 */
export function getPrompt(format: NoteFormat, transcript: string): string {
  switch (format) {
    case "cornell":
      return getCornellNotesPrompt(transcript);
    case "bullet":
      return getBulletPointsPrompt(transcript);
    case "flashcards":
      return getFlashcardsPrompt(transcript);
    default:
      return getBulletPointsPrompt(transcript);
  }
}
