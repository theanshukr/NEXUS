import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchingApi } from '../api/matching';

export const useMatches = (initiativeId?: string, minScore?: number, limit?: number) => {
  return useQuery({
    queryKey: ['matches', initiativeId, { minScore, limit }],
    queryFn: () => (initiativeId ? matchingApi.getMatches(initiativeId, minScore, limit) : Promise.reject('No initiative ID')),
    enabled: !!initiativeId,
  });
};

export const useRunMatching = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ initiativeId, limit }: { initiativeId: string; limit?: number }) =>
      matchingApi.runMatching(initiativeId, limit),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['matches', variables.initiativeId] });
    },
  });
};
