import test from 'node:test';
import assert from 'node:assert/strict';
import { createRealtimeClientSecretBody } from './client.js';

test('Realtime client secret body uses GA audio output voice shape', () => {
  const body = createRealtimeClientSecretBody();

  assert.equal(body.session.type, 'realtime');
  assert.deepEqual(body.session.output_modalities, ['audio']);
  assert.equal(body.session.audio.output.voice, 'alloy');
  assert.equal(Object.hasOwn(body.session, 'voice'), false);
});
