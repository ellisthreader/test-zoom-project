import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { config } from '../config.js';
import { getKnowledgeBaseSource, searchKnowledgeBase } from './kb.js';

test('knowledge base reads Obsidian vault markdown when configured', () => {
  const previousVaultPath = config.obsidianVaultPath;
  const previousKnowledgePaths = config.obsidianKnowledgePaths;
  const vaultPath = mkdtempSync(join(tmpdir(), 'relayclarity-obsidian-'));

  try {
    writeFileSync(
      join(vaultPath, 'Refund SOP.md'),
      '# Refund SOP\n\nRefunds above GBP 250 must be reviewed by the finance lead before the agent replies.'
    );

    config.obsidianVaultPath = vaultPath;
    config.obsidianKnowledgePaths = '';

    assert.equal(getKnowledgeBaseSource(), 'obsidian_vault');
    const results = searchKnowledgeBase('finance refund lead', 1);
    assert.equal(results[0]?.title, 'Refund SOP');
    assert.match(results[0]?.id || '', /^obsidian:/);
  } finally {
    config.obsidianVaultPath = previousVaultPath;
    config.obsidianKnowledgePaths = previousKnowledgePaths;
    rmSync(vaultPath, { recursive: true, force: true });
  }
});
