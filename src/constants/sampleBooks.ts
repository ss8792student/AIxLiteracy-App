import { Book, BookPage } from '../types/models';

export const SAMPLE_BOOKS: Book[] = [
  {
    id: 'book-1',
    title: 'The Brave Little Seed',
    author: 'Maya Rivers',
    readingLevel: 2,
    language: 'en',
    estimatedMinutes: 5,
    isDownloaded: true,
    isAssigned: false,
    wordCount: 180,
  },
  {
    id: 'book-2',
    title: 'A Day at the Ocean',
    author: 'Carlos Vega',
    readingLevel: 3,
    language: 'en',
    estimatedMinutes: 8,
    isDownloaded: true,
    isAssigned: true,
    assignedBy: 'teacher-1',
    wordCount: 320,
  },
  {
    id: 'book-3',
    title: 'My Robot Friend',
    author: 'Aisha Patel',
    readingLevel: 4,
    language: 'en',
    estimatedMinutes: 10,
    isDownloaded: true,
    isAssigned: false,
    wordCount: 450,
  },
  {
    id: 'book-4',
    title: 'The Mountain Adventure',
    author: 'Lena Johansson',
    readingLevel: 5,
    language: 'en',
    estimatedMinutes: 12,
    isDownloaded: true,
    isAssigned: false,
    wordCount: 580,
  },
];

export const SAMPLE_PAGES: Record<string, BookPage[]> = {
  'book-1': [
    {
      pageNumber: 1,
      text: 'Once upon a time, a tiny seed fell from a tall tree. The seed landed on soft brown earth near a stream. "I am so small," said the seed. "How will I ever grow big and strong?"',
    },
    {
      pageNumber: 2,
      text: 'The rain came down and watered the seed. The warm sun shone every morning. Slowly, a little green sprout pushed through the dirt. "Look at me!" said the sprout. "I am growing!"',
    },
    {
      pageNumber: 3,
      text: 'Days passed and the sprout grew taller. Leaves opened up toward the sunshine. Birds sang in the branches. The little seed had become a beautiful young tree.',
    },
  ],
  'book-2': [
    {
      pageNumber: 1,
      text: 'One sunny morning, Sofia and her grandfather walked to the beach. The sand was warm under their feet. Seagulls flew overhead and called out to each other. "Grandpa, look at the waves!" said Sofia.',
    },
    {
      pageNumber: 2,
      text: 'Grandfather smiled. "The ocean is very old," he said. "It has been here longer than any of us." Sofia ran to the water\'s edge. The cool waves splashed over her toes and she laughed with joy.',
    },
    {
      pageNumber: 3,
      text: 'They found colorful shells in the sand. Sofia picked up a pink spiral shell and held it to her ear. She could hear a soft rushing sound. "Grandpa, I can hear the ocean in the shell!"',
    },
  ],
  'book-3': [
    {
      pageNumber: 1,
      text: 'Marco got a robot for his birthday. The robot had bright blue eyes and silver arms. "My name is Zip," said the robot in a friendly voice. "I am happy to meet you, Marco."',
    },
    {
      pageNumber: 2,
      text: 'Zip could do many things. It could help Marco find his lost toys. It could remind him to brush his teeth. Best of all, Zip could tell the funniest jokes. Marco laughed every single day.',
    },
    {
      pageNumber: 3,
      text: 'One day, Marco\'s friend Priya came to visit. She was nervous about the robot at first. But Zip bowed politely and said, "Hello, Priya. Marco talks about you all the time!" Priya smiled and reached out her hand.',
    },
  ],
  'book-4': [
    {
      pageNumber: 1,
      text: 'Elena had always dreamed of climbing the great mountain behind her village. Every morning she watched the sun rise above its snowy peak. "This summer," she promised herself, "I will reach the top."',
    },
    {
      pageNumber: 2,
      text: 'She trained hard every day, running up the steep paths behind her home. Her legs grew strong. Her breathing became steady and deep. Her grandmother gave her a red woolen scarf for good luck.',
    },
    {
      pageNumber: 3,
      text: 'On the morning of the climb, thick clouds hung low over the mountain. Elena\'s heart beat fast. She tied her red scarf around her neck, took a deep breath, and took her first step up the rocky trail.',
    },
  ],
};
