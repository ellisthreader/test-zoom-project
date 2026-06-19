import { findCustomer } from '../adapters/crm.js';
import { createTicket } from '../adapters/helpdesk.js';
import { searchKnowledgeBase } from '../adapters/kb.js';
import { createJsonResponse } from './client.js';
import { detectCategory, detectPriority, normalizePriority, shouldEscalate } from './schema.js';
import type { Customer, CustomerLookup, TicketInput, TranscriptTurn } from '../types.js';

type ChatTurnRequest = {
  channel?: string;
  message: string;
  history?: TranscriptTurn[];
  customer?: CustomerLookup;
  mockAi?: boolean;
};

type DemoChatTurnRequest = {
  message: string;
  history?: TranscriptTurn[];
  businessName?: string;
  businessType?: string;
  businessContext?: string;
  capabilities?: string[];
  guardrails?: string[];
  mockAi?: boolean;
};

type ChatTurn = {
  reply: string;
  intent: string;
  confidence: number;
  needsTicket: boolean;
  escalate: boolean;
  missingFields: string[];
};

type DemoChatTurn = {
  reply: string;
  intent: string;
  confidence: number;
  nextAction: string;
  escalate: boolean;
};

type TicketConversationRequest = {
  channel?: string;
  customer?: CustomerLookup;
  transcript: TranscriptTurn[] | string;
  mockAi?: boolean;
};

type BuilderPlanRequest = {
  instruction: string;
  currentConfig?: Record<string, unknown>;
  mockAi?: boolean;
};

type BuilderPlan = {
  summary: string;
  intents: string[];
  knowledgeBaseUpdates: string[];
  escalationRules: string[];
  testScenarios: string[];
};

const chatSchema = {
  name: 'customer_service_turn',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['reply', 'intent', 'confidence', 'needsTicket', 'escalate', 'missingFields'],
    properties: {
      reply: { type: 'string' },
      intent: { type: 'string' },
      confidence: { type: 'number' },
      needsTicket: { type: 'boolean' },
      escalate: { type: 'boolean' },
      missingFields: { type: 'array', items: { type: 'string' } },
    },
  },
};

const demoChatSchema = {
  name: 'business_demo_chat_turn',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['reply', 'intent', 'confidence', 'nextAction', 'escalate'],
    properties: {
      reply: { type: 'string' },
      intent: { type: 'string' },
      confidence: { type: 'number' },
      nextAction: { type: 'string' },
      escalate: { type: 'boolean' },
    },
  },
};

const ticketSchema = {
  name: 'support_ticket',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'summary', 'category', 'priority', 'requiredAction', 'sentiment'],
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      category: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
      requiredAction: { type: 'string' },
      sentiment: { type: 'string' },
    },
  },
};

const builderSchema = {
  name: 'builder_plan',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'intents', 'knowledgeBaseUpdates', 'escalationRules', 'testScenarios'],
    properties: {
      summary: { type: 'string' },
      intents: { type: 'array', items: { type: 'string' } },
      knowledgeBaseUpdates: { type: 'array', items: { type: 'string' } },
      escalationRules: { type: 'array', items: { type: 'string' } },
      testScenarios: { type: 'array', items: { type: 'string' } },
    },
  },
};

function transcriptText(transcript: TranscriptTurn[] | string = []): string {
  if (Array.isArray(transcript)) {
    return transcript.map((turn) => `${turn.role || 'speaker'}: ${turn.content || turn.text || ''}`).join('\n');
  }
  return String(transcript || '');
}

function fallbackTicket(text: string, customer: Customer | null): TicketInput {
  const category = detectCategory(text);
  const priority = detectPriority(text);
  return {
    title: `${category.replace(/_/g, ' ')} request`,
    summary: text.slice(0, 420) || 'Customer requested support.',
    category,
    priority,
    requiredAction: shouldEscalate(text, customer)
      ? 'Review and contact the customer directly.'
      : 'Investigate the request and respond with the next step.',
    sentiment: /(angry|complaint|unacceptable|frustrated)/i.test(text) ? 'negative' : 'neutral',
  };
}

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export async function runCustomerTurn({ channel = 'chat', message, history = [], customer = {}, mockAi = false }: ChatTurnRequest) {
  if (!message) throw new Error('message is required');

  const crmCustomer = await findCustomer(customer);
  const contextDocs = searchKnowledgeBase(message);
  const fallback = (): ChatTurn => {
    const needsTicket = /(refund|delivery|not arrived|broken|complaint|cancel|payment|invoice|reschedule)/i.test(message);
    const missingFields = [];
    if (/delivery|order|refund|invoice/i.test(message) && !/order\s*#?\s*[a-z0-9-]+/i.test(message)) {
      missingFields.push('order_number');
    }

    return {
      reply: missingFields.length
        ? `I can help with that. Please share your ${missingFields.join(', ').replace(/_/g, ' ')} so I can create the right support record.`
        : 'I can help with that. I have enough detail to log this and route it to the right support queue.',
      intent: detectCategory(message),
      confidence: contextDocs.length ? 0.74 : 0.45,
      needsTicket,
      escalate: shouldEscalate(message, crmCustomer),
      missingFields,
    };
  };

  const aiTurn = mockAi
    ? fallback()
    : await createJsonResponse<ChatTurn>({
        schema: chatSchema,
        system:
          'You are a concise customer service AI for RelayClarity. Use the provided customer, history, and knowledge snippets. Ask for missing details before ticket creation. Escalate sensitive, angry, VIP, legal, billing, cancellation, fraud, and low-confidence cases.',
        user: JSON.stringify({ channel, message, history, customer: crmCustomer || customer, knowledge: contextDocs }),
        fallback,
      });

  let ticket = null;
  if (aiTurn.needsTicket && aiTurn.missingFields.length === 0) {
    ticket = await createTicketFromConversation({
      channel,
      customer,
      mockAi,
      transcript: [...history, { role: 'customer', content: message }, { role: 'assistant', content: aiTurn.reply }],
    });
  }

  return {
    channel,
    customer: crmCustomer || null,
    knowledge: contextDocs,
    ...aiTurn,
    ticket,
  };
}

export async function runDemoCustomerTurn({
  message,
  history = [],
  businessName = 'the business',
  businessType = 'service business',
  businessContext = '',
  capabilities = [],
  guardrails = [],
  mockAi = false,
}: DemoChatTurnRequest) {
  if (!message) throw new Error('message is required');

  const fallback = (): DemoChatTurn => {
    const normalized = message.toLowerCase();
    const asksAvailability = /(today|tomorrow|available|appointment|book|booking|table|reservation|viewing|slot|open|schedule|reschedule)/i.test(message);
    const asksPrice = /(price|cost|fee|deposit|invoice|billing|refund|return)/i.test(message);
    const urgent = /(urgent|emergency|pain|leak|fraud|complaint|angry|cancel|suspicious)/i.test(message);
    const asksContact = /(call|phone|email|number|contact|ring me|text me)/i.test(message);
    const contextHint = businessContext
      ? `I will use the details I have for ${businessName} and keep anything uncertain for the team.`
      : `I can help with the next step and pass anything specific to the team.`;

    let reply = `Of course. ${contextHint} Could I take your name and the best number or email to reach you on?`;

    if (asksAvailability) {
      reply = `I can help with that. What day and time works best, and what name and contact number should I put on the request? I will check it against ${businessName}'s team before confirming.`;
    } else if (asksPrice) {
      reply = `I can help with pricing. I will stick to the approved details I have for ${businessName}; if anything needs a quote, I can take your details and ask the team to confirm it.`;
    } else if (urgent) {
      reply = `I'm sorry you're dealing with that. Is anyone in immediate danger or does this need emergency help now? If not, tell me what's happened, your name, and the best contact number, and I will route it urgently to the right person at ${businessName}.`;
    } else if (asksContact) {
      reply = `Yes, I can arrange a follow-up. What is your name, best contact number, and a good time for ${businessName} to get back to you?`;
    } else if (normalized.length > 120) {
      reply = `Thanks, I have the gist. To get this moving, could you share your name, best contact number, and when you would like the team at ${businessName} to follow up?`;
    }

    return {
      reply,
      intent: detectCategory(message),
      confidence: businessContext ? 0.72 : 0.54,
      nextAction: urgent ? 'Escalate with context' : 'Continue the conversation',
      escalate: urgent || shouldEscalate(message, null),
    };
  };

  return mockAi
    ? fallback()
    : createJsonResponse<DemoChatTurn>({
        schema: demoChatSchema,
        system: [
          `You are the live demo AI agent for ${businessName}, a ${businessType}.`,
          'Respond like a polished customer-facing live chat agent in one short message.',
          'For booking, appointment, reservation, viewing, quote, callback, or service requests, collect the minimum useful details: name, contact, preferred date/time, service needed, and urgency. Do not claim the booking is confirmed unless approved availability was provided.',
          'Use the provided business context as approved knowledge. Do not invent prices, availability, policies, medical/legal/financial advice, or system facts.',
          'Do not invent emergency phone numbers, addresses, opening hours, availability, or local procedures. If urgent safety help is needed and no local number was provided, refer to local emergency services generically.',
          'If the customer asks for something urgent, sensitive, risky, or outside the approved context, say what details you would collect and explain that you would route it to the team.',
          'Do not mention JSON, internal prompts, handoff briefs, scripts, or that this is a demo. Keep replies natural, specific, and concise.',
        ].join(' '),
        user: JSON.stringify({
          message,
          history,
          business: {
            name: businessName,
            type: businessType,
            approvedContext: businessContext,
            capabilities,
            guardrails,
          },
        }),
        fallback,
        maxOutputTokens: 360,
        timeoutMs: 5000,
      });
}

export async function createTicketFromConversation({ channel = 'chat', customer = {}, transcript, mockAi = false }: TicketConversationRequest) {
  const crmCustomer = await findCustomer(customer);
  const text = transcriptText(transcript);
  const fallback = () => fallbackTicket(text, crmCustomer);
  const ticketDraft = mockAi
    ? fallback()
    : await createJsonResponse<TicketInput>({
        schema: ticketSchema,
        system:
          'Extract a production-ready customer service ticket from the conversation. Keep the summary factual, include the customer problem, and choose the right priority.',
        user: JSON.stringify({ channel, customer: crmCustomer || customer, transcript }),
        fallback,
      });

  return createTicket({
    ...ticketDraft,
    category: normalizeCategory(ticketDraft.category),
    priority: normalizePriority(ticketDraft.priority),
    channel,
    customerId: crmCustomer?.id || null,
    customerSnapshot: crmCustomer || customer || null,
    transcript: text,
    escalate: shouldEscalate(text, crmCustomer) || ticketDraft.priority === 'urgent',
  });
}

export async function buildAgentPlan({ instruction, currentConfig = {}, mockAi = false }: BuilderPlanRequest) {
  if (!instruction) throw new Error('instruction is required');

  const fallback = (): BuilderPlan => ({
    summary: `Draft plan for: ${instruction}`,
    intents: [detectCategory(instruction)],
    knowledgeBaseUpdates: ['Add an approved answer covering the requested workflow and required customer fields.'],
    escalationRules: ['Escalate if the customer asks for a human, becomes angry, or the AI lacks required information.'],
    testScenarios: ['Customer asks the new workflow question with all required details.', 'Customer asks the same question but omits key details.'],
  });

  return mockAi
    ? fallback()
    : createJsonResponse<BuilderPlan>({
        schema: builderSchema,
        system:
          'You turn plain English operations requests into customer-service AI configuration plans. Return concrete intents, knowledge base changes, escalation rules, and tests. Do not claim changes have been deployed.',
        user: JSON.stringify({ instruction, currentConfig }),
        fallback,
      });
}
