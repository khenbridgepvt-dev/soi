import { describe, expect, it } from 'vitest';
import { parseSearchQuery } from '@/lib/search/parse-search-query';

describe('parseSearchQuery (ticket 0029, EP-38)', () => {
  it('defaults limit to 8', () => {
    expect(parseSearchQuery(new URLSearchParams({ q: 'Patel' }))).toEqual({
      q: 'Patel',
      limit: 8,
    });
  });

  it('clamps limit between 1 and 20', () => {
    expect(parseSearchQuery(new URLSearchParams({ q: 'ab', limit: '50' })).limit).toBe(20);
    expect(parseSearchQuery(new URLSearchParams({ q: 'ab', limit: '0' })).limit).toBe(8);
  });

  it('trims the query', () => {
    expect(parseSearchQuery(new URLSearchParams({ q: '  Patel  ' })).q).toBe('Patel');
  });
});
