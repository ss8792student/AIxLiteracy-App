import { BadgeType } from '../types/models';

export interface BadgeDefinition {
  type: BadgeType;
  label: string;
  description: string;
  emoji: string;
}

export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
  first_book: {
    type: 'first_book',
    label: 'First Book',
    description: 'Completed your very first book!',
    emoji: '📖',
  },
  five_books: {
    type: 'five_books',
    label: 'Bookworm',
    description: 'Completed 5 books!',
    emoji: '📚',
  },
  ten_books: {
    type: 'ten_books',
    label: 'Story Explorer',
    description: 'Completed 10 books!',
    emoji: '🗺️',
  },
  streak_3: {
    type: 'streak_3',
    label: '3-Day Streak',
    description: 'Read 3 days in a row!',
    emoji: '🔥',
  },
  streak_7: {
    type: 'streak_7',
    label: 'Week Reader',
    description: 'Read every day for a week!',
    emoji: '⭐',
  },
  streak_30: {
    type: 'streak_30',
    label: 'Reading Champion',
    description: 'Read every day for a month!',
    emoji: '🏆',
  },
  words_100: {
    type: 'words_100',
    label: 'Word Collector',
    description: 'Read 100 words!',
    emoji: '🔤',
  },
  words_500: {
    type: 'words_500',
    label: 'Word Explorer',
    description: 'Read 500 words!',
    emoji: '✨',
  },
  words_1000: {
    type: 'words_1000',
    label: 'Word Master',
    description: 'Read 1,000 words!',
    emoji: '🌟',
  },
  minutes_60: {
    type: 'minutes_60',
    label: '1 Hour Reader',
    description: 'Read for a total of 60 minutes!',
    emoji: '⏱️',
  },
  minutes_300: {
    type: 'minutes_300',
    label: 'Reading Devotee',
    description: 'Read for a total of 5 hours!',
    emoji: '🎯',
  },
  fluency_level_2: {
    type: 'fluency_level_2',
    label: 'Fluency Grower',
    description: 'Reached Fluency Level 2!',
    emoji: '🌱',
  },
  fluency_level_3: {
    type: 'fluency_level_3',
    label: 'Fluency Builder',
    description: 'Reached Fluency Level 3!',
    emoji: '🌿',
  },
  fluency_level_4: {
    type: 'fluency_level_4',
    label: 'Fluent Reader',
    description: 'Reached Fluency Level 4!',
    emoji: '🌳',
  },
};
