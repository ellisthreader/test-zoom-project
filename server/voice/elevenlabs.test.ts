import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeSpeech } from './elevenlabs.js';

test('ElevenLabs speech adapter returns mock metadata without an API key', async () => {
  const result = await synthesizeSpeech({
    text: 'Thanks for calling ChatoraAi support.',
    mock: true,
  });

  assert.equal(result.mode, 'mock');
  assert.equal(result.provider, 'elevenlabs');
  assert.equal(result.estimatedCharacters, 'Thanks for calling ChatoraAi support.'.length);
});
