import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { config } from './config.js';
import { sendContactSalesEmail, type ContactSalesEmailInput } from './email.js';

const interestLabels: Record<string, string> = {
  'voice-agent': 'Launch an AI voice agent',
  'chat-handoff': 'Improve chat and handoffs',
  'call-volume': 'Reduce call volume',
  'regulated-support': 'Handle regulated support',
};

export async function handleContactSalesSubmission(req: Request, res: Response) {
  const now = new Date().toISOString();
  const fullName = requiredText(req.body?.name, 'Full name');
  const workEmail = requiredText(req.body?.email, 'Work email');
  const companyName = requiredText(req.body?.company, 'Company name');
  const interestedInValue = requiredText(req.body?.interestedIn, 'Interest');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
    throw new Error('A valid work email is required.');
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || req.ip || '';
  const phone = text(req.body?.phone);
  const phoneNational = text(req.body?.phoneNational);
  const phoneCountry = text(req.body?.phoneCountry);
  const companySize = text(req.body?.companySize);
  const interestedIn = interestLabels[interestedInValue] || interestedInValue;
  const message = text(req.body?.message, 2000);
  const sourceUrl = text(req.body?.sourceUrl, 500);
  const userAgent = text(req.get('user-agent'), 500);
  const id = `cs_${crypto.randomUUID()}`;

  const submission: ContactSalesEmailInput = {
    id,
    submittedAt: now,
    fullName,
    workEmail,
    companyName,
    phone,
    phoneCountry,
    phoneNational,
    companySize,
    interestedIn,
    message,
    sourceUrl,
    userAgent,
    ipAddress,
  };

  await logContactSalesSubmission(submission);
  await sendContactSalesEmail(submission);

  res.status(201).json({
    ok: true,
    id,
    emailDelivery: 'sent',
    message: 'Contact sales request sent.',
  });
}

async function logContactSalesSubmission(submission: ContactSalesEmailInput) {
  const dataDir = path.join(process.cwd(), 'server', 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.appendFile(
    path.join(dataDir, 'contact-sales-submissions.jsonl'),
    `${JSON.stringify({
      ...submission,
      emailTo: config.contactSalesTo,
      loggedAt: new Date().toISOString(),
    })}\n`,
    'utf8'
  );
}

function requiredText(value: unknown, label: string) {
  const normalized = text(value, 240);
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

function text(value: unknown, maxLength = 300) {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : '';
}
