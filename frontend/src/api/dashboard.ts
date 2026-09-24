import { apiClient } from './client';
import { DashboardOverviewData } from '../types';

export const dashboardApi = {
  getOverview: async (): Promise<DashboardOverviewData> => {
    const { data } = await apiClient.get<DashboardOverviewData>('/dashboard/overview');
    return data;
  },
};
