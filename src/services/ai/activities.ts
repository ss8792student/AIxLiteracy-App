import { getAnthropicClient, AI_MODEL } from './client';
import { Activity, ReadingAssessment, ActivityType } from '../../types/models';
import { randomUUID } from 'expo-crypto';

export async function generateActivities(
  bookText: string,
  assessment: ReadingAssessment,
  studentGrade: number
): Promise<Activity[]> {
  const client = getAnthropicClient();

  const prompt = `You are creating reading practice activities for a grade ${studentGrade} student.

Book excerpt:
<text>
${bookText.slice(0, 1500)}
</text>

Words the student struggled with: ${assessment.wordsToReview.join(', ') || 'none'}
Overall score: ${assessment.overallScore}/100

Generate exactly 4 practice activities as a JSON array. Use a mix of types: multiple_choice, fill_blank, vocab_match.
Each activity must follow this format:
{
  "type": "multiple_choice" | "fill_blank" | "vocab_match",
  "question": <string>,
  "options": [<4 strings for multiple_choice, null otherwise>],
  "correctAnswer": <string or array of strings>,
  "hint": <optional short hint string>,
  "targetWord": <optional word this activity focuses on>
}

Rules:
- Questions must be answerable from the text
- Wrong answer options must be plausible but clearly incorrect
- Difficulty should match grade ${studentGrade}
- At least one activity should focus on a word from wordsToReview if any exist
- Respond ONLY with the JSON array, no other text`;

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI returned invalid activities format');

  const raw = JSON.parse(jsonMatch[0]) as Omit<Activity, 'id'>[];
  return raw.map((a) => ({ ...a, id: randomUUID() }));
}

export function fallbackActivities(
  bookText: string,
  assessment: ReadingAssessment
): Activity[] {
  const words = assessment.wordsToReview.slice(0, 3);
  const sentences = bookText
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 3);

  const activities: Activity[] = [];

  if (sentences[0]) {
    activities.push({
      id: randomUUID(),
      type: 'multiple_choice' as ActivityType,
      question: `What does this sentence describe? "${sentences[0].slice(0, 80)}..."`,
      options: ['A character', 'A place', 'An action', 'A feeling'],
      correctAnswer: 'A character',
      hint: 'Think about who or what the sentence is about.',
    });
  }

  words.forEach((word) => {
    activities.push({
      id: randomUUID(),
      type: 'fill_blank' as ActivityType,
      question: `The word "${word}" means something important. Can you use it in a sentence?`,
      options: undefined,
      correctAnswer: word,
      targetWord: word,
    });
  });

  if (sentences[1]) {
    activities.push({
      id: randomUUID(),
      type: 'multiple_choice' as ActivityType,
      question: 'What happened in the story?',
      options: [sentences[0]?.slice(0, 40) ?? 'Option A', sentences[1]?.slice(0, 40) ?? 'Option B', 'Something completely different', 'Nothing happened'],
      correctAnswer: sentences[0]?.slice(0, 40) ?? 'Option A',
    });
  }

  return activities.slice(0, 4);
}
