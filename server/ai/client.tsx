import OpenAI from 'openai';
import { config, hasOpenAI } from '../config.js';

type JsonSchemaConfig = {
  name: string;
  schema: Record<string, unknown>;
};

type JsonResponseRequest<T> = {
  system: string;
  user: string;
  schema: JsonSchemaConfig;
  fallback: (error?: unknown) => T | Promise<T>;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (!hasOpenAI()) return null;
  if (!client) client = new OpenAI({ apiKey: config.openaiApiKey });
  return client;
}

export async function createJsonResponse<T>({
  system,
  user,
  schema,
  fallback,
  maxOutputTokens = 700,
  timeoutMs = 8000,
}: JsonResponseRequest<T>): Promise<T> {
  const openai = getOpenAIClient();
  if (!openai) return fallback();

  try {
    const response = await openai.responses.create(
      {
        model: config.openaiModel,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_output_tokens: maxOutputTokens,
        reasoning: {
          effort: 'none',
        },
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: schema.name,
            schema: schema.schema,
            strict: true,
          },
        },
      },
      { timeout: timeoutMs },
    );

    return JSON.parse(response.output_text) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('OpenAI response failed; using fallback.', message);
    return fallback(error);
  }
}

export async function createRealtimeClientSecret() {
  if (!hasOpenAI()) {
    return {
      mode: 'mock',
      message: 'Set OPENAI_API_KEY to mint realtime voice client secrets.',
    };
  }

  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createRealtimeClientSecretBody()),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Realtime secret request failed: ${response.status} ${body}`);
  }

  return response.json();
}

export function createRealtimeClientSecretBody() {
  return {
    session: {
      type: 'realtime',
      model: config.realtimeModel,
      output_modalities: ['audio'],
      audio: {
        output: {
          voice: config.realtimeVoice,
        },
        input: {
          turn_detection: {
            type: 'server_vad',
            create_response: true,
            interrupt_response: true,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        },
      },
      instructions:
        'You are RelayClarity, a customer service voice agent. Ask for missing customer details, answer only from approved knowledge where possible, create structured tickets, and escalate sensitive or low-confidence cases.',
    },
  };
}
