import knowledgeBase from '../data/knowledge-base.json' with { type: 'json' };
import type { KnowledgeItem } from '../types.js';

function tokenize(value: unknown): string[] {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function searchKnowledgeBase(query: string, limit = 3): KnowledgeItem[] {
  const queryTerms = new Set(tokenize(query));

  return (knowledgeBase as KnowledgeItem[])
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
  return knowledgeBase as KnowledgeItem[];
}
