import { config, hasElevenLabs, hasOutboundTelephony } from '../config.js';
import { synthesizeSpeech } from '../voice/elevenlabs.js';
import { storeTelephonyAudio } from './audio-store.js';

type DemoCallInput = {
  to: string;
  businessName?: string;
  greeting?: string;
  callerNeed?: string;
  approvedAnswer?: string;
  handoff?: string;
  reference?: string;
};

export async function placeOutboundDemoCall(input: DemoCallInput) {
  const to = normalizePhone(input.to);
  if (!to) throw new Error('A valid destination phone number is required');

  if (!hasOutboundTelephony()) {
    return {
      mode: 'mock',
      provider: 'twilio',
      to,
      message: 'No outbound telephony credentials are configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to place a real call.',
    };
  }

  const twiml = await buildDemoTwiml(input);
  const body = new URLSearchParams({
    To: to,
    From: config.twilioFromNumber,
    Twiml: twiml.xml,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.twilioAccountSid)}/Calls.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Outbound call failed: ${response.status} ${JSON.stringify(result)}`);
  }

  return {
    mode: 'call',
    provider: 'twilio',
    to,
    from: config.twilioFromNumber,
    callSid: result.sid,
    status: result.status,
    voiceProvider: twiml.provider,
    voiceMessage: twiml.message,
    message: 'Outbound demo call requested.',
  };
}

async function buildDemoTwiml(input: DemoCallInput) {
  const script = buildDemoScript(input);
  let elevenLabsFallbackReason = '';

  if (hasElevenLabs()) {
    if (hasPublicAudioBaseUrl() && await isPublicAudioBaseReachable()) {
      try {
        const speech = await synthesizeSpeech({ text: script });

        if (speech.mode === 'audio' && speech.audioBase64) {
          const audioId = storeTelephonyAudio(Buffer.from(speech.audioBase64, 'base64'), speech.contentType);
          const audioUrl = `${config.publicBaseUrl.replace(/\/$/, '')}/api/telephony/audio/${encodeURIComponent(audioId)}`;

          return {
            provider: 'elevenlabs',
            message: 'Using ElevenLabs audio served through the backend.',
            xml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${escapeXml(audioUrl)}</Play>
</Response>`,
          };
        }
      } catch (error) {
        elevenLabsFallbackReason = error instanceof Error ? error.message : String(error);
      }
    } else {
      elevenLabsFallbackReason = 'PUBLIC_BASE_URL is not reachable over public HTTPS.';
    }
  }

  const sayAttrs = `voice="${escapeXml(config.twilioVoice)}" language="${escapeXml(config.twilioVoiceLanguage)}"`;

  return {
    provider: hasElevenLabs() ? 'twilio_fallback_local_audio_url_required' : 'twilio',
    message: hasElevenLabs()
      ? `ElevenLabs is configured, but generated audio is unavailable right now. Falling back to Twilio neural voice.${elevenLabsFallbackReason ? ` Reason: ${elevenLabsFallbackReason}` : ''}`
      : 'ElevenLabs is not configured. Falling back to Twilio neural voice.',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${script.split('\n').filter(Boolean).map((line) => `<Say ${sayAttrs}>${escapeXml(line)}</Say>\n  <Pause length="1"/>`).join('\n  ')}
</Response>`,
  };
}

function buildDemoScript(input: DemoCallInput) {
  const businessName = input.businessName?.trim() || 'your business';
  const greeting = input.greeting?.trim() || `Hi, thanks for calling ${businessName}.`;
  const callerNeed = input.callerNeed?.trim() || 'a common caller request';
  const approvedAnswer = input.approvedAnswer?.trim() || 'I do not have an approved answer for that just yet.';
  const handoff = input.handoff?.trim() || 'route this to your team';
  const reference = input.reference?.trim() || '';

  return [
    greeting,
    'This is a quick test of your RelayClarity phone agent.',
    `For example, if a caller said, ${callerNeed}, I would respond using your approved business information.`,
    approvedAnswer,
    `If I could not resolve it safely, I would ${handoff}.${reference ? ` Reference: ${reference}.` : ''}`,
    'That is the end of the test call. Speak soon.',
  ].join('\n');
}

function hasPublicAudioBaseUrl() {
  if (!config.publicBaseUrl) return false;

  try {
    const url = new URL(config.publicBaseUrl);
    return url.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

async function isPublicAudioBaseReachable() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);

  try {
    const response = await fetch(`${config.publicBaseUrl.replace(/\/$/, '')}/api/health`, {
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeDemoPhone(value: string) {
  const normalized = String(value || '').replace(/[^\d+]/g, '');
  if (!/^\+\d{8,15}$/.test(normalized)) return '';
  return normalized;
}

const normalizePhone = normalizeDemoPhone;

function escapeXml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
