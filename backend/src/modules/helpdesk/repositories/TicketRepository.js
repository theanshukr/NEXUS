import BaseRepository from '../../../core/repositories/BaseRepository.js';
import Ticket from '../models/Ticket.js';

class TicketRepository extends BaseRepository {
  constructor() {
    super(Ticket);
  }

  async findByOrganization(organizationId, filter = {}, options = {}) {
    return this.find(filter, organizationId, { populate: 'requestedBy', ...options });
  }

  async findMyTickets(organizationId, userId, options = {}) {
    return this.find({ requestedBy: userId }, organizationId, { populate: 'requestedBy', ...options });
  }
}

export default new TicketRepository();
