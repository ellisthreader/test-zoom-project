import { config, hasElevenLabs } from '../config.js';

type SynthesizeSpeechInput = {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speed?: number;
  mock?: boolean;
};

export async function synthesizeSpeech({
  text,
  voiceId = config.elevenLabsVoiceId,
  modelId = config.elevenLabsModel,
  stability = 0.55,
  similarityBoost = 0.75,
  style = 0.1,
  speed = 1,
  mock = false,
}: SynthesizeSpeechInput) {
  if (!text) throw new Error('text is required');

  if (mock || !hasElevenLabs()) {
    return {
      mode: 'mock',
      provider: 'elevenlabs',
      voiceId,
      modelId,
      estimatedCharacters: text.length,
      message: 'Set ELEVENLABS_API_KEY to generate real speech audio.',
    };
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': config.elevenLabsApiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        speed,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs speech request failed: ${response.status} ${body}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return {
    mode: 'audio',
    provider: 'elevenlabs',
    contentType: 'audio/mpeg',
    voiceId,
    modelId,
    audioBase64: audioBuffer.toString('base64'),
  };
}
