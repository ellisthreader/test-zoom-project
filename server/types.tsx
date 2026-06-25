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
  riskLevel?: "low" | "medium" | "high";
  riskScore?: number;
  riskConfidence?: number;
  riskClassProbabilities?: Record<"low" | "medium" | "high", number>;
  riskReasons?: RiskReason[];
  riskFeatureAttributions?: RiskFeatureAttribution[];
  riskSignals?: RiskSignal[];
  riskModelVersion?: string;
  humanReviewRequired?: boolean;
  scoredAt?: string;
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

export type RiskReason = {
  factor: string;
  impact: string;
};

export type RiskFeatureAttribution = {
  feature: string;
  value: number;
  direction: "raises_risk" | "lowers_risk";
};

export type RiskSignal = {
  label: string;
  value: string;
};

export type RiskScoringInput = {
  channel?: string;
  category?: string;
  priority?: string;
  sentiment?: string;
  customerTier?: string;
  previousOpenTickets?: number;
  confidence?: number;
  escalate?: boolean;
  transcriptText?: string;
  callOutcome?: string;
  durationSeconds?: number;
  sourceSystem?: string;
};

export type RiskScoringResponse = {
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  confidence: number;
  classProbabilities: Record<"low" | "medium" | "high", number>;
  mainReasons: RiskReason[];
  featureAttributions: RiskFeatureAttribution[];
  signals: RiskSignal[];
  modelVersion: string;
  humanReviewRequired: boolean;
  scoredAt: string;
};

export type RiskDecisionInput = {
  ticketId?: string;
  predictedLevel: "low" | "medium" | "high";
  predictedScore?: number;
  modelVersion?: string;
  decision: "accepted" | "overridden";
  correctedLevel?: "low" | "medium" | "high";
  reason?: string;
  reviewer?: string;
  channel?: string;
  customerTier?: string;
  category?: string;
  // Optional raw case fields (mirroring RiskScoringInput) so retraining can rebuild feature vectors.
  transcriptText?: string;
  summary?: string;
  priority?: string;
  sentiment?: string;
  callOutcome?: string;
  confidence?: number;
  previousOpenTickets?: number;
  escalate?: boolean;
  durationSeconds?: number;
};

export type RiskDecisionRecord = RiskDecisionInput & {
  id: string;
  finalLevel: "low" | "medium" | "high";
  decidedAt: string;
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
