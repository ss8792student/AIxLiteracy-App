export const READING_LEVELS: Record<number, string> = {
  1: 'Kindergarten',
  2: 'Grade 1',
  3: 'Grade 2',
  4: 'Grade 3',
  5: 'Grade 4',
  6: 'Grade 5',
  7: 'Grade 6',
  8: 'Grade 7–8',
};

export const LEVEL_COLORS: Record<number, string> = {
  1: '#90EE90',
  2: '#4CAF50',
  3: '#2196F3',
  4: '#03A9F4',
  5: '#9C27B0',
  6: '#FF9800',
  7: '#F44336',
  8: '#795548',
};

export function getLevelLabel(level: number): string {
  return READING_LEVELS[level] ?? `Level ${level}`;
}

export function getLevelColor(level: number): string {
  return LEVEL_COLORS[level] ?? '#607D8B';
}
