import 'dotenv/config';

const configuredAllowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultAllowedOrigins = [
  'https://relayclarity.com',
  'https://www.relayclarity.com',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5174',
  'http://localhost:5174',
];

const derivedAllowedOrigins = [
  process.env.PUBLIC_BASE_URL,
  process.env.APP_BASE_URL,
  process.env.API_BASE_URL,
].filter((origin): origin is string => Boolean(origin));

export const config = {
  port: Number(process.env.PORT || 8787),
  allowedOrigin: configuredAllowedOrigins[0] || 'http://127.0.0.1:5173',
  allowedOrigins: Array.from(new Set([
    ...configuredAllowedOrigins,
    ...derivedAllowedOrigins,
    ...defaultAllowedOrigins,
  ])),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5-nano',
  realtimeModel: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime',
  realtimeVoice: process.env.OPENAI_REALTIME_VOICE || 'alloy',
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
  elevenLabsModel: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
  zoomWebhookSecretToken: process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '',
  zoomAccountId: process.env.ZOOM_ACCOUNT_ID || '',
  zoomVirtualAgentId: process.env.ZOOM_VIRTUAL_AGENT_ID || '',
  zoomContactCenterQueueId: process.env.ZOOM_CONTACT_CENTER_QUEUE_ID || '',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || '',
  twilioVoice: process.env.TWILIO_VOICE || 'Polly.Amy-Neural',
  twilioVoiceLanguage: process.env.TWILIO_VOICE_LANGUAGE || 'en-GB',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL || process.env.API_BASE_URL || '',
  appBaseUrl: process.env.APP_BASE_URL || 'http://127.0.0.1:5173',
  apiBaseUrl: process.env.API_BASE_URL || 'http://127.0.0.1:8787',
  authDbPath: process.env.AUTH_DB_PATH || 'server/data/auth.sqlite',
  authCookieName: process.env.AUTH_COOKIE_NAME || 'relayclarity_session',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:8787/api/auth/google/callback',
  hubspotClientId: process.env.HUBSPOT_CLIENT_ID || '',
  hubspotClientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
  hubspotRedirectUri: process.env.HUBSPOT_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/hubspot/callback',
  notionClientId: process.env.NOTION_CLIENT_ID || '',
  notionClientSecret: process.env.NOTION_CLIENT_SECRET || '',
  notionRedirectUri: process.env.NOTION_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/notion/callback',
  slackClientId: process.env.SLACK_CLIENT_ID || '',
  slackClientSecret: process.env.SLACK_CLIENT_SECRET || '',
  slackRedirectUri: process.env.SLACK_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/slack/callback',
  stripeClientId: process.env.STRIPE_CLIENT_ID || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeRedirectUri: process.env.STRIPE_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/stripe/callback',
};

export function hasOpenAI() {
  return Boolean(config.openaiApiKey);
}

export function hasElevenLabs() {
  return Boolean(config.elevenLabsApiKey);
}

export function hasZoomWebhookSecret() {
  return Boolean(config.zoomWebhookSecretToken);
}

export function hasOutboundTelephony() {
  return Boolean(config.twilioAccountSid && config.twilioAuthToken && config.twilioFromNumber);
}

export function hasHubSpotOAuth() {
  return Boolean(config.hubspotClientId && config.hubspotClientSecret && config.hubspotRedirectUri);
}

export function hasNotionOAuth() {
  return Boolean(config.notionClientId && config.notionClientSecret && config.notionRedirectUri);
}

export function hasSlackOAuth() {
  return Boolean(config.slackClientId && config.slackClientSecret && config.slackRedirectUri);
}

export function hasStripeOAuth() {
  return Boolean(config.stripeClientId && config.stripeSecretKey && config.stripeRedirectUri);
}
