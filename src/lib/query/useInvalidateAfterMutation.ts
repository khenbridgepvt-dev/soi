'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  invalidateAfterMutation,
  type InvalidateContext,
  type MutationInvalidateType,
} from '@/lib/query/invalidate';

export function useInvalidateAfterMutation() {
  const queryClient = useQueryClient();

  return (type: MutationInvalidateType, ctx?: InvalidateContext) =>
    invalidateAfterMutation(queryClient, type, ctx ?? {});
}
