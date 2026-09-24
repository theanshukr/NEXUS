import { apiClient } from './client';
import { Match } from '../types';

export const matchingApi = {
  runMatching: async (initiativeId: string, limit: number = 10): Promise<Match[]> => {
    const { data } = await apiClient.post<Match[]>(`/initiatives/${initiativeId}/match`, null, {
      params: { limit },
    });
    return data;
  },

  getMatches: async (initiativeId: string, minScore: number = 0, limit: number = 10): Promise<Match[]> => {
    const { data } = await apiClient.get<Match[]>(`/initiatives/${initiativeId}/matches`, {
      params: { min_score: minScore, limit },
    });
    return data;
  },
};
