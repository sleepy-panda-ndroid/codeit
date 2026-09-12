export type CodeforcesSample = { input: string; output: string };

export type ParsedProblemQuery = { contestId: string; index: string };

// Accepts either a full Codeforces problem URL or a bare "1234 A"-style
// shorthand. contestId and index are captured directly from a constrained
// character set (\d+ and [A-Za-z]\d*), so nothing here can be used to inject
// arbitrary path/URL characters into the request built from it.
export function parseProblemQuery(raw: string): ParsedProblemQuery | null {
  const trimmed = raw.trim();
  const match =
    trimmed.match(/(?:problemset\/problem|contest)\/(\d+)(?:\/problem\/)?([A-Za-z]\d*)?/i) ??
    trimmed.match(/^(\d+)\s*([A-Za-z]\d*)?$/i);
  if (!match) return null;
  return { contestId: match[1], index: match[2] ?? "A" };
}

// Named HTML entities Codeforces problem statements commonly use beyond the
// basics (<, >, &, quotes) — &nbsp; and the entities that show up in
// math-heavy statements (minus signs, multiplication, degree symbols, dashes,
// ellipses).
const NAMED_ENTITIES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
  "&quot;": '"', "&#39;": "'", "&apos;": "'",
  "&mdash;": "\u2014", "&ndash;": "\u2013", "&minus;": "\u2212",
  "&times;": "\u00d7", "&hellip;": "\u2026", "&deg;": "\u00b0",
  "&laquo;": "\u00ab", "&raquo;": "\u00bb", "&plusmn;": "\u00b1",
};

function decodeHtml(value: string) {
  return value
    .replace(/<br\s*\/?>(\r?\n)?/gi, "\n")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&[a-z]+;/gi, (entity) => NAMED_ENTITIES[entity.toLowerCase()] ?? entity)
    .trim();
}

function stripFenceAndCopyLines(text: string) {
  // The reader-mode markdown fallback wraps code blocks in triple-backtick
  // fences (```lang ... ```) and, in some renderings, a "Copy" button label
  // on its own line. Drop both — checking each line individually is more
  // robust than a fixed multi-line pattern, since either can appear at the
  // very start/end of the captured block (where a lookahead/lookbehind on
  // the raw text wouldn't reliably catch it).
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim().toLowerCase();
      return trimmed !== "copy" && !trimmed.startsWith("```");
    })
    .join("\n")
    .trim();
}

function parseHtmlSamples(source: string): CodeforcesSample[] {
  const blocks = source.match(
    /<div class="input">[\s\S]*?<pre>([\s\S]*?)<\/pre>[\s\S]*?<div class="output">[\s\S]*?<pre>([\s\S]*?)<\/pre>/gi
  ) ?? [];
  return blocks.map((block) => {
    const input = block.match(/<div class="input">[\s\S]*?<pre>([\s\S]*?)<\/pre>/i)?.[1] ?? "";
    const output = block.match(/<div class="output">[\s\S]*?<pre>([\s\S]*?)<\/pre>/i)?.[1] ?? "";
    return { input: decodeHtml(input), output: decodeHtml(output) };
  });
}

function parseMarkdownSamples(markdown: string): CodeforcesSample[] {
  // Codeforces headings this section as "Example" only when there's a single
  // sample and "Examples" (plural) when there are multiple — match both.
  // Confirmed against a real fetched problem page, where the heading is
  // "Examples" and the original singular-only match here never found it,
  // meaning this fallback path silently returned zero samples every time.
  const exampleStart = markdown.search(/\nExamples?\s*\n/i);
  if (exampleStart < 0) return [];
  const example = markdown.slice(exampleStart);

  // Codeforces problems frequently have MULTIPLE sample input/output pairs
  // under one heading — match every Input/Output pair, stopping each Output
  // capture at the next Input heading, the Note heading, or the end of text.
  const pairRegex = /\nInput\s*\n+([\s\S]*?)\nOutput\s*\n+([\s\S]*?)(?=\nInput\s*\n|\nNote\s*\n|$)/gi;
  const tests: CodeforcesSample[] = [];
  let match: RegExpExecArray | null;
  while ((match = pairRegex.exec(example)) !== null) {
    const input = stripFenceAndCopyLines(match[1]);
    const output = stripFenceAndCopyLines(match[2]);
    if (input || output) tests.push({ input, output });
  }
  return tests;
}

// Tries the primary HTML structure first (works for a direct Codeforces
// fetch); falls back to the markdown-shaped structure the r.jina.ai reader
// proxy returns.
export function parseProblemSamples(source: string): CodeforcesSample[] {
  const htmlSamples = parseHtmlSamples(source);
  return htmlSamples.length ? htmlSamples : parseMarkdownSamples(source);
}

// A plain, header-less fetch() looks nothing like a real browser request,
// which is exactly the kind of request Codeforces' anti-scraping measures
// are most likely to flag or degrade. These headers cost nothing and make
// the direct request meaningfully more likely to succeed, reducing how often
// this has to fall through to the much slower r.jina.ai proxy at all.
const BROWSER_LIKE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// The direct fetch gets a short timeout — if Codeforces is blocking or
// slow to respond, we want to fail over to the fallback quickly rather than
// wait the full duration twice. The r.jina.ai fallback gets a longer one,
// since reader/proxy services that fetch-and-convert a page server-side are
// inherently slower than a direct request, and the earlier 8s timeout here
// was cutting it off before it could realistically complete.
const DIRECT_FETCH_TIMEOUT_MS = 6000;
const FALLBACK_FETCH_TIMEOUT_MS = 15000;

export async function fetchCodeforcesProblemSource(contestId: string, index: string): Promise<string> {
  const url = `https://codeforces.com/problemset/problem/${contestId}/${index}`;
  try {
    const response = await fetch(url, {
      headers: BROWSER_LIKE_HEADERS,
      signal: AbortSignal.timeout(DIRECT_FETCH_TIMEOUT_MS),
    });
    if (response.ok) return response.text();
  } catch {
    // direct fetch failed or timed out — fall through to the proxy below
  }

  const fallback = await fetch(
    `https://r.jina.ai/http://codeforces.com/problemset/problem/${contestId}/${index}`,
    { signal: AbortSignal.timeout(FALLBACK_FETCH_TIMEOUT_MS) }
  );
  if (!fallback.ok) throw new Error("Codeforces problem could not be loaded");
  return fallback.text();
}

// Problem statements and their sample testcases are effectively static once
// published, so a long TTL is appropriate here — this isn't "stale data" risk
// the way most API caching is, it just avoids re-scraping (and re-hitting the
// r.jina.ai fallback) for the same problem repeatedly. Capped size as a
// simple safety net against unbounded growth; oldest entries are evicted
// first if the cap is hit.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

type CacheEntry = { tests: CodeforcesSample[]; expiresAt: number };
const sampleCache = new Map<string, CacheEntry>();

function cacheKey(contestId: string, index: string) {
  return `${contestId}${index}`.toUpperCase();
}

function getCachedSamples(contestId: string, index: string): CodeforcesSample[] | null {
  const key = cacheKey(contestId, index);
  const entry = sampleCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    sampleCache.delete(key);
    return null;
  }
  return entry.tests;
}

function setCachedSamples(contestId: string, index: string, tests: CodeforcesSample[]) {
  const key = cacheKey(contestId, index);
  if (sampleCache.size >= CACHE_MAX_ENTRIES && !sampleCache.has(key)) {
    const oldestKey = sampleCache.keys().next().value;
    if (oldestKey !== undefined) sampleCache.delete(oldestKey);
  }
  sampleCache.set(key, { tests, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function getCodeforcesSamples(contestId: string, index: string): Promise<CodeforcesSample[]> {
  const cached = getCachedSamples(contestId, index);
  if (cached) return cached;

  const source = await fetchCodeforcesProblemSource(contestId, index);
  const tests = parseProblemSamples(source);
  if (tests.length) setCachedSamples(contestId, index, tests);
  return tests;
}
