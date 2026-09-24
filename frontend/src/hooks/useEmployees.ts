import { useQuery } from '@tanstack/react-query';
import { employeesApi, EmployeeFilterQuery } from '../api/employees';

export const useEmployees = (params?: EmployeeFilterQuery) => {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => employeesApi.list(params),
  });
};

export const useEmployee = (id?: string) => {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => (id ? employeesApi.getById(id) : Promise.reject('No ID')),
    enabled: !!id,
  });
};
