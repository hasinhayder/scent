import { BrowserContext } from "playwright";
import { SearchResult, CacheEntry } from "./types.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { gotoWithRetry, jitter } from "./rateLimit.js";

/** Directory and file for search result caching (24h TTL). */
const CACHE_DIR = join(homedir(), ".scent-cache");
const CACHE_FILE = join(CACHE_DIR, "cache.json");
const CACHE_TTL = 24 * 60 * 60 * 1000;

function loadCache(): Record<string, CacheEntry> {
  if (!existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache));
}

function cacheKey(query: string): string {
  return query.toLowerCase().trim();
}

/** Load cached results for a query, or null if expired/missing. */
export function getCached(query: string): SearchResult[] | null {
  const cache = loadCache();
  const entry = cache[cacheKey(query)];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    delete cache[cacheKey(query)];
    saveCache(cache);
    return null;
  }
  return entry.results;
}

/** Store results in the cache for the given query. */
function setCache(query: string, results: SearchResult[]): void {
  const cache = loadCache();
  cache[cacheKey(query)] = { query, results, timestamp: Date.now() };
  saveCache(cache);
}

/** Parse brand, name, gender, and year from a Fragrantica URL and title. */
function parseFromUrl(
  url: string,
  title: string,
): { brand: string; name: string; gender: string; year: string | null } {
  const urlMatch = url.match(/\/perfume\/([^/]+)\/(.+?)-\d+\.html/i);
  const brand = urlMatch
    ? urlMatch[1].replace(/-/g, " ")
    : "Unknown";
  const nameSlug = urlMatch ? urlMatch[2] : "";

  let name = nameSlug.replace(/-/g, " ").trim();

  const brandWords = brand.toLowerCase().split(/\s+/);
  const nameWords = name.toLowerCase().split(/\s+/);

  let stripCount = 0;
  for (let i = 0; i < brandWords.length; i++) {
    if (
      i < nameWords.length &&
      nameWords[i] === brandWords[i]
    ) {
      stripCount++;
    } else {
      break;
    }
  }

  if (stripCount > 0) {
    const remaining = name.split(/\s+/).slice(stripCount);
    if (remaining.length > 0) {
      name = remaining.join(" ");
    }
  }

  const cleanTitle = title.replace(/^Link to /i, "").trim();
  const genderMatch = cleanTitle.match(/\b(female|male|unisex)\b/i);
  const gender = genderMatch
    ? genderMatch[1].toLowerCase()
    : "unknown";

  const yearMatch = cleanTitle.match(/\b(1[89]\d{2}|20\d{2})\b$/);
  const year = yearMatch ? yearMatch[1] : null;

  return { brand, name, gender, year };
}

/** Search Fragrantica for a query, using cache if available. */
export async function searchFragrantica(
  query: string,
  context: BrowserContext,
): Promise<SearchResult[]> {
  const cached = getCached(query);
  if (cached) return cached;

  const page = await context.newPage();

  try {
    await gotoWithRetry(page, "https://www.fragrantica.com/search/");
    await page.waitForTimeout(jitter(4000));

    const mainInput = page.locator(
      'input[placeholder="Start typing...."]',
    );
    await mainInput.waitFor({ state: "visible", timeout: 15000 });
    await mainInput.fill(query);
    await page.waitForTimeout(jitter(4000));

    const results = await page
      .locator('a[href*="/perfume/"]')
      .evaluateAll((els) => {
        const seen = new Set<string>();
        const data: Array<{
          href: string;
          title: string;
        }> = [];
        for (const el of els) {
          const href = (el as HTMLAnchorElement).href;
          if (href && !seen.has(href) && href.includes("/perfume/")) {
            seen.add(href);
            data.push({
              href,
              title:
                el.getAttribute("aria-label") ||
                el.getAttribute("title") ||
                "",
            });
          }
        }
        return data;
      });

    const parsed: SearchResult[] = results.map((r) => {
      const info = parseFromUrl(r.href, r.title);
      return {
        name: info.name,
        brand: info.brand,
        url: r.href,
        gender: info.gender,
        year: info.year,
      };
    });

    setCache(query, parsed);
    return parsed;
  } finally {
    await page.close();
  }
}
