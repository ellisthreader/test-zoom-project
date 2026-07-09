import type { Request, Response } from 'express';
import { config } from './config.js';
import type { AuthUser } from './auth.js';

type BillingPeriod = 'monthly' | 'annual';
type PurchasablePlanId = 'launch' | 'operate';

type BillingPlan = {
  id: PurchasablePlanId;
  name: string;
  summary: string;
  monthly: number;
  annual: number;
  features: string[];
  priceIds: Record<BillingPeriod, string>;
};

const billingPlans: Record<PurchasablePlanId, BillingPlan> = {
  launch: {
    id: 'launch',
    name: 'Launch',
    summary: 'For teams launching their first AI phone or chat agent.',
    monthly: 499,
    annual: 399,
    features: [
      'One AI agent for voice or chat',
      'Business brief and approved answers',
      'Launch test pack',
      'Human handoff summaries',
      'Basic conversation reporting',
    ],
    priceIds: {
      monthly: config.stripeLaunchMonthlyPriceId,
      annual: config.stripeLaunchAnnualPriceId,
    },
  },
  operate: {
    id: 'operate',
    name: 'Operate',
    summary: 'For teams running live customer conversations every day.',
    monthly: 1250,
    annual: 999,
    features: [
      'Voice and chat agents',
      'CRM, helpdesk, and knowledge integrations',
      'Scenario testing before changes go live',
      'Live handoff and containment analytics',
      'Weekly optimisation review',
    ],
    priceIds: {
      monthly: config.stripeOperateMonthlyPriceId,
      annual: config.stripeOperateAnnualPriceId,
    },
  },
};

export function handleCreateCheckoutSession(req: Request, res: Response, user: AuthUser) {
  const planId = normalizePlanId(req.body?.planId);
  const billing = normalizeBillingPeriod(req.body?.billing);

  if (!config.stripeSecretKey) {
    res.status(503).json({ error: 'Stripe checkout is not configured. Add STRIPE_SECRET_KEY to enable payments.' });
    return;
  }

  if (!planId) {
    res.status(400).json({ error: 'Choose a purchasable plan before checkout.' });
    return;
  }

  void createStripeCheckoutSession(billingPlans[planId], billing, user)
    .then((session) => {
      if (!session.url) {
        res.status(502).json({ error: 'Stripe did not return a checkout URL.' });
        return;
      }

      res.status(201).json({
        id: session.id,
        url: session.url,
      });
    })
    .catch((error) => {
      res.status(502).json({ error: error instanceof Error ? error.message : 'Unable to create Stripe checkout session.' });
    });
}

export function handleRetrieveCheckoutSession(req: Request, res: Response, user: AuthUser) {
  const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id.trim() : '';

  if (!config.stripeSecretKey) {
    res.status(503).json({ error: 'Stripe checkout is not configured. Add STRIPE_SECRET_KEY to enable payments.' });
    return;
  }

  if (!sessionId || !/^cs_(test|live)_/.test(sessionId)) {
    res.status(400).json({ error: 'A valid Stripe checkout session id is required.' });
    return;
  }

  void retrieveStripeCheckoutSession(sessionId)
    .then((session) => {
      if (session.client_reference_id && session.client_reference_id !== user.id) {
        res.status(403).json({ error: 'This checkout session belongs to another account.' });
        return;
      }

      res.json({
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email || session.customer_email || user.email,
        planId: session.metadata?.planId || '',
        planName: session.metadata?.planName || '',
        billing: session.metadata?.billing || '',
        subscriptionId: typeof session.subscription === 'string' ? session.subscription : '',
      });
    })
    .catch((error) => {
      res.status(502).json({ error: error instanceof Error ? error.message : 'Unable to retrieve Stripe checkout session.' });
    });
}

function normalizePlanId(value: unknown): PurchasablePlanId | null {
  return value === 'launch' || value === 'operate' ? value : null;
}

function normalizeBillingPeriod(value: unknown): BillingPeriod {
  return value === 'annual' ? 'annual' : 'monthly';
}

async function createStripeCheckoutSession(plan: BillingPlan, billing: BillingPeriod, user: AuthUser) {
  const params = new URLSearchParams();
  const priceId = plan.priceIds[billing];
  const monthlyEquivalent = billing === 'annual' ? plan.annual : plan.monthly;
  const checkoutAmount = billing === 'annual' ? plan.annual * 12 : plan.monthly;
  const successUrl = new URL('/checkout/success', config.appBaseUrl);
  const cancelUrl = new URL('/checkout', config.appBaseUrl);

  successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  cancelUrl.searchParams.set('plan', plan.id);
  cancelUrl.searchParams.set('billing', billing);

  params.set('mode', 'subscription');
  params.set('success_url', successUrl.toString());
  params.set('cancel_url', cancelUrl.toString());
  params.set('client_reference_id', user.id);
  params.set('customer_email', user.email);
  params.set('billing_address_collection', 'required');
  params.set('allow_promotion_codes', 'true');
  params.set('line_items[0][quantity]', '1');
  params.set('metadata[userId]', user.id);
  params.set('metadata[planId]', plan.id);
  params.set('metadata[planName]', plan.name);
  params.set('metadata[billing]', billing);
  params.set('metadata[monthlyEquivalent]', String(monthlyEquivalent));
  params.set('subscription_data[metadata][userId]', user.id);
  params.set('subscription_data[metadata][planId]', plan.id);
  params.set('subscription_data[metadata][billing]', billing);

  if (priceId) {
    params.set('line_items[0][price]', priceId);
  } else {
    params.set('line_items[0][price_data][currency]', 'gbp');
    params.set('line_items[0][price_data][unit_amount]', String(checkoutAmount * 100));
    params.set('line_items[0][price_data][recurring][interval]', billing === 'annual' ? 'year' : 'month');
    params.set('line_items[0][price_data][product_data][name]', `RelayClarity ${plan.name}`);
    params.set('line_items[0][price_data][product_data][description]', plan.summary);
    params.set('line_items[0][price_data][product_data][metadata][planId]', plan.id);
  }

  return stripeRequest<{ id: string; url?: string }>('/v1/checkout/sessions', {
    method: 'POST',
    body: params,
  });
}

async function retrieveStripeCheckoutSession(sessionId: string) {
  return stripeRequest<{
    id: string;
    status: string;
    payment_status: string;
    client_reference_id?: string;
    customer_email?: string;
    customer_details?: { email?: string };
    metadata?: Record<string, string>;
    subscription?: string | { id?: string };
  }>(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
  });
}

async function stripeRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  const payload = await response.json() as { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(payload.error?.message || `Stripe returned ${response.status}.`);
  }

  return payload as T;
}
