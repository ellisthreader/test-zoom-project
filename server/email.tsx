import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';
import { config, hasSmtpEmail } from './config.js';

type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
};

export type ContactSalesEmailInput = {
  id: string;
  submittedAt: string;
  fullName: string;
  workEmail: string;
  companyName: string;
  phone: string;
  phoneCountry: string;
  phoneNational: string;
  companySize: string;
  interestedIn: string;
  message: string;
  sourceUrl: string;
  userAgent: string;
  ipAddress: string;
};

export function isEmailDeliveryConfigured() {
  return hasSmtpEmail();
}

function createSmtpTransporter() {
  if (!isEmailDeliveryConfigured()) {
    throw new Error('SMTP email is not configured.');
  }

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure || config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  const transporter = createSmtpTransporter();

  const logoPath = path.join(process.cwd(), 'assets', 'logo-review', 'relayclarity-generated-mark-transparent.png');
  const hasLogo = fs.existsSync(logoPath);

  await transporter.sendMail({
    from: config.mailFrom,
    to: input.to,
    subject: 'Reset your RelayClarity password',
    text: [
      'Reset your RelayClarity password',
      '',
      'We received a request to reset the password for your RelayClarity account.',
      '',
      `Use this one-time link to choose a new password: ${input.resetUrl}`,
      '',
      `This link expires in ${input.expiresInMinutes} minutes and can only be used once.`,
      '',
      'If you did not request this, you can ignore this email. Your current password will stay unchanged.',
    ].join('\n'),
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f9fc;color:#0f172a;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:42px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="padding:0 0 22px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding:0 12px 0 0;">
                      ${hasLogo
                        ? '<img src="cid:relayclarity-logo" width="36" height="36" alt="" style="display:block;border:0;outline:none;text-decoration:none;width:36px;height:36px;object-fit:contain;background:transparent;">'
                        : '<span style="display:block;width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#2458d6,#1aa6a3);"></span>'}
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-size:19px;font-weight:850;line-height:1;color:#08142f;letter-spacing:-0.01em;">Relay<span style="color:#2458d6;">Clarity</span></div>
                      <div style="margin-top:5px;color:#64748b;font-size:11px;font-weight:700;letter-spacing:0.02em;">Voice agent deployment platform</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #dbe6f2;border-radius:24px;background:#ffffff;box-shadow:0 24px 80px rgba(15,23,42,0.09);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:38px 38px 0 38px;">
                      <div style="display:inline-block;border:1px solid #cfe0f5;border-radius:999px;background:#f7fbff;color:#2458d6;font-size:11px;font-weight:850;letter-spacing:0.09em;text-transform:uppercase;padding:8px 12px;">Password reset</div>
                      <h1 style="margin:22px 0 0;color:#061225;font-size:34px;line-height:1.08;font-weight:880;letter-spacing:-0.03em;">Choose a new password</h1>
                      <p style="margin:14px 0 0;color:#52637a;font-size:16px;line-height:1.65;">We received a request to reset the password for your RelayClarity account.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:30px 38px 38px 38px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;border:1px solid #e1eaf5;border-radius:16px;background:#fbfdff;">
                        <tr>
                          <td style="padding:18px 20px;">
                            <p style="margin:0;color:#334155;font-size:14px;line-height:1.65;">This secure link expires in <strong style="color:#0f172a;">${input.expiresInMinutes} minutes</strong> and can only be used once. After it is used, it cannot be opened again.</p>
                          </td>
                        </tr>
                      </table>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
                        <tr>
                          <td style="border-radius:12px;background:#061225;box-shadow:0 16px 32px rgba(6,18,37,0.18);">
                            <a href="${escapeAttribute(input.resetUrl)}" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:15px;font-weight:850;padding:15px 22px;border-radius:12px;">Reset password</a>
                          </td>
                        </tr>
                      </table>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5edf6;">
                        <tr>
                          <td style="padding:22px 0 0;">
                            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;"><strong style="color:#0f172a;">Didn&apos;t request this?</strong> Ignore this email. Your current password stays unchanged.</p>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:22px 0 8px;color:#8a98ad;font-size:12px;line-height:1.6;">If the button does not work, copy this link:</p>
                      <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">${escapeHtml(input.resetUrl)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 4px 0;">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;text-align:center;">RelayClarity security email</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    attachments: hasLogo
      ? [{
          filename: 'relayclarity-logo.png',
          path: logoPath,
          cid: 'relayclarity-logo',
          contentType: 'image/png',
        }]
      : [],
  });
}

export async function sendContactSalesEmail(input: ContactSalesEmailInput) {
  const transporter = createSmtpTransporter();
  const submittedDate = new Date(input.submittedAt);
  const submittedLabel = Number.isNaN(submittedDate.getTime())
    ? input.submittedAt
    : submittedDate.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });
  const rows = [
    ['Full name', input.fullName],
    ['Work email', input.workEmail],
    ['Company name', input.companyName],
    ['Phone', input.phone || 'Not provided'],
    ['Phone country', input.phoneCountry || 'Not provided'],
    ['Company size', input.companySize || 'Not provided'],
    ['Interested in', input.interestedIn],
    ['Message', input.message || 'Not provided'],
    ['Source URL', input.sourceUrl || 'Not provided'],
    ['User agent', input.userAgent || 'Not provided'],
    ['IP address', input.ipAddress || 'Not provided'],
    ['Submission ID', input.id],
  ];

  await transporter.sendMail({
    from: config.mailFrom,
    to: config.contactSalesTo,
    replyTo: input.workEmail,
    subject: `Contact sales request from ${input.companyName}`,
    text: [
      'New RelayClarity contact sales request',
      '',
      `Submitted: ${submittedLabel}`,
      '',
      ...rows.map(([label, value]) => `${label}: ${value}`),
    ].join('\n'),
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#eef4fb;color:#0f172a;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4fb;padding:36px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="padding:0 0 16px;">
                <div style="font-size:22px;font-weight:850;color:#08142f;">Relay<span style="color:#2458d6;">Clarity</span></div>
              </td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #d8e3f0;border-radius:18px;background:#ffffff;box-shadow:0 24px 70px rgba(15,23,42,0.10);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#071332;padding:28px 32px;">
                      <div style="display:inline-block;border-radius:999px;background:rgba(96,165,250,0.14);color:#bfdbfe;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:8px 12px;">Contact sales</div>
                      <h1 style="margin:18px 0 0;color:#ffffff;font-size:28px;line-height:1.2;font-weight:850;">New request from ${escapeHtml(input.companyName)}</h1>
                      <p style="margin:10px 0 0;color:#c8d7ea;font-size:15px;line-height:1.55;">Submitted ${escapeHtml(submittedLabel)}. Reply directly to ${escapeHtml(input.workEmail)}.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px 32px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                        ${rows.map(([label, value]) => `
                          <tr>
                            <td style="width:170px;border-bottom:1px solid #e5ebf4;padding:13px 14px 13px 0;color:#64748b;font-size:13px;font-weight:800;vertical-align:top;">${escapeHtml(label)}</td>
                            <td style="border-bottom:1px solid #e5ebf4;padding:13px 0;color:#0f172a;font-size:14px;line-height:1.55;vertical-align:top;word-break:break-word;">${escapeHtml(value)}</td>
                          </tr>`).join('')}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 4px 0;">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;text-align:center;">RelayClarity contact sales notification</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
