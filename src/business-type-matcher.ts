export type BusinessCategorySeed = {
  id: string;
  label: string;
  playbookId: string;
  aliases?: readonly string[];
  naicsCodes?: readonly string[];
  blockedTerms?: readonly string[];
};

export type BusinessTaxonomyEntry = {
  code: string;
  title: string;
  playbookId: string;
  terms: string[];
  blockedTerms: string[];
  naicsCodes: string[];
};

export type BusinessEntryMatch = {
  entry?: BusinessTaxonomyEntry;
  matchedTerms: string[];
  confidence: number;
  score: number;
};

const weakInputTerms = new Set([
  "business",
  "commercial",
  "company",
  "service",
  "services",
  "shop",
  "store",
  "team"
]);

const preservedWords: Record<string, string> = {
  api: "API",
  b2b: "B2B",
  "b&b": "B&B",
  bi: "BI",
  crm: "CRM",
  d2c: "D2C",
  gp: "GP",
  ifa: "IFA",
  it: "IT",
  mri: "MRI",
  msp: "MSP",
  saas: "SaaS",
  seo: "SEO"
};

export function buildBusinessTaxonomy(seeds: readonly BusinessCategorySeed[]): BusinessTaxonomyEntry[] {
  return seeds.map((seed) => ({
    code: seed.id,
    title: seed.label,
    playbookId: seed.playbookId,
    terms: uniqueTerms([seed.label, ...(seed.aliases || [])]),
    blockedTerms: uniqueTerms(seed.blockedTerms || []),
    naicsCodes: [...(seed.naicsCodes || [])]
  }));
}

export function getBusinessMatchEntry(input: string, taxonomy: readonly BusinessTaxonomyEntry[]): BusinessEntryMatch {
  const normalized = normalizeBusinessInput(input);
  const fallbackMatch = { matchedTerms: [], confidence: normalized ? 30 : 0, score: 0 };

  if (!canSearchBusinessInput(normalized)) {
    return fallbackMatch;
  }

  const bestMatch = scoreBusinessEntries(normalized, taxonomy)[0];
  return bestMatch && bestMatch.score >= 42 ? bestMatch : fallbackMatch;
}

export function getBusinessSuggestionEntries(input: string, taxonomy: readonly BusinessTaxonomyEntry[], limit = 5): BusinessEntryMatch[] {
  const normalized = normalizeBusinessInput(input);

  if (!canSearchBusinessInput(normalized)) {
    return [];
  }

  return scoreBusinessEntries(normalized, taxonomy)
    .filter((match) => match.score >= 42)
    .slice(0, limit);
}

export function formatBusinessSuggestionLabel(value: string): string {
  return value
    .split(" ")
    .map((word) => {
      const normalized = word.toLowerCase();
      return preservedWords[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(" ");
}

export function normalizeBusinessInput(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return applyBusinessInputCorrections(normalized);
}

function applyBusinessInputCorrections(value: string): string {
  return value
    .replace(/\b(?:softare|sofware|softwere)\b/g, "software")
    .replace(/\bservce\b/g, "service")
    .replace(/\bdentst\b/g, "dentist")
    .replace(/\bagncy\b/g, "agency")
    .replace(/\bshp\b/g, "shop")
    .replace(/\bsoftare as as\b/g, "software as a service")
    .replace(/\bsoftware as as\b/g, "software as a service")
    .replace(/\bsoftware as a servce\b/g, "software as a service")
    .replace(/\bsaas\b/g, "software as a service")
    .replace(/\s+/g, " ")
    .trim();
}

function canSearchBusinessInput(normalizedInput: string): boolean {
  if (normalizedInput.length < 3) {
    return false;
  }

  const words = normalizedInput.split(" ").filter(Boolean);
  return words.some((word) => word.length >= 3 && !weakInputTerms.has(word));
}

function scoreBusinessEntries(normalizedInput: string, taxonomy: readonly BusinessTaxonomyEntry[]): BusinessEntryMatch[] {
  return taxonomy
    .map((entry) => scoreBusinessEntry(normalizedInput, entry))
    .filter((match): match is BusinessEntryMatch & { entry: BusinessTaxonomyEntry } => Boolean(match.entry))
    .sort((first, second) =>
      second.score - first.score ||
      second.confidence - first.confidence ||
      first.entry.title.localeCompare(second.entry.title)
    );
}

function scoreBusinessEntry(normalizedInput: string, entry: BusinessTaxonomyEntry): BusinessEntryMatch {
  if (entry.blockedTerms.some((term) => term && phraseMatches(normalizedInput, normalizeBusinessInput(term)))) {
    return { matchedTerms: [], confidence: 0, score: 0 };
  }

  const termScores = entry.terms
    .map((term) => ({ term, score: scoreBusinessTerm(normalizedInput, term) }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score);

  if (!termScores.length) {
    return { matchedTerms: [], confidence: 0, score: 0 };
  }

  const score = termScores[0].score + Math.min(30, termScores.slice(1).reduce((total, item) => total + item.score * 0.12, 0));

  return {
    entry,
    matchedTerms: termScores.slice(0, 3).map(({ term }) => term),
    confidence: confidenceFromScore(score),
    score
  };
}

function scoreBusinessTerm(normalizedInput: string, rawTerm: string): number {
  const normalizedTerm = normalizeBusinessInput(rawTerm);

  if (!normalizedTerm || isWeakTerm(normalizedTerm)) {
    return 0;
  }

  if (normalizedInput === normalizedTerm) {
    return 180;
  }

  if (phraseMatches(normalizedInput, normalizedTerm)) {
    return 140 + Math.min(30, normalizedTerm.length);
  }

  if (normalizedTerm.startsWith(normalizedInput) && normalizedInput.length >= 4) {
    return 112 + Math.min(28, normalizedInput.length);
  }

  if (normalizedInput.startsWith(normalizedTerm) && normalizedTerm.length >= 5) {
    return 92 + Math.min(28, normalizedTerm.length);
  }

  const inputWords = meaningfulWords(normalizedInput);
  const termWords = meaningfulWords(normalizedTerm);

  if (!inputWords.length || !termWords.length) {
    return 0;
  }

  const matchedWords = inputWords.filter((inputWord) =>
    termWords.some((termWord) => wordsMatch(inputWord, termWord))
  );
  const matchRatio = matchedWords.length / inputWords.length;

  if (inputWords.length === 1) {
    const [word] = inputWords;
    const prefixMatch = termWords.some((termWord) => termWord.startsWith(word) && word.length >= 4);
    return prefixMatch ? 48 + word.length : 0;
  }

  if (matchRatio >= 0.75) {
    return 62 + matchedWords.join("").length + Math.round(matchRatio * 20);
  }

  return 0;
}

function phraseMatches(normalizedInput: string, normalizedTerm: string): boolean {
  if (!normalizedInput || !normalizedTerm) {
    return false;
  }

  const escaped = escapeRegExp(normalizedTerm);
  return new RegExp(`(^|\\s)${escaped}($|\\s)`, "i").test(normalizedInput);
}

function wordsMatch(inputWord: string, termWord: string): boolean {
  if (inputWord === termWord) {
    return true;
  }

  if (inputWord.length >= 4 && termWord.startsWith(inputWord)) {
    return true;
  }

  if (inputWord.length >= 5 && termWord.length >= 5 && levenshteinDistance(inputWord, termWord) <= 1) {
    return true;
  }

  return false;
}

function meaningfulWords(value: string): string[] {
  return value
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !weakInputTerms.has(word));
}

function uniqueTerms(terms: readonly string[]): string[] {
  const seen = new Set<string>();

  return terms
    .map((term) => term.replace(/\s+/g, " ").trim())
    .filter((term) => {
      const normalized = normalizeBusinessInput(term);

      if (!term || seen.has(normalized) || isWeakTerm(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
}

function isWeakTerm(normalizedTerm: string): boolean {
  return weakInputTerms.has(normalizedTerm);
}

function confidenceFromScore(score: number): number {
  if (score >= 150) {
    return 97;
  }

  if (score >= 112) {
    return 92;
  }

  if (score >= 72) {
    return 82;
  }

  if (score >= 42) {
    return 68;
  }

  return 45;
}

function levenshteinDistance(first: string, second: string): number {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  const current = Array.from({ length: second.length + 1 }, () => 0);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    current[0] = firstIndex;

    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const cost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      current[secondIndex] = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + cost
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[second.length];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
