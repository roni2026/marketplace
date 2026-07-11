/**
 * Content moderation utilities: profanity filtering,
 * duplicate detection, and keyword filtering.
 */

const PROFANITY_LIST = [
  'damn', 'hell', 'crap', 'ass', 'bastard', 'idiot', 'stupid',
  'hate', 'kill', 'scam', 'fake', 'fraud', 'cheat', 'steal',
  'illegal', 'weapon', 'drug', 'gamble', 'porno', 'sex', 'nude',
  'violence', 'abuse', 'threat', 'harass', 'spam',
];

const SPAM_KEYWORDS = [
  'click here', 'buy now', 'limited offer', 'act now', 'free money',
  'get rich', 'work from home', 'earn money fast', 'guaranteed income',
  'no risk', '100% free', 'double your', 'miracle', 'amazing deal',
  'once in a lifetime', 'congratulations you won', 'lottery winner',
];

const SUSPICIOUS_PATTERNS = [
  /(.)\1{10,}/i, // Repeated characters (e.g., "aaaaaaaaaaa")
  /(http|https|www\.)/gi, // URLs in title
  /\b\d{10,}\b/g, // Long number sequences (possible phone spam)
];

export interface ModerationResult {
  passed: boolean;
  flags: string[];
  filteredText?: string;
}

/**
 * Check text for profanity and return filtered version.
 */
export function filterProfanity(text: string): ModerationResult {
  const flags: string[] = [];
  let filtered = text;

  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(text)) {
      flags.push(`profanity:${word}`);
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    }
  }

  return {
    passed: flags.length === 0,
    flags,
    filteredText: filtered,
  };
}

/**
 * Detect spam keywords in text.
 */
export function detectSpam(text: string): ModerationResult {
  const flags: string[] = [];
  const lowerText = text.toLowerCase();

  for (const keyword of SPAM_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      flags.push(`spam_keyword:${keyword}`);
    }
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      flags.push(`suspicious_pattern:${pattern.source}`);
    }
  }

  return {
    passed: flags.length === 0,
    flags,
  };
}

/**
 * Detect duplicate ads by comparing title similarity.
 * Uses Jaccard similarity on word sets.
 */
export function detectDuplicate(
  newTitle: string,
  newDescription: string,
  existingAds: { title: string; description: string | null }[],
  threshold = 0.7
): ModerationResult {
  const flags: string[] = [];
  const newWords = new Set(tokenize(newTitle + ' ' + (newDescription || '')));

  for (const existing of existingAds) {
    const existingWords = new Set(tokenize(existing.title + ' ' + (existing.description || '')));
    const similarity = jaccardSimilarity(newWords, existingWords);

    if (similarity >= threshold) {
      flags.push(`duplicate:${similarity.toFixed(2)}:"${existing.title.slice(0, 30)}"`);
    }
  }

  return {
    passed: flags.length === 0,
    flags,
  };
}

/**
 * Filter banned keywords from text.
 */
export function filterBannedKeywords(text: string, bannedKeywords: string[]): ModerationResult {
  const flags: string[] = [];
  let filtered = text;

  for (const keyword of bannedKeywords) {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
    if (regex.test(text)) {
      flags.push(`banned_keyword:${keyword}`);
      filtered = filtered.replace(regex, '*'.repeat(keyword.length));
    }
  }

  return {
    passed: flags.length === 0,
    flags,
    filteredText: filtered,
  };
}

/**
 * Full moderation pipeline: profanity + spam + banned keywords.
 */
export function moderateContent(
  text: string,
  options?: {
    bannedKeywords?: string[];
    checkSpam?: boolean;
    checkProfanity?: boolean;
  }
): ModerationResult {
  const allFlags: string[] = [];
  let filteredText = text;

  if (options?.checkProfanity !== false) {
    const profanityResult = filterProfanity(text);
    allFlags.push(...profanityResult.flags);
    if (profanityResult.filteredText) {
      filteredText = profanityResult.filteredText;
    }
  }

  if (options?.checkSpam !== false) {
    const spamResult = detectSpam(text);
    allFlags.push(...spamResult.flags);
  }

  if (options?.bannedKeywords && options.bannedKeywords.length > 0) {
    const bannedResult = filterBannedKeywords(filteredText, options.bannedKeywords);
    allFlags.push(...bannedResult.flags);
    if (bannedResult.filteredText) {
      filteredText = bannedResult.filteredText;
    }
  }

  return {
    passed: allFlags.length === 0,
    flags: allFlags,
    filteredText,
  };
}

/**
 * Get a spam score for content (0-100, higher = more likely spam).
 */
export function getSpamScore(text: string): number {
  let score = 0;
  const lowerText = text.toLowerCase();

  // Check spam keywords
  for (const keyword of SPAM_KEYWORDS) {
    if (lowerText.includes(keyword)) score += 15;
  }

  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) score += 10;
  }

  // Check all caps (shouting)
  if (text.length > 20 && text === text.toUpperCase()) {
    score += 15;
  }

  // Check excessive exclamation marks
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    score += 10;
  }

  // Check excessive repetition
  if (/(.)\1{5,}/i.test(text)) {
    score += 10;
  }

  return Math.min(score, 100);
}

// Helper functions

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
