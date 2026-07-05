import { Page } from "playwright";

let lastRequestTime = 0;
const MIN_COOLDOWN_MS = 2000;

export function jitter(baseMs: number, variance = 0.3): number {
  const min = baseMs * (1 - variance);
  const max = baseMs * (1 + variance);
  return Math.floor(Math.random() * (max - min) + min);
}

export async function waitForCooldown(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_COOLDOWN_MS) {
    await new Promise((r) => setTimeout(r, MIN_COOLDOWN_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function gotoWithRetry(
  page: Page,
  url: string,
  maxRetries = 3,
): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await waitForCooldown();
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const status = response?.status() ?? 200;

    if (status === 429 || status === 403) {
      if (attempt === maxRetries) {
        throw new Error(
          `Rate limited by Fragrantica (${status}). Try again later.`,
        );
      }
      const backoff = jitter(5000 * Math.pow(2, attempt), 0.5);
      console.log(
        `\n  Rate limited (${status}), retrying in ${Math.round(backoff / 1000)}s...`,
      );
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }

    return;
  }
}
