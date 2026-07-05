import chalk from "chalk";
import { PerfumeResult, SearchResult } from "./types.js";

/** Render a horizontal bar of the given character at a percentage width. */
function bar(char: string, percentage: number, maxWidth: number): string {
  const width = Math.round((percentage / 100) * maxWidth);
  return char.repeat(Math.max(1, width));
}

/** Print a full perfume profile to the terminal with color formatting. */
export function displayProfile(perfume: PerfumeResult): void {
  console.log("");
  console.log(
    chalk.bold.cyan(
      `${perfume.name} ${chalk.dim("by")} ${perfume.brand}`,
    ),
  );

  const meta: string[] = [];
  if (perfume.year) meta.push(chalk.yellow(perfume.year));
  meta.push(
    perfume.gender === "female"
      ? chalk.magenta("♀ female")
      : perfume.gender === "male"
      ? chalk.blue("♂ male")
      : chalk.green("⚥ unisex"),
  );
  if (perfume.rating !== null) {
    const stars = "★".repeat(Math.round(perfume.rating));
    meta.push(
      chalk.yellow(stars) + chalk.dim(` ${perfume.rating.toFixed(2)}`),
    );
  }
  if (perfume.votes !== null) {
    meta.push(chalk.dim(`${perfume.votes.toLocaleString()} votes`));
  }

  console.log(meta.join("  "));

  if (perfume.perfumers.length > 0) {
    console.log(
      chalk.dim(`Perfumer${perfume.perfumers.length > 1 ? "s" : ""}: `) +
        perfume.perfumers.join(", "),
    );
  }

  if (perfume.accords.length > 0) {
    console.log("");
    console.log(chalk.bold("Main Accords"));
    const maxBar = 30;
    const barColors = [
      chalk.cyan,
      chalk.magenta,
      chalk.yellow,
      chalk.green,
      chalk.blue,
      chalk.red,
    ];
    for (const [i, accord] of perfume.accords.entries()) {
      const filled = bar("█", accord.intensity, maxBar);
      const empty = bar("░", 100 - accord.intensity, maxBar);
      const color = barColors[i % barColors.length];
      console.log(
        `  ${chalk.white(accord.name.padEnd(14))} ${color(filled)}${chalk.dim(empty)}`,
      );
    }
  }

  if (
    perfume.notes.top.length > 0 ||
    perfume.notes.middle.length > 0 ||
    perfume.notes.base.length > 0
  ) {
    console.log("");
    console.log(chalk.bold("Fragrance Pyramid"));

    if (perfume.notes.top.length > 0) {
      console.log(
        `  ${chalk.green("Top:    ")} ${perfume.notes.top.join(", ")}`,
      );
    }
    if (perfume.notes.middle.length > 0) {
      console.log(
        `  ${chalk.yellow("Middle: ")} ${perfume.notes.middle.join(", ")}`,
      );
    }
    if (perfume.notes.base.length > 0) {
      console.log(
        `  ${chalk.red("Base:   ")} ${perfume.notes.base.join(", ")}`,
      );
    }
  }

  if (perfume.description) {
    console.log("");
    const lines = perfume.description.match(/.{1,80}(\s|$)/g) || [];
    for (const line of lines.slice(0, 8)) {
      console.log(chalk.dim(`  ${line.trim()}`));
    }
  }

  console.log("");
  console.log(chalk.dim.underline(perfume.url));
  console.log(chalk.dim(`  0. Exit`));
  console.log("");
}

/** Print a numbered list of search results to the terminal. */
export function displaySearchResults(
  results: SearchResult[],
  query: string,
): void {
  console.log("");
  console.log(
    chalk.dim(`Found ${results.length} result${results.length > 1 ? "s" : ""} for "${query}":`),
  );
  console.log("");

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const num = chalk.bold.cyan(`${i + 1}`);
    const name = chalk.white(r.name);
    const brand = chalk.dim(`by ${r.brand}`);
    const genderIcon =
      r.gender === "female"
        ? chalk.magenta("♀")
        : r.gender === "male"
        ? chalk.blue("♂")
        : chalk.green("⚥");
    const year = r.year ? chalk.yellow(` (${r.year})`) : "";
    console.log(`  ${num}. ${name} ${brand} ${genderIcon}${year}`);
  }
  console.log("");
}
