import { Page } from "playwright";
import { PerfumeResult } from "./types.js";

/** Navigate a loaded Fragrantica perfume page and extract profile data from the DOM. */
export async function scrapePerfumePage(
  page: Page,
): Promise<PerfumeResult> {
  // Scroll down incrementally to trigger lazy-loaded sections
  const height = await page.evaluate(() => document.body.scrollHeight);
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, height / steps);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const title = document.title;
    const h1 = document.querySelector("h1");
    const h1Text = h1?.textContent?.trim() || "";

    let gender = "unknown";
    if (title.match(/\bfor men\b/i)) gender = "male";
    else if (title.match(/\bfor women\b/i)) gender = "female";
    else if (title.match(/\bunisex\b/i)) gender = "unisex";

    let year: string | null = null;
    const yearMatch = title.match(/\b(1[89]\d{2}|20\d{2})\b/);
    if (yearMatch) year = yearMatch[1];

    // Brand from the first designer link with .html suffix
    let brand = "Unknown";
    {
      const links = document.querySelectorAll('a[href*="/designers/"]');
      for (const el of links) {
        const href = (el as HTMLAnchorElement).href;
        if (href.match(/\/designers\/[^/]+\.html$/)) {
          brand = el.textContent?.trim() || brand;
          break;
        }
      }
    }

    // Name: h1 text minus brand
    let name = h1Text.replace(/\s+for\s+(men|women)/i, "").trim();
    const escBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    name = name
      .replace(new RegExp("\\s*" + escBrand + "\\s*$", "i"), "")
      .trim();

    // Rating & votes
    let rating: number | null = null;
    const ratingEl = document.querySelector('[itemprop="ratingValue"]');
    if (ratingEl) {
      const r = parseFloat(ratingEl.textContent?.trim() || "");
      if (!isNaN(r)) rating = r;
    }

    let votes: number | null = null;
    const votesEl = document.querySelector('[itemprop="ratingCount"]');
    if (votesEl) {
      const v = parseInt(
        (votesEl.textContent?.trim() || "").replace(/,/g, ""),
      );
      if (!isNaN(v)) votes = v;
    }

    // Perfumers: links with multiple words
    const perfumers: string[] = [];
    document.querySelectorAll('a[href*="/noses/"]').forEach((el) => {
      const text = el.textContent?.trim();
      if (
        text &&
        text.includes(" ") &&
        text.length > 5 &&
        !perfumers.includes(text)
      ) {
        perfumers.push(text);
      }
    });

    // Accords
    const accords: Array<{ name: string; intensity: number }> = [];
    document
      .querySelectorAll<HTMLElement>('[class*="rounded-br-lg"]')
      .forEach((el) => {
        const text = el.textContent?.trim();
        const styleW = el.style.width;
        if (
          text &&
          styleW &&
          text.length > 1 &&
          text.length < 30 &&
          !text.includes("function") &&
          !text.includes("Search") &&
          !text.includes("(")
        ) {
          const pct = parseFloat(styleW);
          if (!isNaN(pct) && pct > 0) {
            accords.push({ name: text, intensity: Math.round(pct) });
          }
        }
      });

    // Description: first paragraph near top with substantial text,
    // but skip disclaimer-like paragraphs
    let description = "";
    const paragraphs = document.querySelectorAll("p");
    for (const p of paragraphs) {
      if (p.querySelector("img")) continue;
      const t = p.textContent?.trim() || "";
      if (
        t.length > 60 &&
        t.length < 800 &&
        !t.includes("Perfume rating") &&
        !t.includes("not endorsed") &&
        !t.includes("affiliated with") &&
        !t.includes("Fragrantica is an independent") &&
        !t.includes("Fragrantica does not sell") &&
        t.split(" ").length > 8
      ) {
        description = t;
        break;
      }
    }

    // Notes pyramid
    const notes = {
      top: [] as string[],
      middle: [] as string[],
      base: [] as string[],
    };

    Array.from(document.querySelectorAll("h2, h3, h4, h5")).forEach(
      (heading) => {
        const hText = heading.textContent?.trim() || "";

        let section: "top" | "middle" | "base" | null = null;
        if (/^Top Notes$/i.test(hText)) section = "top";
        else if (/^Middle Notes$/i.test(hText)) section = "middle";
        else if (/^Base Notes$/i.test(hText)) section = "base";
        if (!section) return;

        let container = heading.parentElement;
        for (let d = 0; d < 5 && container; d++) {
          const links = container.querySelectorAll(
            'a[href*="/notes/"]',
          );
          if (links.length > 0) {
            const noteNames: string[] = [];
            links.forEach((link) => {
              const n = link.textContent?.trim();
              if (n && !noteNames.includes(n)) {
                noteNames.push(n);
              }
            });
            if (noteNames.length > 0) notes[section] = noteNames;
            break;
          }
          container = container.parentElement;
        }
      },
    );

    // Extract perfumes from "This perfume reminds me of" carousel section
    const remindsMeOf: string[] = [];
    {
      const allH3 = document.querySelectorAll("h3");
      for (const h of allH3) {
        if (h.textContent?.trim().toLowerCase() === "this perfume reminds me of") {
          let container = h.parentElement;
          for (let i = 0; i < 10 && container; i++) {
            const carousel = container.querySelector(".perfume-carousel-scroll");
            if (carousel) {
              const cards = carousel.querySelectorAll(".tw-carousel-perfume-card");
              for (const card of cards) {
                const nameEl = card.querySelector(".font-medium");
                const hrefEl = card.querySelector('a[href*="/perfume/"]');
                const name = nameEl?.textContent?.trim() || "";
                const href = hrefEl?.getAttribute("href") || "";
                if (name && href) remindsMeOf.push(name);
              }
              break;
            }
            container = container.parentElement;
          }
          break;
        }
      }
    }

    // Fallback: "People who like this also like" section
    const similarPerfumes: string[] = [];
    const allHeadings = document.querySelectorAll("h2, h3, h4, h5");
    for (const h of allHeadings) {
      const text = h.textContent?.trim() || "";
      if (/people who like this also like/i.test(text)) {
        let el = h.parentElement;
        for (let i = 0; i < 10 && el; i++) {
          const links = el.querySelectorAll('a[href*="/perfume/"]');
          const seen = new Set<string>();
          for (const a of links) {
            const t = a.textContent?.trim();
            if (t && t.length > 1 && !t.includes("Compare") && !t.includes("Find more") && !seen.has(t)) {
              seen.add(t);
              similarPerfumes.push(t);
            }
          }
          if (similarPerfumes.length >= 5) break;
          el = el.parentElement;
        }
      }
    }

    return {
      name,
      brand,
      year,
      gender,
      rating,
      votes,
      accords,
      notes,
      description: description.slice(0, 600),
      perfumers,
      remindsMeOf: remindsMeOf.slice(0, 5),
      similarPerfumes: similarPerfumes.slice(0, 5),
      url: window.location.href,
    };
  });

  return data;
}
