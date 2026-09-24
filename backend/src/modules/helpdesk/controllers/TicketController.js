import { catchAsync } from '../../../core/utils/catchAsync.js';
import { successResponse } from '../../../core/utils/response.js';
import ticketService from '../services/TicketService.js';

class TicketController {
  getAllTickets = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const tickets = await ticketService.getAllTickets(organizationId, req.query);
    return successResponse(res, tickets);
  });

  getMyTickets = catchAsync(async (req, res) => {
    const { organizationId, id: userId } = req.user;
    const tickets = await ticketService.getMyTickets(organizationId, userId);
    return successResponse(res, tickets);
  });

  createTicket = catchAsync(async (req, res) => {
    const { organizationId, id: userId } = req.user;
    const ticket = await ticketService.createTicket(organizationId, userId, req.body);
    return successResponse(res, ticket, 'Ticket created successfully', 201);
  });

  updateStatus = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { status } = req.body;
    const ticket = await ticketService.updateTicketStatus(organizationId, id, status);
    return successResponse(res, ticket, 'Ticket status updated');
  });

  assignTicket = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { assignedTo } = req.body;
    const ticket = await ticketService.assignTicket(organizationId, id, assignedTo);
    return successResponse(res, ticket, 'Ticket assigned successfully');
  });

  addMessage = catchAsync(async (req, res) => {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { message } = req.body;
    
    // We can infer sender name from req.user
    const sender = `${req.user.firstName} ${req.user.lastName}`;
    
    const ticket = await ticketService.addMessage(organizationId, id, sender, message);
    return successResponse(res, ticket, 'Message added');
  });
}

export default new TicketController();
