import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreRisk } from './risk-model.js';
import type { RiskScoringInput } from '../types.js';

type Fixture = {
  input: RiskScoringInput;
  expected: {
    riskLevel: 'low' | 'medium' | 'high';
    classProbabilities: Record<'low' | 'medium' | 'high', number>;
  };
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(
  readFileSync(path.join(HERE, '__fixtures__', 'parity-fixtures.json'), 'utf8'),
) as Fixture[];

// risk-model.tsx rounds classProbabilities to 2 decimals, so we compare the
// TS output against the Python probability rounded the same way. With an exact
// model match the two are identical, so a tight epsilon still proves parity.
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

test('parity fixtures exist and are diverse', () => {
  assert.ok(fixtures.length >= 15, 'expected at least 15 parity fixtures');
});

for (const [index, fixture] of fixtures.entries()) {
  test(`Python↔TS parity for fixture #${index}`, () => {
    const result = scoreRisk(fixture.input);

    assert.equal(
      result.riskLevel,
      fixture.expected.riskLevel,
      `riskLevel mismatch for fixture #${index}`,
    );

    for (const label of ['low', 'medium', 'high'] as const) {
      const expected = round2(fixture.expected.classProbabilities[label]);
      const actual = result.classProbabilities[label];
      assert.ok(
        Math.abs(actual - expected) < 1e-6,
        `classProbabilities.${label} mismatch for fixture #${index}: TS=${actual} expected=${expected}`,
      );
    }
  });
}
