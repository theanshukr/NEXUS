import { Router } from 'express';
import SalaryStructureRoutes from './SalaryStructureRoutes.js';
import PayrollCycleRoutes from './PayrollCycleRoutes.js';
import PayrollRunRoutes from './PayrollRunRoutes.js';
import PayslipRoutes from './PayslipRoutes.js';

const router = Router();

router.use('/structures', SalaryStructureRoutes);
router.use('/cycles', PayrollCycleRoutes);
router.use('/runs', PayrollRunRoutes);
router.use('/payslips', PayslipRoutes);

export default router;
