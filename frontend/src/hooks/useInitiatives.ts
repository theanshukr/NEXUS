import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { initiativesApi, CreateInitiativePayload } from '../api/initiatives';

export const useInitiatives = (status?: string, businessUnit?: string) => {
  return useQuery({
    queryKey: ['initiatives', { status, businessUnit }],
    queryFn: () => initiativesApi.list(status, businessUnit),
  });
};

export const useInitiative = (id?: string) => {
  return useQuery({
    queryKey: ['initiative', id],
    queryFn: () => (id ? initiativesApi.getById(id) : Promise.reject('No ID')),
    enabled: !!id,
  });
};

export const useAnalyzeInitiative = () => {
  return useMutation({
    mutationFn: ({ description, businessUnit }: { description: string; businessUnit?: string }) =>
      initiativesApi.analyze(description, businessUnit),
  });
};

export const useCreateInitiative = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInitiativePayload) => initiativesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
};
