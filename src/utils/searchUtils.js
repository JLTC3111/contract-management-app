/**
 * Partial / fuzzy search utilities.
 * Supports substring, subsequence, diacritic-insensitive match (e.g. xa → xã/xả), and light typo tolerance.
 */

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripDiacritics(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function buildNormalizedIndexMap(original) {
  const normChars = [];
  const origIndex = [];

  for (let i = 0; i < original.length; i++) {
    const stripped = stripDiacritics(original[i]);
    for (let j = 0; j < stripped.length; j++) {
      normChars.push(stripped[j]);
      origIndex.push(i);
    }
  }

  return { normText: normChars.join(''), origIndex };
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function isSubsequence(haystack, needle) {
  let hi = 0;
  for (let ni = 0; ni < needle.length; ni++) {
    const found = haystack.indexOf(needle[ni], hi);
    if (found === -1) return false;
    hi = found + 1;
  }
  return true;
}

function mergeRanges(ranges) {
  if (!ranges.length) return [];

  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

function findDiacriticInsensitiveRanges(original, query) {
  const { normText, origIndex } = buildNormalizedIndexMap(original);
  const normQuery = stripDiacritics(query);
  if (!normQuery) return [];

  const ranges = [];
  let start = 0;

  while (start <= normText.length - normQuery.length) {
    const idx = normText.indexOf(normQuery, start);
    if (idx === -1) break;

    const origStart = origIndex[idx];
    const origEnd = origIndex[idx + normQuery.length - 1] + 1;
    ranges.push([origStart, origEnd]);
    start = idx + 1;
  }

  return ranges;
}

function findNormalizedSubsequenceRange(original, token) {
  const { normText, origIndex } = buildNormalizedIndexMap(original);
  const normToken = stripDiacritics(token);
  if (normToken.length < 2) return null;

  let tokenIndex = 0;
  let firstNormIndex = -1;
  let lastNormIndex = -1;

  for (let i = 0; i < normText.length && tokenIndex < normToken.length; i++) {
    if (normText[i] === normToken[tokenIndex]) {
      if (tokenIndex === 0) firstNormIndex = i;
      lastNormIndex = i;
      tokenIndex++;
    }
  }

  if (tokenIndex !== normToken.length) return null;

  return [origIndex[firstNormIndex], origIndex[lastNormIndex] + 1];
}

function findFuzzyWordRanges(original, token) {
  const { normText, origIndex } = buildNormalizedIndexMap(original);
  const normToken = stripDiacritics(token);
  if (normToken.length < 3) return [];

  const words = normText.split(/[\s._\-/]+/).filter(Boolean);
  const ranges = [];
  const maxDist = normToken.length <= 5 ? 1 : 2;

  let offset = 0;
  for (const word of words) {
    const wordStart = normText.indexOf(word, offset);
    if (wordStart === -1) continue;

    const wordEnd = wordStart + word.length;
    offset = wordEnd;

    if (
      word.includes(normToken) ||
      isSubsequence(word, normToken) ||
      (Math.abs(word.length - normToken.length) <= maxDist && levenshtein(word, normToken) <= maxDist)
    ) {
      ranges.push([origIndex[wordStart], origIndex[wordEnd - 1] + 1]);
    } else if (word.length >= normToken.length) {
      const prefix = word.slice(0, normToken.length);
      const prefixDist = normToken.length >= 4 ? 1 : 0;
      if (levenshtein(prefix, normToken) <= prefixDist) {
        ranges.push([origIndex[wordStart], origIndex[wordStart + normToken.length - 1] + 1]);
      }
    }
  }

  return ranges;
}

function collectHighlightRanges(original, query) {
  const trimmed = String(query).trim();
  if (!trimmed) return [];

  const ranges = [];

  const literalRegex = new RegExp(escapeRegex(trimmed), 'gi');
  let match;
  while ((match = literalRegex.exec(original)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }

  ranges.push(...findDiacriticInsensitiveRanges(original, trimmed));

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    ranges.push(...findDiacriticInsensitiveRanges(original, token));

    const subsequenceRange = findNormalizedSubsequenceRange(original, token);
    if (subsequenceRange) ranges.push(subsequenceRange);

    ranges.push(...findFuzzyWordRanges(original, token));
  }

  return mergeRanges(ranges);
}

function tokenFuzzyMatch(haystack, token) {
  if (!token) return true;

  const normalizedHaystack = stripDiacritics(haystack);
  const normalizedToken = stripDiacritics(token);

  if (haystack.includes(token)) return true;
  if (normalizedHaystack.includes(normalizedToken)) return true;
  if (isSubsequence(haystack, token)) return true;
  if (isSubsequence(normalizedHaystack, normalizedToken)) return true;

  const words = normalizedHaystack.split(/[\s._\-/]+/).filter(Boolean);
  const maxDist = normalizedToken.length <= 3 ? 0 : normalizedToken.length <= 5 ? 1 : 2;

  for (const word of words) {
    if (word.includes(normalizedToken)) return true;
    if (isSubsequence(word, normalizedToken)) return true;
    if (maxDist > 0 && Math.abs(word.length - normalizedToken.length) <= maxDist) {
      if (levenshtein(word, normalizedToken) <= maxDist) return true;
    }
    if (word.length >= normalizedToken.length) {
      const prefix = word.slice(0, normalizedToken.length);
      const prefixDist = normalizedToken.length >= 4 ? 1 : 0;
      if (levenshtein(prefix, normalizedToken) <= prefixDist) return true;
    }
  }

  return false;
}

/**
 * Returns true when query partially matches text (typos, gaps, and missing diacritics allowed).
 */
export function partialSearchMatch(text, query) {
  if (!query || !query.trim()) return true;
  if (text === null || text === undefined) return false;

  const haystack = String(text);
  const needle = String(query).trim();

  if (haystack.toLowerCase().includes(needle.toLowerCase())) return true;
  if (stripDiacritics(haystack).includes(stripDiacritics(needle))) return true;

  const tokens = needle.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  return tokens.every((token) => tokenFuzzyMatch(haystack, token));
}

/**
 * Higher score means a better match.
 */
export function getSearchRelevanceScore(text, query) {
  if (!query || !query.trim() || text === null || text === undefined) return 0;

  const haystack = String(text);
  const needle = String(query).trim();
  const normalizedHaystack = stripDiacritics(haystack);
  const normalizedNeedle = stripDiacritics(needle);

  if (normalizedHaystack === normalizedNeedle) return 100;
  if (normalizedHaystack.startsWith(normalizedNeedle)) return 90;
  if (normalizedHaystack.includes(normalizedNeedle)) return 80;
  if (haystack.toLowerCase().includes(needle.toLowerCase())) return 75;

  const tokens = needle.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  let score = 0;
  for (const token of tokens) {
    const normToken = stripDiacritics(token);
    if (normalizedHaystack.includes(normToken)) score += 60;
    else if (isSubsequence(normalizedHaystack, normToken)) score += 40;
    else if (tokenFuzzyMatch(haystack, token)) score += 20;
  }

  return score / tokens.length;
}

export function searchMultipleFields(fields, query) {
  return (fields || []).some((field) => partialSearchMatch(field, query));
}

export function getBestRelevanceScore(fields, query) {
  const scores = (fields || []).map((field) => getSearchRelevanceScore(field, query));
  return scores.length ? Math.max(...scores) : 0;
}

/**
 * Split display text into highlighted / plain segments for search UI.
 */
export function getSearchHighlightSegments(text, query) {
  const original = text === null || text === undefined ? '' : String(text);
  if (!query?.trim()) return [{ text: original, highlight: false }];

  const ranges = collectHighlightRanges(original, query);
  if (!ranges.length) return [{ text: original, highlight: false }];

  const segments = [];
  let cursor = 0;

  for (const [start, end] of ranges) {
    if (start > cursor) {
      segments.push({ text: original.slice(cursor, start), highlight: false });
    }
    segments.push({ text: original.slice(start, end), highlight: true });
    cursor = end;
  }

  if (cursor < original.length) {
    segments.push({ text: original.slice(cursor), highlight: false });
  }

  return segments;
}
