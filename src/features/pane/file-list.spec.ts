import { describe, it, expect } from 'vitest';

import {
  formatFileSize,
  formatDate,
  calculateScrollAmount,
  ROW_HEIGHT,
  ROWS_PER_SCROLL
} from './file-list.tsx';

describe('formatFileSize', () => {
  it.each([
    { bytes: 0, expected: '0 B' },
    { bytes: 512, expected: '512 B' },
    { bytes: 1024, expected: '1.0 KB' },
    { bytes: 1536, expected: '1.5 KB' },
    { bytes: 1048576, expected: '1.0 MB' },
    { bytes: 2621440, expected: '2.5 MB' },
    { bytes: 1073741824, expected: '1.0 GB' },
    { bytes: 1099511627776, expected: '1.0 TB' }
  ])('formats $bytes bytes as $expected', ({ bytes, expected }) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe('formatDate', () => {
  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('formats timestamp as YYYY-MM-DD HH:mm', () => {
    const timestamp = new Date(2024, 0, 16, 14, 30).getTime() / 1000;
    expect(formatDate(timestamp)).toBe('2024-01-16 14:30');
  });

  it('pads single digit months and days', () => {
    const jan5 = new Date(2024, 0, 5, 9, 5).getTime() / 1000;
    expect(formatDate(jan5)).toBe('2024-01-05 09:05');
  });
});

describe('calculateScrollAmount', () => {
  it('returns positive scroll for positive deltaY', () => {
    expect(calculateScrollAmount(100)).toBe(75);
  });

  it('returns negative scroll for negative deltaY', () => {
    expect(calculateScrollAmount(-100)).toBe(-75);
  });

  it('uses direction only, ignores magnitude', () => {
    expect(calculateScrollAmount(1)).toBe(75);
    expect(calculateScrollAmount(1000)).toBe(75);
    expect(calculateScrollAmount(-1)).toBe(-75);
    expect(calculateScrollAmount(-1000)).toBe(-75);
  });

  it('has expected row height and scroll multiplier', () => {
    expect(ROW_HEIGHT).toBe(25);
    expect(ROWS_PER_SCROLL).toBe(3);
  });
});
