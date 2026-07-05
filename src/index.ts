#!/usr/bin/env node
import { Command } from "commander";
import Fuse from "fuse.js";
import ora from "ora";
import chalk from "chalk";
import { chromium } from "playwright";
import { searchFragrantica } from "./search.js";
import { scrapePerfumePage } from "./scraper.js";
import { displayProfile, displaySearchResults } from "./display.js";
import { SearchResult } from "./types.js";
import * as readline from "readline";

/** Create a readline interface for user input. */
function createPrompt(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function askSelection(
  rl: readline.Interface,
  max: number,
): Promise<number> {
  return new Promise((resolve) => {
    rl.question(chalk.cyan(`Pick one (1-${max}, 0 to exit): `), (answer) => {
      const num = parseInt(answer.trim());
      if (isNaN(num) || num < 0 || num > max) {
        console.log(chalk.red(`Please enter a number between 0 and ${max}`));
        resolve(askSelection(rl, max));
      } else {
        resolve(num);
      }
    });
  });
}

async function main() {
  const program = new Command();

  program
    .name("scent-cli")
    .description("Look up fragrance profiles from Fragrantica")
    .version("1.0.2")
    .argument("<name>", "the scent name to search for")
    .option("-p, --pick", "always show the picker instead of auto-selecting")
    .action(async (query: string, opts: { pick?: boolean }) => {
      const searchSpinner = ora(
        `Searching Fragrantica for "${query}"...`,
      ).start();

      let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

      try {
        browser = await chromium.launch({
          headless: true,
          args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
          ],
        });
        const context = await browser.newContext({
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
          viewport: { width: 1920, height: 1080 },
          locale: "en-US",
        });

        await context.addInitScript(() => {
          Object.defineProperty(navigator, "webdriver", { get: () => false });
          (window as any).chrome = { runtime: {} };
        });

        const results = await searchFragrantica(query, context);
        searchSpinner.stop();

        if (results.length === 0) {
          console.log(
            chalk.red(
              `\nNo results found for "${query}". Try a different name.`,
            ),
          );
          process.exit(1);
        }

        const fuse = new Fuse(results, {
          keys: ["name", "brand"],
          threshold: 0.4,
          includeScore: true,
        });

        const fuzzyResults = fuse.search(query);

        let selected: SearchResult;

        if (
          !opts.pick &&
          fuzzyResults.length > 0 &&
          (fuzzyResults[0].score === undefined ||
            fuzzyResults[0].score < 0.2) &&
          (fuzzyResults.length === 1 ||
            (fuzzyResults[1].score !== undefined &&
              fuzzyResults[1].score > 0.3))
        ) {
          selected = fuzzyResults[0].item;
        } else {
          const displayResults =
            fuzzyResults.length > 0
              ? fuzzyResults.map((r) => r.item)
              : results.slice(0, 10);

          displaySearchResults(displayResults, query);

          const rl = createPrompt();
          const selectedIndex = await askSelection(
            rl,
            displayResults.length,
          );
          rl.close();

          if (selectedIndex === 0) {
            console.log(chalk.dim("\nExited."));
            process.exit(0);
          }

          selected = displayResults[selectedIndex - 1];
        }

        const scrapeSpinner = ora(
          `Loading profile for ${selected.name}...`,
        ).start();

        const detailPage = await context.newPage();
        await detailPage.goto(selected.url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await detailPage.waitForTimeout(5000);

        const profile = await scrapePerfumePage(detailPage);
        await detailPage.close();
        scrapeSpinner.stop();
        displayProfile(profile);
      } catch (err) {
        searchSpinner.stop();
        console.log(
          chalk.red(
            `\nError: ${err instanceof Error ? err.message : err}`,
          ),
        );
        process.exit(1);
      } finally {
        if (browser) await browser.close();
      }
    });

  await program.parseAsync();
}

main();
