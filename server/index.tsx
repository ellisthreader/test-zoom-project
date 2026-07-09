import express from 'express';
import type { ErrorRequestHandler } from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config, hasOpenAI } from './config.js';
import { getRequestUser, handleCurrentUser, handleEmailLogin, handleEmailSignup, handleGoogleCallback, handleGoogleStart, handleListProjects, handleLogout, handleOnboardingComplete, handlePasswordResetConfirm, handlePasswordResetRequest, handleSaveProject, requireAuth } from './auth.js';
import { listKnowledgeBase } from './adapters/kb.js';
import { listTickets } from './adapters/helpdesk.js';
import { connectIntegration, finalizeOAuthConnection, getConnectedIntegrations, listIntegrationProviders, testIntegration } from './adapters/integrations.js';
import { runIntegrationAction } from './adapters/live-integrations.js';
import { buildAgentPlan, createTicketFromConversation, runCustomerTurn, runDemoCustomerTurn } from './ai/orchestrator.js';
import { runWorkspaceAssistant } from './ai/workspace.js';
import { createRealtimeClientSecret } from './ai/client.js';
import { synthesizeSpeech } from './voice/elevenlabs.js';
import { checkVoiceRateLimit, recordVoiceRequest } from './voice/rate-limit.js';
import { getProviderStatus } from './providers/status.js';
import { normalizeDemoPhone, placeOutboundDemoCall } from './telephony/outbound.js';
import { checkCallRateLimit, recordCall } from './telephony/rate-limit.js';
import { getTelephonyAudio } from './telephony/audio-store.js';
import { handleZoomContactCenterEvent, verifyZoomWebhookSignature } from './zoom/webhook.js';
import { handleContactSalesSubmission } from './contact-sales.js';
import { handleCreateCheckoutSession, handleRetrieveCheckoutSession } from './billing.js';
import type { ZoomWebhookEvent } from './types.js';

export function createApp() {
  const app = express();
  const distPath = path.join(process.cwd(), 'dist');
  const indexPath = path.join(distPath, 'index.html');

  if (existsSync(indexPath)) {
    app.use(express.static(distPath));
  }

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || config.allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }));
  app.use(express.json({
    limit: '1mb',
    verify: (req, _res, buffer) => {
      (req as typeof req & { rawBody?: string }).rawBody = buffer.toString('utf8');
    },
  }));
  app.use(express.urlencoded({ extended: false }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'relayclarity-ai-backend',
      workspaceRoot: process.cwd(),
      authSchemaVersion: 2,
      openai: hasOpenAI() ? 'configured' : 'mock_fallback',
    });
  });

  app.get('/api/providers/status', (_req, res) => {
    res.json(getProviderStatus());
  });

  app.post('/api/contact-sales', async (req, res, next) => {
    try {
      await handleContactSalesSubmission(req, res);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/billing/checkout-session', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) {
      return;
    }

    handleCreateCheckoutSession(req, res, user);
  });

  app.get('/api/billing/checkout-session', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) {
      return;
    }

    handleRetrieveCheckoutSession(req, res, user);
  });

  app.get('/api/auth/me', handleCurrentUser);

  app.post('/api/auth/email', handleEmailLogin);

  app.post('/api/auth/signup', handleEmailSignup);

  app.post('/api/auth/password-reset/request', async (req, res, next) => {
    try {
      await handlePasswordResetRequest(req, res);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/password-reset/confirm', handlePasswordResetConfirm);

  app.post('/api/auth/logout', handleLogout);

  app.post('/api/auth/onboarding/complete', handleOnboardingComplete);

  app.get('/api/auth/google/start', handleGoogleStart);

  app.get('/api/auth/google/callback', async (req, res, next) => {
    try {
      await handleGoogleCallback(req, res);
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/dashboard', (req, res, next) => {
    if (!requireAuth(req, res)) {
      return;
    }

    next();
  });

  app.get('/api/dashboard/session', (req, res) => {
    res.json({ user: requireAuth(req, res) });
  });

  app.get('/api/dashboard/projects', handleListProjects);

  app.post('/api/dashboard/projects', handleSaveProject);

  app.post('/api/dashboard/assistant', async (req, res, next) => {
    try {
      res.json(await runWorkspaceAssistant(req.body));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/kb', (_req, res) => {
    res.json({ items: listKnowledgeBase() });
  });

  app.get('/api/tickets', async (_req, res) => {
    res.json({ items: await listTickets() });
  });

  app.get('/api/integrations/catalog', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) {
      return;
    }

    res.json({
      providers: listIntegrationProviders(user.id),
      connected: getConnectedIntegrations(user.id),
    });
  });

  app.post('/api/integrations/connect', (req, res, next) => {
    try {
      const user = requireAuth(req, res);
      if (!user) {
        return;
      }

      res.status(201).json(connectIntegration(req.body, user.id));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/integrations/:providerId/test', async (req, res, next) => {
    try {
      const user = requireAuth(req, res);
      if (!user) {
        return;
      }

      res.json(await testIntegration(req.params.providerId, user.id));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/integrations/:providerId/action', async (req, res, next) => {
    try {
      const user = requireAuth(req, res);
      if (!user) {
        return;
      }

      res.json(await runIntegrationAction(user.id, req.params.providerId, req.body));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/integrations/oauth/:provider/callback', async (req, res, next) => {
    try {
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const connection = code ? await finalizeOAuthConnection(req.params.provider, code, state) : null;

      res.type('html').send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>RelayClarity integration connected</title></head>
  <body>
    <script>
      window.opener?.postMessage({ type: 'relayclarity.integration.connected', provider: ${JSON.stringify(req.params.provider)}, status: ${JSON.stringify(connection?.status || 'missing_code')} }, '*');
      window.close();
    </script>
    <p>Integration approved. You can return to RelayClarity.</p>
  </body>
</html>`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/ai/chat', async (req, res, next) => {
    try {
      const user = getRequestUser(req);
      res.json(await runCustomerTurn({
        ...req.body,
        integrationUserId: user?.id || '',
      }));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/demo/chat', async (req, res, next) => {
    try {
      res.json(await runDemoCustomerTurn(req.body));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/ai/tickets/from-conversation', async (req, res, next) => {
    try {
      const user = getRequestUser(req);
      res.status(201).json(await createTicketFromConversation({
        ...req.body,
        integrationUserId: user?.id || '',
      }));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/ai/builder', async (req, res, next) => {
    try {
      res.json(await buildAgentPlan(req.body));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/realtime/session', async (_req, res, next) => {
    try {
      res.json(await createRealtimeClientSecret());
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/voice/speech', async (req, res, next) => {
    try {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || req.ip || 'unknown';
      const verdict = checkVoiceRateLimit(ip);

      if (!verdict.allowed) {
        res.status(429).json({ error: verdict.reason, retryAfterSeconds: verdict.retryAfterSeconds });
        return;
      }

      const result = await synthesizeSpeech(req.body);
      recordVoiceRequest(ip);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/zoom/contact-center/events', async (req, res, next) => {
    try {
      const event = req.body as ZoomWebhookEvent;

      if (event.event === 'endpoint.url_validation') {
        const result = await handleZoomContactCenterEvent(event);
        res.json(result.response);
        return;
      }

      if (!verifyZoomWebhookSignature(req)) {
        res.status(401).json({ error: 'Invalid Zoom webhook signature' });
        return;
      }

      res.json(await handleZoomContactCenterEvent(event));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/telephony/inbound', (req, res) => {
    const from = req.body.From || req.body.from || 'unknown';
    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thanks for calling RelayClarity support. I can help create a ticket, answer common questions, or route you to a human.</Say>
  <Gather input="speech" action="/api/telephony/transcript" method="POST" speechTimeout="auto">
    <Say>Please tell me what you need help with.</Say>
  </Gather>
  <Say>I did not catch that. I will create a missed call record for ${from}.</Say>
</Response>`);
  });

  app.post('/api/telephony/outbound-demo', async (req, res, next) => {
    try {
      const phone = normalizeDemoPhone(req.body?.to);
      if (!phone) {
        res.status(400).json({ error: 'A valid destination phone number is required' });
        return;
      }

      const forwarded = req.headers['x-forwarded-for'];
      const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || req.ip || 'unknown';

      const verdict = checkCallRateLimit(ip, phone);
      if (!verdict.allowed) {
        res.status(429).json({ error: verdict.reason, retryAfterSeconds: verdict.retryAfterSeconds });
        return;
      }

      const result = await placeOutboundDemoCall(req.body);
      if (result.mode === 'call') {
        recordCall(ip, phone);
      }
      res.status(result.mode === 'call' ? 201 : 200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/telephony/audio/:id', (req, res) => {
    const audio = getTelephonyAudio(req.params.id);

    if (!audio) {
      res.status(404).json({ error: 'Audio not found or expired' });
      return;
    }

    res.setHeader('Content-Type', audio.contentType);
    res.setHeader('Cache-Control', 'private, max-age=900');
    res.send(audio.buffer);
  });

  app.post('/api/telephony/transcript', async (req, res, next) => {
    try {
      const spokenText = req.body.SpeechResult || req.body.transcript || '';
      const from = req.body.From || req.body.from || '';
      const result = await runCustomerTurn({
        channel: 'voice',
        customer: { phone: from },
        message: spokenText,
      });

      res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(result.reply)}</Say>
  ${result.escalate ? '<Say>I am routing this to a human support agent.</Say>' : ''}
</Response>`);
    } catch (error) {
      next(error);
    }
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const message = error instanceof Error ? error.message : String(error);
    const status = /required/.test(message) ? 400 : 500;
    res.status(status).json({ error: message });
  };

  if (existsSync(indexPath)) {
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(indexPath);
    });
  }

  app.use(errorHandler);

  return app;
}

function escapeXml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
