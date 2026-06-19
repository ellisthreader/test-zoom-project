import type { Customer } from '../types.js';

export const ticketPriorities = ['low', 'normal', 'high', 'urgent'] as const;

export function normalizePriority(value = 'normal'): string {
  return (ticketPriorities as readonly string[]).includes(value) ? value : 'normal';
}

export function detectPriority(text = ''): string {
  const lower = text.toLowerCase();
  if (/(legal|lawsuit|fraud|unsafe|emergency|chargeback)/.test(lower)) return 'urgent';
  if (/(angry|complaint|cancel|refund|express|not arrived|broken|payment)/.test(lower)) return 'high';
  if (/(question|change|reschedule|where|when)/.test(lower)) return 'normal';
  return 'low';
}

export function detectCategory(text = ''): string {
  const lower = text.toLowerCase();
  if (/(refund|invoice|payment|charge|billing)/.test(lower)) return 'billing';
  if (/(delivery|order|courier|arrived|shipping|postcode)/.test(lower)) return 'delivery';
  if (/(appointment|booking|reschedule|calendar)/.test(lower)) return 'scheduling';
  if (/(login|password|technical|error|bug)/.test(lower)) return 'technical_support';
  return 'general_support';
}

export function shouldEscalate(text = '', customer: Customer | null = null): boolean {
  const lower = text.toLowerCase();
  return Boolean(
    customer?.tier === 'vip' ||
      /(human|agent|manager|complaint|angry|legal|lawsuit|cancel|chargeback|fraud)/.test(lower)
  );
}
