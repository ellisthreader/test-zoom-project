export type CustomerLookup = {
  phone?: string;
  email?: string;
  customerId?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  tier: string;
  openTickets: string[];
};

export type KnowledgeItem = {
  id: string;
  title: string;
  body: string;
  tags?: string[];
};

export type TicketInput = {
  title: string;
  summary: string;
  category: string;
  priority: string;
  requiredAction: string;
  sentiment: string;
  channel?: string;
  customerId?: string | null;
  customerSnapshot?: Customer | CustomerLookup | null;
  transcript?: string;
  escalate?: boolean;
};

export type Ticket = TicketInput & {
  id: string;
  status: "open";
  createdAt: string;
  updatedAt: string;
};

export type TranscriptTurn = {
  role?: string;
  content?: string;
  text?: string;
};

export type ZoomWebhookEvent = {
  event: string;
  event_ts?: number;
  payload?: {
    plainToken?: string;
    account_id?: string;
    object?: Record<string, unknown>;
    [key: string]: unknown;
  };
};
