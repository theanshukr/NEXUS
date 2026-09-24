import { apiClient } from './client';
import { Employee, EmployeeListItem } from '../types';

export interface EmployeeListResponse {
  items: EmployeeListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EmployeeFilterQuery {
  department?: string;
  seniority?: string;
  availability?: string;
  skill?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export const employeesApi = {
  list: async (params?: EmployeeFilterQuery): Promise<EmployeeListResponse> => {
    const { data } = await apiClient.get<EmployeeListResponse>('/employees', { params });
    return data;
  },

  getById: async (id: string): Promise<Employee> => {
    const { data } = await apiClient.get<Employee>(`/employees/${id}`);
    return data;
  },
};
