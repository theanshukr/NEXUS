import express from 'express';
import { authenticate } from '../../../core/middleware/auth.js';
import { requireTenant } from '../../../core/middleware/tenant.js';
import { hasPermission } from '../../../core/middleware/hasPermission.js';
import ticketController from '../controllers/TicketController.js';

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

// Employee routes
router.get('/my', ticketController.getMyTickets);
router.post('/', ticketController.createTicket);
router.post('/:id/messages', ticketController.addMessage);

// Admin / Helpdesk Agent routes
router.get('/', hasPermission('helpdesk.view'), ticketController.getAllTickets);
router.patch('/:id/status', hasPermission('helpdesk.manage'), ticketController.updateStatus);
router.patch('/:id/assign', hasPermission('helpdesk.manage'), ticketController.assignTicket);
router.post('/:id/agent-messages', hasPermission('helpdesk.manage'), ticketController.addMessage);

export default router;
