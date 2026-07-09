import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../../src/main.tsx'), 'utf8');

function functionBody(signature: string) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${signature} should exist`);

  const arrow = source.indexOf('=>', start);
  assert.notEqual(arrow, -1, `${signature} should be an arrow function`);

  const bodyStart = source.indexOf('{', arrow);
  assert.notEqual(bodyStart, -1, `${signature} should have a body`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(bodyStart, index + 1);
      }
    }
  }

  throw new Error(`${signature} body was not closed`);
}

test('voice tile click previews only; confirmation audio is reserved for Continue', () => {
  const selectVoiceBody = functionBody('const selectVoice =');
  const nextStepBody = functionBody('const nextStep = () =>');

  assert.match(source, /const \[hasSelectedVoice, setHasSelectedVoice\] = useState\(false\)/);
  assert.match(source, /step === 3 && !voiceSettingsRevealed \? hasSelectedVoice : stepCompletion\[step\]/);

  assert.match(selectVoiceBody, /setHasSelectedVoice\(true\)/);
  assert.match(selectVoiceBody, /setConfirmedVoiceId\(""\)/);
  assert.match(selectVoiceBody, /playVoiceSample\(voice\)/);
  assert.doesNotMatch(selectVoiceBody, /setConfirmedVoiceId\(voice\.id\)/);
  assert.doesNotMatch(selectVoiceBody, /playVoiceConfirmation\(voice\)/);

  assert.match(nextStepBody, /setConfirmedVoiceId\(selectedVoiceId\)/);
  assert.match(nextStepBody, /playVoiceConfirmation\(selectedVoice\)/);
});
