import { apiClient } from './client';
import { AnalyzeInitiativeResponse, ExtractedSkill, Initiative } from '../types';

export interface CreateInitiativePayload {
  initiative: {
    title: string;
    description: string;
    business_unit?: string;
    target_start_date?: string;
    target_end_date?: string;
    team_size: number;
    raw_requirements?: string;
  };
  skills: ExtractedSkill[];
}

export const initiativesApi = {
  analyze: async (description: string, business_unit?: string): Promise<AnalyzeInitiativeResponse> => {
    const { data } = await apiClient.post<AnalyzeInitiativeResponse>('/initiatives/analyze', {
      description,
      business_unit,
    });
    return data;
  },

  list: async (status?: string, business_unit?: string): Promise<Initiative[]> => {
    const { data } = await apiClient.get<Initiative[]>('/initiatives', {
      params: { status, business_unit },
    });
    return data;
  },

  getById: async (id: string): Promise<Initiative> => {
    const { data } = await apiClient.get<Initiative>(`/initiatives/${id}`);
    return data;
  },

  create: async (payload: CreateInitiativePayload): Promise<Initiative> => {
    const { data } = await apiClient.post<Initiative>('/initiatives', payload);
    return data;
  },
};
