import customers from '../data/customers.json' with { type: 'json' };
import type { Customer, CustomerLookup } from '../types.js';

export async function findCustomer({ phone, email, customerId }: CustomerLookup = {}): Promise<Customer | null> {
  if (!phone && !email && !customerId) return null;

  return (customers as Customer[]).find((customer) => {
    return (
      (customerId && customer.id === customerId) ||
      (phone && customer.phone === phone) ||
      (email && customer.email.toLowerCase() === String(email).toLowerCase())
    );
  }) || null;
}
