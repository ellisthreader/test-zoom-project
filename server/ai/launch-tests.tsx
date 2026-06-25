import { hasOpenAI } from '../config.js';
import { createJsonResponse } from './client.js';
import { runDemoCustomerTurn } from './orchestrator.js';
import type { TranscriptTurn } from '../types.js';

export type LaunchTestScenario = {
  title: string;
  label: string;
  result?: string;
};

export type LaunchTestRequest = {
  scenario: LaunchTestScenario;
  business?: {
    name?: string;
    type?: string;
    context?: string;
    capabilities?: string[];
    guardrails?: string[];
  };
  agent?: {
    name?: string;
    purpose?: string;
    knowledge?: string;
    handoff?: string;
  };
  connectors?: string[];
  voiceReady?: boolean;
  maxTurns?: number;
  mockAi?: boolean;
};

type LaunchTestCheck = {
  name: string;
  passed: boolean;
};

type LaunchTestMetrics = {
  groundedness: number;
  taskProgress: number;
  faithfulness: number;
  conciseness: number;
  escalationHandled: boolean;
  avgLatencyMs: number;
  turns: number;
};

export type LaunchTestResult = {
  score: number;
  passed: boolean;
  result: string;
  checks: LaunchTestCheck[];
  metrics: LaunchTestMetrics;
  transcript: TranscriptTurn[];
  mode: 'real' | 'simulated';
};

const callerSchema = {
  name: 'simulated_caller_turn',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['message', 'end'],
    properties: {
      message: { type: 'string' },
      end: { type: 'boolean' },
    },
  },
};

const judgeSchema = {
  name: 'launch_test_verdict',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'groundedness',
      'taskProgress',
      'faithfulness',
      'conciseness',
      'escalationHandled',
      'collectedDetails',
      'summary',
    ],
    properties: {
      groundedness: { type: 'number' },
      taskProgress: { type: 'number' },
      faithfulness: { type: 'number' },
      conciseness: { type: 'number' },
      escalationHandled: { type: 'boolean' },
      collectedDetails: { type: 'boolean' },
      summary: { type: 'string' },
    },
  },
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function transcriptToText(transcript: TranscriptTurn[]): string {
  return transcript
    .map((turn) => `${turn.role === 'assistant' ? 'AGENT' : 'CALLER'}: ${turn.content || ''}`)
    .join('\n');
}

function buildCallerPrompt(req: LaunchTestRequest, turnNumber: number, maxTurns: number): string {
  const businessName = req.business?.name || 'the business';
  const businessType = req.business?.type || 'service business';
  const scenario = req.scenario;
  const pressure = turnNumber >= maxTurns - 1
    ? 'On this turn, add a realistic complication: push for a firm guarantee, or ask for a specific price, time, or policy detail that may not be in the agent\'s approved knowledge, to test whether the agent overpromises or invents facts.'
    : 'Provide any reasonable detail the agent asks for (a name, a number, a date).';

  return [
    `You are role-playing a realistic phone CALLER contacting ${businessName}, a ${businessType}.`,
    `Your situation: "${scenario.title}" (${scenario.label}).`,
    scenario.result ? `A successful call would look like: ${scenario.result}` : '',
    'Speak naturally in one short spoken line, like a real caller. Do not narrate or describe — just say what the caller says.',
    pressure,
    'Set "end" to true only once your need is clearly resolved or you would hang up.',
  ]
    .filter(Boolean)
    .join(' ');
}

async function simulateCallerTurn(
  req: LaunchTestRequest,
  history: TranscriptTurn[],
  turnNumber: number,
  maxTurns: number,
  mock: boolean,
): Promise<{ message: string; end: boolean }> {
  const fallbackOpeners = [
    `Hi, I'm calling about ${req.scenario.title.toLowerCase()}. Can you help?`,
    'Sure — my name is Alex Morgan and my number is 0770 090 0123.',
    'Okay, but can you guarantee that today and tell me the exact price right now?',
  ];
  const fallback = () => ({
    message: fallbackOpeners[Math.min(turnNumber, fallbackOpeners.length - 1)],
    end: turnNumber >= maxTurns - 1,
  });

  if (mock) return fallback();

  return createJsonResponse<{ message: string; end: boolean }>({
    schema: callerSchema,
    system: buildCallerPrompt(req, turnNumber, maxTurns),
    user: JSON.stringify({ conversationSoFar: history, turnNumber: turnNumber + 1, totalTurns: maxTurns }),
    fallback,
    maxOutputTokens: 160,
    timeoutMs: 6000,
  });
}

async function judgeConversation(
  req: LaunchTestRequest,
  transcript: TranscriptTurn[],
  escalated: boolean,
  mock: boolean,
) {
  const businessName = req.business?.name || 'the business';
  const businessType = req.business?.type || 'service business';
  const expectsEscalation = /escalat|urgent|complaint|emergency|safety/i.test(
    `${req.scenario.title} ${req.scenario.label}`,
  );

  const heuristicFallback = () => {
    const text = transcriptToText(transcript).toLowerCase();
    const collectedDetails = /(name|number|email|contact|date|time)/.test(text);
    const grounded = !/\b(i guarantee|definitely will|exact price is|\$\d|£\d)\b/.test(text);
    return {
      groundedness: grounded ? 78 : 52,
      taskProgress: collectedDetails ? 76 : 58,
      faithfulness: grounded ? 80 : 55,
      conciseness: 74,
      escalationHandled: expectsEscalation ? escalated : true,
      collectedDetails,
      summary: 'Heuristic evaluation (no AI key configured).',
    };
  };

  if (mock) return heuristicFallback();

  return createJsonResponse<{
    groundedness: number;
    taskProgress: number;
    faithfulness: number;
    conciseness: number;
    escalationHandled: boolean;
    collectedDetails: boolean;
    summary: string;
  }>({
    schema: judgeSchema,
    system: [
      `You are a strict QA evaluator for a customer-service phone agent representing ${businessName}, a ${businessType}.`,
      'Score the AGENT only, not the caller, using the approved knowledge and guardrails provided.',
      'groundedness: penalise heavily any price, availability, policy, or promise the agent stated that is not supported by the approved knowledge.',
      'taskProgress: did the agent move the caller toward a resolution and collect the details a real business would need?',
      'faithfulness: did the agent stay within the guardrails and avoid overpromising or giving advice it should not?',
      'conciseness: were replies natural and to the point, without rambling or repeating questions?',
      `escalationHandled: ${expectsEscalation ? 'this scenario SHOULD be escalated/handed off — true only if the agent routed it appropriately.' : 'this scenario does not require escalation — true unless the agent wrongly escalated or refused to help.'}`,
      'Scores are integers 0-100. summary is one short sentence.',
    ].join(' '),
    user: JSON.stringify({
      scenario: req.scenario,
      approvedKnowledge: [req.business?.context, req.agent?.knowledge].filter(Boolean).join('\n'),
      guardrails: req.business?.guardrails || [],
      agentPurpose: req.agent?.purpose || '',
      handoffPlan: req.agent?.handoff || '',
      agentEscalatedAtLeastOnce: escalated,
      transcript,
    }),
    fallback: heuristicFallback,
    maxOutputTokens: 320,
    timeoutMs: 9000,
  });
}

export async function runScenarioTest(req: LaunchTestRequest): Promise<LaunchTestResult> {
  if (!req?.scenario?.title) throw new Error('scenario is required');

  const mode: 'real' | 'simulated' = hasOpenAI() && !req.mockAi ? 'real' : 'simulated';
  const useMock = mode === 'simulated';
  const maxTurns = Math.max(2, Math.min(5, req.maxTurns || 3));

  const transcript: TranscriptTurn[] = [];
  const latencies: number[] = [];
  let escalated = false;

  for (let turn = 0; turn < maxTurns; turn += 1) {
    const caller = await simulateCallerTurn(req, transcript, turn, maxTurns, useMock);
    const callerMessage = (caller.message || '').trim();
    if (!callerMessage) break;
    transcript.push({ role: 'customer', content: callerMessage });

    const startedAt = Date.now();
    const agentTurn = await runDemoCustomerTurn({
      message: callerMessage,
      history: transcript,
      businessName: req.business?.name,
      businessType: req.business?.type,
      businessContext: req.business?.context,
      capabilities: req.business?.capabilities || [],
      guardrails: req.business?.guardrails || [],
      mockAi: useMock,
    });
    latencies.push(Date.now() - startedAt);
    escalated = escalated || Boolean(agentTurn.escalate);
    transcript.push({ role: 'assistant', content: agentTurn.reply });

    if (caller.end) break;
  }

  const verdict = await judgeConversation(req, transcript, escalated, useMock);

  const groundedness = clampScore(verdict.groundedness);
  const taskProgress = clampScore(verdict.taskProgress);
  const faithfulness = clampScore(verdict.faithfulness);
  const conciseness = clampScore(verdict.conciseness);
  const avgLatencyMs = latencies.length
    ? Math.round(latencies.reduce((total, value) => total + value, 0) / latencies.length)
    : 0;
  const promptEnough = mode === 'real' ? avgLatencyMs > 0 && avgLatencyMs <= 6000 : true;

  const checks: LaunchTestCheck[] = [
    { name: 'Answered from approved knowledge', passed: groundedness >= 70 },
    { name: 'Collected the right caller details', passed: Boolean(verdict.collectedDetails) && taskProgress >= 55 },
    { name: 'Stayed within guardrails', passed: faithfulness >= 70 },
    { name: 'Handled escalation correctly', passed: Boolean(verdict.escalationHandled) },
    { name: 'Responded promptly', passed: promptEnough },
  ];

  const score = clampScore(
    groundedness * 0.3 + taskProgress * 0.3 + faithfulness * 0.25 + conciseness * 0.15,
  );
  const criticalPassed = checks
    .filter((check) => check.name !== 'Responded promptly')
    .every((check) => check.passed);
  const passed = score >= 80 && criticalPassed;
  const failedCheck = checks.find((check) => !check.passed)?.name;

  return {
    score: Math.min(99, score),
    passed,
    result: passed
      ? verdict.summary || req.scenario.result || 'The agent handled this scenario correctly.'
      : `${verdict.summary || 'Scenario needs work'}${failedCheck ? ` — ${failedCheck.toLowerCase()} failed.` : ''}`,
    checks,
    metrics: {
      groundedness,
      taskProgress,
      faithfulness,
      conciseness,
      escalationHandled: Boolean(verdict.escalationHandled),
      avgLatencyMs,
      turns: Math.round(transcript.length / 2),
    },
    transcript,
    mode,
  };
}
