import type { Ticket, TicketInput } from '../types.js';

const tickets: Ticket[] = [];

export async function createTicket(ticketInput: TicketInput): Promise<Ticket> {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: `tick_${String(tickets.length + 1001)}`,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    ...ticketInput,
  };

  tickets.push(ticket);
  return ticket;
}

export async function listTickets(): Promise<Ticket[]> {
  return tickets;
}
