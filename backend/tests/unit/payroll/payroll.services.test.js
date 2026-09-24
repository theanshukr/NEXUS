import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollStateMachineService, SalaryStructureService } from '#@/modules/payroll/services/index.js';
import { AppError } from '#@/core/errors/AppError.js';
import mongoose from 'mongoose';

describe('Payroll Services Unit Tests', () => {
  describe('PayrollStateMachineService', () => {
    it('should allow valid PayrollCycle state transitions', () => {
      expect(() => PayrollStateMachineService.validateTransition('PayrollCycle', 'OPEN', 'PROCESSING')).not.toThrow();
      expect(() => PayrollStateMachineService.validateTransition('PayrollCycle', 'PROCESSING', 'COMPLETED')).not.toThrow();
      expect(() => PayrollStateMachineService.validateTransition('PayrollCycle', 'COMPLETED', 'LOCKED')).not.toThrow();
    });

    it('should throw AppError on illegal state transitions', () => {
      expect(() => PayrollStateMachineService.validateTransition('PayrollCycle', 'OPEN', 'LOCKED')).toThrow(AppError);
      expect(() => PayrollStateMachineService.validateTransition('PayrollRun', 'LOCKED', 'PROCESSING')).toThrow(AppError);
      expect(() => PayrollStateMachineService.validateTransition('Payslip', 'FINALIZED', 'DRAFT')).toThrow(AppError);
    });
  });

  describe('SalaryStructureService Hierarchical Resolution', () => {
    const mockOrgId = new mongoose.Types.ObjectId().toString();
    const mockEmpId = new mongoose.Types.ObjectId().toString();
    const mockDesigId = new mongoose.Types.ObjectId().toString();
    const mockDeptId = new mongoose.Types.ObjectId().toString();

    let service;
    let mockStructureRepo;

    beforeEach(() => {
      mockStructureRepo = {
        findActiveByEmployee: vi.fn(),
        findActiveByDesignation: vi.fn(),
        findActiveByDepartment: vi.fn(),
        findActiveDefault: vi.fn()
      };
      service = new (SalaryStructureService.constructor)(mockStructureRepo, {});
    });

    it('should resolve structure by Employee Override first (highest precedence)', async () => {
      const empStructure = { _id: 'struct-emp', baseSalary: 80000 };
      mockStructureRepo.findActiveByEmployee.mockResolvedValue(empStructure);

      const res = await service.resolveForEmployee({
        _id: mockEmpId,
        designationId: mockDesigId,
        departmentId: mockDeptId
      }, mockOrgId);

      expect(res).toEqual(empStructure);
      expect(mockStructureRepo.findActiveByEmployee).toHaveBeenCalledWith(mockEmpId, mockOrgId, expect.any(Object));
      expect(mockStructureRepo.findActiveByDesignation).not.toHaveBeenCalled();
    });

    it('should resolve by Designation when Employee Override is not found', async () => {
      const desigStructure = { _id: 'struct-desig', baseSalary: 60000 };
      mockStructureRepo.findActiveByEmployee.mockResolvedValue(null);
      mockStructureRepo.findActiveByDesignation.mockResolvedValue(desigStructure);

      const res = await service.resolveForEmployee({
        _id: mockEmpId,
        designationId: mockDesigId,
        departmentId: mockDeptId
      }, mockOrgId);

      expect(res).toEqual(desigStructure);
      expect(mockStructureRepo.findActiveByDesignation).toHaveBeenCalledWith(mockDesigId, mockOrgId, expect.any(Object));
      expect(mockStructureRepo.findActiveByDepartment).not.toHaveBeenCalled();
    });

    it('should resolve by Department when Employee Override and Designation are not found', async () => {
      const deptStructure = { _id: 'struct-dept', baseSalary: 50000 };
      mockStructureRepo.findActiveByEmployee.mockResolvedValue(null);
      mockStructureRepo.findActiveByDesignation.mockResolvedValue(null);
      mockStructureRepo.findActiveByDepartment.mockResolvedValue(deptStructure);

      const res = await service.resolveForEmployee({
        _id: mockEmpId,
        designationId: mockDesigId,
        departmentId: mockDeptId
      }, mockOrgId);

      expect(res).toEqual(deptStructure);
      expect(mockStructureRepo.findActiveByDepartment).toHaveBeenCalledWith(mockDeptId, mockOrgId, expect.any(Object));
      expect(mockStructureRepo.findActiveDefault).not.toHaveBeenCalled();
    });

    it('should fall back to Organization Default when no specific structure matches', async () => {
      const defStructure = { _id: 'struct-default', baseSalary: 40000 };
      mockStructureRepo.findActiveByEmployee.mockResolvedValue(null);
      mockStructureRepo.findActiveByDesignation.mockResolvedValue(null);
      mockStructureRepo.findActiveByDepartment.mockResolvedValue(null);
      mockStructureRepo.findActiveDefault.mockResolvedValue(defStructure);

      const res = await service.resolveForEmployee({
        _id: mockEmpId,
        designationId: mockDesigId,
        departmentId: mockDeptId
      }, mockOrgId);

      expect(res).toEqual(defStructure);
      expect(mockStructureRepo.findActiveDefault).toHaveBeenCalledWith(mockOrgId, expect.any(Object));
    });
  });
});
