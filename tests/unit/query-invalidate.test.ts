import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  invalidateAfterMutation,
  invalidatedKeyPrefixesForMutation,
} from '@/lib/query/invalidate';
import { queryKeys } from '@/lib/query/keys';

describe('invalidateAfterMutation key map (ticket 0032)', () => {
  const mutationCases: Array<{
    type: Parameters<typeof invalidatedKeyPrefixesForMutation>[0];
    expected: string[];
    ctx?: { caseId?: string };
  }> = [
    { type: 'assign', expected: ['schedule', 'taskBoard', 'dashboard', 'case', 'notifications'] },
    { type: 'taskStatus', expected: ['taskBoard', 'schedule', 'dashboard', 'case', 'reminders'] },
    { type: 'block', expected: ['taskBoard', 'blocked', 'schedule', 'dashboard', 'case'] },
    { type: 'unblock', expected: ['taskBoard', 'blocked', 'schedule', 'dashboard', 'case'] },
    { type: 'acceptLead', expected: ['cases', 'dashboard', 'taskBoard'] },
    {
      type: 'acceptLead',
      expected: ['cases', 'dashboard', 'taskBoard', 'case'],
      ctx: { caseId: 'x' },
    },
    { type: 'rejectLead', expected: ['cases', 'dashboard', 'taskBoard'] },
    {
      type: 'rejectLead',
      expected: ['cases', 'dashboard', 'taskBoard', 'case'],
      ctx: { caseId: 'x' },
    },
    { type: 'createLead', expected: ['cases', 'dashboard'] },
    { type: 'deleteCase', expected: ['cases', 'archive', 'dashboard', 'taskBoard', 'schedule'] },
    { type: 'restoreCase', expected: ['archive', 'cases'] },
    { type: 'purgeArchive', expected: ['archive', 'cases'] },
    { type: 'casePatch', expected: ['case', 'taskBoard', 'cases', 'reminders'] },
    { type: 'dependant', expected: ['case'] },
    { type: 'customTask', expected: ['schedule'] },
    {
      type: 'customTask',
      expected: ['case', 'schedule'],
      ctx: { caseId: 'x' },
    },
    { type: 'seniorReview', expected: ['case'] },
    { type: 'staffStatus', expected: ['team', 'dashboard'] },
    { type: 'timetable', expected: ['schedule', 'team', 'staff'] },
    { type: 'staffSettings', expected: ['schedule', 'team', 'staff'] },
    { type: 'applicationTypes', expected: ['applicationTypes'] },
  ];

  it.each(mutationCases)(
    'maps $type to expected key prefixes',
    ({ type, expected, ctx }) => {
      const keys = invalidatedKeyPrefixesForMutation(type, ctx);
      expect(keys).toEqual(expect.arrayContaining(expected));
      expect(keys).toHaveLength(expected.length);
    },
  );

  it('acceptLead with caseId includes case invalidation via invalidateAfterMutation', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateAfterMutation(queryClient, 'acceptLead', { caseId: 'case-123' });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.case('case-123'),
    });
  });
});
