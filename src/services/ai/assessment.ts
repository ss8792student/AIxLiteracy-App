import { getAnthropicClient, AI_MODEL } from './client';
import { ReadingAssessment } from '../../types/models';

export async function assessReading(
  transcript: string,
  bookText: string,
  studentGrade: number
): Promise<ReadingAssessment> {
  const client = getAnthropicClient();

  const prompt = `You are an encouraging AI reading coach for a grade ${studentGrade} student.

The student was supposed to read this text:
<book_text>
${bookText.slice(0, 2000)}
</book_text>

The student's spoken transcript (captured via speech recognition) was:
<transcript>
${transcript}
</transcript>

Analyze their reading performance and respond ONLY with a valid JSON object in this exact format:
{
  "overallScore": <number 0-100>,
  "fluencyScore": <number 0-100>,
  "pronunciationScore": <number 0-100>,
  "vocabularyScore": <number 0-100>,
  "strengths": [<2-3 short encouraging strings>],
  "improvements": [<1-2 short actionable strings>],
  "wordsToReview": [<up to 5 words the student struggled with>],
  "encouragingMessage": <one warm, age-appropriate sentence praising their effort>
}

Rules:
- Always be encouraging, even if the score is low
- Strengths must always have at least 2 items
- wordsToReview should only include words clearly mispronounced or skipped
- encouragingMessage should be warm and specific to something they did well`;

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned invalid assessment format');

  return JSON.parse(jsonMatch[0]) as ReadingAssessment;
}

export function fallbackLocalAssessment(
  transcript: string,
  bookText: string
): ReadingAssessment {
  const bookWords = bookText.toLowerCase().match(/\b\w+\b/g) ?? [];
  const spokenWords = transcript.toLowerCase().match(/\b\w+\b/g) ?? [];

  const bookSet = new Set(bookWords);
  const matchedWords = spokenWords.filter((w) => bookSet.has(w));
  const accuracy = bookWords.length > 0
    ? Math.round((matchedWords.length / bookWords.length) * 100)
    : 50;

  const score = Math.min(100, Math.max(20, accuracy));

  return {
    overallScore: score,
    fluencyScore: score,
    pronunciationScore: score,
    vocabularyScore: score,
    strengths: ['You kept reading and trying your best!', 'Great effort today!'],
    improvements: ['Keep practicing — you are improving every day!'],
    wordsToReview: [],
    encouragingMessage: 'Amazing work reading today! Your full feedback will be ready soon.',
  };
}
