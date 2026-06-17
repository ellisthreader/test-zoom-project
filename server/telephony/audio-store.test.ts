import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getTelephonyAudio, storeTelephonyAudio } from './audio-store.js';

test('telephony audio store returns buffered audio by id', () => {
  const buffer = Buffer.from('audio-bytes');
  const id = storeTelephonyAudio(buffer, 'audio/mpeg');
  const stored = getTelephonyAudio(id);

  assert.ok(stored);
  assert.equal(stored.contentType, 'audio/mpeg');
  assert.deepEqual(stored.buffer, buffer);
});

test('telephony audio store expires old audio', () => {
  const id = storeTelephonyAudio(Buffer.from('expired'), 'audio/mpeg', -1);

  assert.equal(getTelephonyAudio(id), null);
});
