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
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5.4-nano',
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
  integrationEncryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || 'RelayClarity <support@relayclarity.com>',
  contactSalesTo: process.env.CONTACT_SALES_TO || 'ellis.threader3001@gmail.com',
  obsidianVaultPath: process.env.OBSIDIAN_VAULT_PATH || '',
  obsidianKnowledgePaths: process.env.OBSIDIAN_KNOWLEDGE_PATHS || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:8787/api/auth/google/callback',
  hubspotClientId: process.env.HUBSPOT_CLIENT_ID || '',
  hubspotClientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
  hubspotRedirectUri: process.env.HUBSPOT_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/hubspot/callback',
  salesforceClientId: process.env.SALESFORCE_CLIENT_ID || '',
  salesforceClientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
  salesforceRedirectUri: process.env.SALESFORCE_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/salesforce/callback',
  salesforceLoginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
  notionClientId: process.env.NOTION_CLIENT_ID || '',
  notionClientSecret: process.env.NOTION_CLIENT_SECRET || '',
  notionRedirectUri: process.env.NOTION_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/notion/callback',
  zendeskClientId: process.env.ZENDESK_CLIENT_ID || '',
  zendeskClientSecret: process.env.ZENDESK_CLIENT_SECRET || '',
  zendeskRedirectUri: process.env.ZENDESK_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/zendesk/callback',
  zendeskSubdomain: process.env.ZENDESK_SUBDOMAIN || '',
  slackClientId: process.env.SLACK_CLIENT_ID || '',
  slackClientSecret: process.env.SLACK_CLIENT_SECRET || '',
  slackRedirectUri: process.env.SLACK_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/slack/callback',
  stripeClientId: process.env.STRIPE_CLIENT_ID || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeRedirectUri: process.env.STRIPE_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/stripe/callback',
  stripeLaunchMonthlyPriceId: process.env.STRIPE_LAUNCH_MONTHLY_PRICE_ID || '',
  stripeLaunchAnnualPriceId: process.env.STRIPE_LAUNCH_ANNUAL_PRICE_ID || '',
  stripeOperateMonthlyPriceId: process.env.STRIPE_OPERATE_MONTHLY_PRICE_ID || '',
  stripeOperateAnnualPriceId: process.env.STRIPE_OPERATE_ANNUAL_PRICE_ID || '',
  oktaClientId: process.env.OKTA_CLIENT_ID || '',
  oktaClientSecret: process.env.OKTA_CLIENT_SECRET || '',
  oktaRedirectUri: process.env.OKTA_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/okta/callback',
  oktaIssuerUrl: process.env.OKTA_ISSUER_URL || '',
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID || '',
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  microsoftRedirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/microsoft-teams/callback',
  microsoftTenantId: process.env.MICROSOFT_TENANT_ID || 'common',
  shopifyClientId: process.env.SHOPIFY_CLIENT_ID || '',
  shopifyClientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
  shopifyRedirectUri: process.env.SHOPIFY_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/shopify/callback',
  shopifyShopDomain: process.env.SHOPIFY_SHOP_DOMAIN || '',
  googleIntegrationClientId: process.env.GOOGLE_INTEGRATION_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
  googleIntegrationClientSecret: process.env.GOOGLE_INTEGRATION_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
  googleCalendarRedirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/google-calendar/callback',
  googleAnalyticsRedirectUri: process.env.GOOGLE_ANALYTICS_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/google-analytics/callback',
  gmailRedirectUri: process.env.GMAIL_REDIRECT_URI || 'http://127.0.0.1:8787/api/integrations/oauth/gmail/callback',
  snowflakeAccount: process.env.SNOWFLAKE_ACCOUNT || '',
  snowflakePat: process.env.SNOWFLAKE_PAT || '',
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

export function hasSmtpEmail() {
  return Boolean(config.smtpHost && config.smtpPort && config.smtpUser && config.smtpPass && config.mailFrom);
}

export function hasHubSpotOAuth() {
  return Boolean(config.hubspotClientId && config.hubspotClientSecret && config.hubspotRedirectUri);
}

export function hasSalesforceOAuth() {
  return Boolean(config.salesforceClientId && config.salesforceClientSecret && config.salesforceRedirectUri && config.salesforceLoginUrl);
}

export function hasNotionOAuth() {
  return Boolean(config.notionClientId && config.notionClientSecret && config.notionRedirectUri);
}

export function hasZendeskOAuth() {
  return Boolean(config.zendeskClientId && config.zendeskClientSecret && config.zendeskRedirectUri && config.zendeskSubdomain);
}

export function hasSlackOAuth() {
  return Boolean(config.slackClientId && config.slackClientSecret && config.slackRedirectUri);
}

export function hasStripeOAuth() {
  return Boolean(config.stripeClientId && config.stripeSecretKey && config.stripeRedirectUri);
}

export function hasOktaOAuth() {
  return Boolean(config.oktaClientId && config.oktaClientSecret && config.oktaRedirectUri && config.oktaIssuerUrl);
}

export function hasMicrosoftOAuth() {
  return Boolean(config.microsoftClientId && config.microsoftClientSecret && config.microsoftRedirectUri);
}

export function hasShopifyOAuth() {
  return Boolean(config.shopifyClientId && config.shopifyClientSecret && config.shopifyRedirectUri && config.shopifyShopDomain);
}

export function hasGoogleCalendarOAuth() {
  return Boolean(config.googleIntegrationClientId && config.googleIntegrationClientSecret && config.googleCalendarRedirectUri);
}

export function hasGoogleAnalyticsOAuth() {
  return Boolean(config.googleIntegrationClientId && config.googleIntegrationClientSecret && config.googleAnalyticsRedirectUri);
}

export function hasGmailOAuth() {
  return Boolean(config.googleIntegrationClientId && config.googleIntegrationClientSecret && config.gmailRedirectUri);
}

export function hasSnowflakeApiKey() {
  return Boolean(config.snowflakeAccount && config.snowflakePat);
}
