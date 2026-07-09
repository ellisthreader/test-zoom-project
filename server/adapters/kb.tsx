import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { config } from '../config.js';
import knowledgeBase from '../data/knowledge-base.json' with { type: 'json' };
import type { KnowledgeItem } from '../types.js';

let obsidianCache: { key: string; items: KnowledgeItem[] } | null = null;

function tokenize(value: unknown): string[] {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function parseKnowledgePaths() {
  return config.obsidianKnowledgePaths
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripFrontmatter(markdown: string) {
  return markdown.replace(/^---\s*[\s\S]*?\s*---\s*/, '');
}

function titleFromMarkdown(filePath: string, markdown: string) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || basename(filePath, '.md').replace(/[-_]+/g, ' ');
}

function collectMarkdownFiles(target: string): string[] {
  if (!existsSync(target)) {
    return [];
  }

  const stats = statSync(target);
  if (stats.isFile()) {
    return target.toLowerCase().endsWith('.md') ? [target] : [];
  }

  if (!stats.isDirectory()) {
    return [];
  }

  return readdirSync(target)
    .flatMap((entry) => collectMarkdownFiles(join(target, entry)));
}

function loadObsidianKnowledgeBase(): KnowledgeItem[] {
  const vaultPath = config.obsidianVaultPath.trim();
  if (!vaultPath || !existsSync(vaultPath)) {
    return [];
  }

  const knowledgePaths = parseKnowledgePaths();
  const cacheKey = `${vaultPath}|${knowledgePaths.join(',')}`;

  if (obsidianCache?.key === cacheKey) {
    return obsidianCache.items;
  }

  const targets = knowledgePaths.length
    ? knowledgePaths.map((path) => join(vaultPath, path))
    : [vaultPath];

  const items = targets
    .flatMap((target) => collectMarkdownFiles(target))
    .map((filePath) => {
      const markdown = readFileSync(filePath, 'utf8');
      const body = stripFrontmatter(markdown).trim();
      const relativePath = relative(vaultPath, filePath).replace(/\\/g, '/');

      return {
        id: `obsidian:${relativePath}`,
        title: titleFromMarkdown(filePath, body),
        body,
        tags: ['obsidian']
      };
    });

  obsidianCache = { key: cacheKey, items };
  return items;
}

function getKnowledgeItems(): KnowledgeItem[] {
  const obsidianItems = loadObsidianKnowledgeBase();
  return obsidianItems.length ? obsidianItems : knowledgeBase as KnowledgeItem[];
}

export function searchKnowledgeBase(query: string, limit = 3): KnowledgeItem[] {
  const queryTerms = new Set(tokenize(query));

  return getKnowledgeItems()
    .map((item) => {
      const haystack = tokenize(`${item.title} ${item.body}`);
      const score = haystack.reduce((total, term) => total + (queryTerms.has(term) ? 1 : 0), 0);
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...item }) => item);
}

export function listKnowledgeBase(): KnowledgeItem[] {
  return getKnowledgeItems();
}

export function getKnowledgeBaseSource() {
  return loadObsidianKnowledgeBase().length ? 'obsidian_vault' : 'local_json';
}
