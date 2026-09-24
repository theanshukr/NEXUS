import ticketRepo from '../repositories/TicketRepository.js';
import { NotFoundError } from '../../../core/errors/AppError.js';

class TicketService {
  async getAllTickets(organizationId, filter = {}) {
    return ticketRepo.findByOrganization(organizationId, filter, { sort: { createdAt: -1 } });
  }

  async getMyTickets(organizationId, userId) {
    return ticketRepo.findMyTickets(organizationId, userId, { sort: { createdAt: -1 } });
  }

  async createTicket(organizationId, userId, data) {
    const ticketData = {
      organizationId,
      requestedBy: userId,
      subject: data.subject,
      description: data.description,
      category: data.category || 'Other',
      priority: data.priority || 'LOW',
      status: 'OPEN',
      history: [{
        sender: 'System',
        message: 'Ticket created.'
      }]
    };
    return ticketRepo.create(ticketData);
  }

  async updateTicketStatus(organizationId, ticketId, status) {
    const ticket = await ticketRepo.findById(ticketId);
    if (!ticket || ticket.organizationId.toString() !== organizationId.toString()) {
      throw new NotFoundError('Ticket not found');
    }
    ticket.status = status;
    ticket.history.push({
      sender: 'System',
      message: `Status changed to ${status}.`
    });
    return ticket.save();
  }

  async assignTicket(organizationId, ticketId, assignedTo) {
    const ticket = await ticketRepo.findById(ticketId);
    if (!ticket || ticket.organizationId.toString() !== organizationId.toString()) {
      throw new NotFoundError('Ticket not found');
    }
    ticket.assignedTo = assignedTo;
    ticket.history.push({
      sender: 'System',
      message: `Ticket reassigned.`
    });
    return ticket.save();
  }

  async addMessage(organizationId, ticketId, sender, message) {
    const ticket = await ticketRepo.findById(ticketId);
    if (!ticket || ticket.organizationId.toString() !== organizationId.toString()) {
      throw new NotFoundError('Ticket not found');
    }
    ticket.history.push({
      sender,
      message
    });
    return ticket.save();
  }
}

export default new TicketService();
