import { config, hasElevenLabs, hasOpenAI, hasOutboundTelephony, hasZoomWebhookSecret } from '../config.js';

export function getProviderStatus() {
  return {
    openai: {
      configured: hasOpenAI(),
      model: config.openaiModel,
      realtimeModel: config.realtimeModel,
      realtimeVoice: config.realtimeVoice,
      capabilities: ['reasoning', 'structured_ticketing', 'builder_planning', 'realtime_voice'],
    },
    elevenlabs: {
      configured: hasElevenLabs(),
      model: config.elevenLabsModel,
      voiceId: config.elevenLabsVoiceId,
      capabilities: ['text_to_speech', 'voice_quality_testing'],
    },
    telephony: {
      configured: hasZoomWebhookSecret() || hasOutboundTelephony(),
      mode: hasOutboundTelephony() ? 'outbound_test_call_and_zoom_contact_center' : 'zoom_contact_center_virtual_agent',
      zoomWebhook: '/api/zoom/contact-center/events',
      legacyPrototypeInboundWebhook: '/api/telephony/inbound',
      legacyPrototypeTranscriptWebhook: '/api/telephony/transcript',
      outboundDemoCall: '/api/telephony/outbound-demo',
      accountIdConfigured: Boolean(config.zoomAccountId),
      virtualAgentIdConfigured: Boolean(config.zoomVirtualAgentId),
      contactCenterQueueIdConfigured: Boolean(config.zoomContactCenterQueueId),
      outboundTelephonyConfigured: hasOutboundTelephony(),
      note: 'Configure this endpoint as a Zoom Contact Center webhook subscription and use Zoom Virtual Agent/Contact Center for production routing.',
    },
    adapters: {
      crm: 'mock_json',
      helpdesk: 'in_memory',
      knowledgeBase: 'local_json',
    },
  };
}
