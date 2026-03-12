export type NoteFormat = "cornell" | "bullet" | "flashcards" | "study-guide" | "flowchart" | "mindmap" | "diagrams";

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
 * Generate prompt for Study Guide format
 */
export function getStudyGuidePrompt(transcript: string): string {
  return `You are an expert educational content creator. Convert the following lecture transcript into a comprehensive study guide for test preparation.

Study Guide Format Requirements:

1. **Learning Objectives** (## Learning Objectives)
   - List 3-5 clear, measurable learning objectives
   - Use action verbs (understand, explain, analyze, apply, evaluate)
   - Focus on what students should master from this material

2. **Key Concepts** (## Key Concepts)
   - Define 5-10 important terms and concepts
   - Use bold for terms: **Term**: Definition
   - Organize by topic/category if appropriate
   - Include examples where helpful

3. **Content Review** (## Content Review)
   - Break down main topics with ### subsections
   - Include detailed explanations and examples
   - Highlight important formulas, processes, or frameworks
   - Use bullet points and clear organization

4. **Practice Questions** (## Practice Questions)
   - Create 8-12 questions of mixed types:
     * Multiple choice questions
     * Short answer questions
     * Application/scenario-based questions
   - Cover all major concepts from the transcript
   - Range from basic recall to higher-order thinking
   - Include answer key at the end

5. **Study Tips** (## Study Tips)
   - List 3-5 study strategies specific to this material
   - Highlight common misconceptions or errors to avoid
   - Provide mnemonics or memory aids where helpful
   - Suggest connections to prior knowledge

Format the output using markdown with clear section headers (##).
Use **bold** for emphasis and key terms.
Make it comprehensive and exam-focused.

Transcript:
${transcript}

Generate the study guide:`;
}

/**
 * Generate prompt for Flowchart format (Mermaid syntax)
 */
export function getFlowchartPrompt(transcript: string): string {
  return `You are an expert educator. Convert the following lecture transcript into a Mermaid flowchart.

CRITICAL SYNTAX RULE: Every node MUST have a unique alphanumeric ID placed BEFORE the shape brackets.
  CORRECT: A[Step One]   B(Rounded)   C{Decision?}   D((Circle))
  WRONG:   [Step One]    (Rounded)    {Decision?}    ((Circle))
Node IDs must be short alphanumeric strings with no spaces (e.g. A, B, step1, concept2).

Valid example:
graph TD
    start((Begin)) --> A[Main Concept]
    A --> B[Sub-Topic 1]
    A --> C[Sub-Topic 2]
    B --> D{Important?}
    D -->|Yes| E[Key Point]
    D -->|No| F[Minor Detail]
    subgraph Group1
        B
        C
    end

Requirements:
- First line must be exactly "graph TD"
- Every node needs a unique ID: A, B, C, node1, concept2, etc.
- Use [box] for concepts, (rounded) for processes, {diamond} for decisions, ((circle)) for start/end
- Use -->|label| for labeled edges
- Aim for 15-25 nodes
- Return ONLY raw Mermaid code, no code fences, no explanation

Transcript:
${transcript}

Generate the Mermaid flowchart code:`;
}

/**
 * Generate prompt for Mind Map format (Mermaid mindmap syntax)
 */
export function getMindMapPrompt(transcript: string): string {
  return `You are an expert educator. Convert the following lecture transcript into a Mermaid mind map that organizes all key concepts hierarchically around a central topic.

Requirements:
- Use Mermaid "mindmap" syntax
- The root node should be the main subject (e.g. root((Topic Name)))
- Create 4-7 main branches for the key themes
- Each branch should have 2-5 sub-items
- Keep node text concise (1-5 words)
- Go 3-4 levels deep where appropriate
- Return ONLY the raw Mermaid code, no markdown code fences, no explanation

Example structure:
mindmap
  root((Main Topic))
    Branch 1
      Subtopic A
      Subtopic B
    Branch 2
      Subtopic C

Transcript:
${transcript}

Generate the Mermaid mind map code:`;
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
    case "study-guide":
      return getStudyGuidePrompt(transcript);
    case "flowchart":
      return getFlowchartPrompt(transcript);
    case "mindmap":
      return getMindMapPrompt(transcript);
    default:
      return getBulletPointsPrompt(transcript);
  }
}

/**
 * Generate prompt for creating a quiz from notes
 */
export function getQuizPrompt(
  notes: string,
  count: number,
  attempt: number,
  mode: "multiple-choice" | "true-false" | "open-ended" | "mixed"
): string {
  const focusInstructions =
    attempt === 1
      ? "Cover the most foundational and important concepts broadly."
      : attempt === 2
      ? "Focus on details, nuances, and secondary concepts. Avoid obvious recall questions."
      : `This is attempt #${attempt}. Choose a completely different angle — test application, analysis, edge cases, or less obvious connections. Do not reuse questions from earlier attempts.`;

  const typeSchemas: Record<string, string> = {
    "multiple-choice": `Each question must have:
  "type": "multiple-choice", "options": ["A","B","C","D"] (exactly 4), "correctIndex": 0-3, "explanation": "..."`,

    "true-false": `Each question must have:
  "type": "true-false", "options": ["True","False"], "correctIndex": 0 or 1, "explanation": "..."`,

    "open-ended": `Each question must have:
  "type": "open-ended", "modelAnswer": "A thorough sample answer (2-4 sentences)", "explanation": "Key points the answer should include."`,

    mixed: `Distribute questions evenly across all three types. Each question must include a "type" field set to one of "multiple-choice", "true-false", or "open-ended".
- multiple-choice: "options": ["A","B","C","D"], "correctIndex": 0-3, "explanation": "..."
- true-false: "options": ["True","False"], "correctIndex": 0 or 1, "explanation": "..."
- open-ended: "modelAnswer": "...", "explanation": "Key points to include."`,
  };

  return `You are an expert educator creating a quiz based on the following study notes.

Notes:
${notes}

Generate exactly ${count} ${mode === "mixed" ? "mixed-type" : mode} quiz questions. Return ONLY a valid JSON object:
{
  "questions": [
    {
      "id": 1,
      "type": "...",
      "question": "Question text here?"
    }
  ]
}

Question type schema:
${typeSchemas[mode]}

Requirements:
- Exactly ${count} questions
- ${focusInstructions}
- Mix difficulty: recall, understanding, and application
- Return ONLY the JSON, no other text`;
}

/**
 * Generate prompt for converting notes from one format to Study Guide
 */
export function getConversionPrompt(
  fromFormat: NoteFormat,
  notes: string
): string {
  const formatDescriptions: Record<NoteFormat, string> = {
    cornell: "Cornell Notes format with Cues, Notes, and Summary sections",
    bullet: "Bullet Points format with hierarchical structure",
    flashcards: "Flashcards format with Question and Answer pairs",
    "study-guide": "Study Guide format",
    flowchart: "Flowchart diagram (Mermaid syntax)",
    mindmap: "Mind Map diagram (Mermaid syntax)",
    diagrams: "Flowchart and Mind Map diagrams (Mermaid syntax)",
  };

  return `You are an expert educational content converter. You will convert notes from ${formatDescriptions[fromFormat]} to Study Guide format.

Source notes in ${formatDescriptions[fromFormat]}:
${notes}

Transform these notes into a comprehensive Study Guide format with the following structure:

**## Learning Objectives**
- List 3-5 clear, measurable learning objectives
- Use action verbs (understand, explain, analyze, apply, evaluate)
- Focus on what students should master from this material

**## Key Concepts**
- Define 5-10 important terms and concepts
- Use bold for terms: **Term**: Definition
- Organize by topic/category if appropriate
- Include examples where helpful

**## Content Review**
- Break down main topics with ### subsections
- Include detailed explanations and examples
- Highlight important formulas, processes, or frameworks
- Use bullet points and clear organization

**## Practice Questions**
- Create 8-12 questions of mixed types:
  * Multiple choice questions
  * Short answer questions
  * Application/scenario-based questions
- Cover all major concepts from the notes
- Range from basic recall to higher-order thinking
- Include answer key at the end

**## Study Tips**
- List 3-5 study strategies specific to this material
- Highlight common misconceptions or errors to avoid
- Provide mnemonics or memory aids where helpful
- Suggest connections to prior knowledge

IMPORTANT:
- Preserve ALL educational content from the source notes
- Reorganize information intelligently for test preparation
- Do not simply copy-paste; transform the structure while keeping the substance
- Ensure the output is comprehensive and exam-focused

Generate the Study Guide:`;
}
