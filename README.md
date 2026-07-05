<p align="center">
  <img src="https://img.icons8.com/fluency/96/perfume-bottle.png" alt="scent logo" width="96" />
</p>

<h1 align="center">🌸 scent</h1>

<p align="center">
  <strong>A beautiful CLI tool to look up fragrance profiles from Fragrantica</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.2.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="node" />
</p>

---

**scent** brings the world of fragrances to your terminal. Search any perfume by name and get instant access to its main accords, fragrance pyramid, ratings, and more — all beautifully formatted with color.

### ✨ Features

- **🔍 Fuzzy Search** — Smart auto-selection for strong matches, interactive picker when unsure
- **📊 Main Accords** — Color-coded intensity bars for every accord
- **🧪 Fragrance Pyramid** — Top, middle, and base notes in a clear visual hierarchy
- **⭐ Ratings & Votes** — Star ratings, vote counts, and gender classification
- **🔗 Similar Perfumes** — Shows "People who like this also like" and "This perfume reminds me of" recommendations
- **📝 Descriptions** — Clean, concise descriptions (auto-skipped ads and disclaimers)
- **⏳ Caching** — Results cached for 24 hours so you never wait twice
- **🎨 Beautiful Output** — Colorful terminal output with chalk

### 📦 Install

```bash
npm install -g scent-cli
```

Or run directly without installing:

```bash
npx scent-cli "Creed Aventus"
```

### 🚀 Usage

```bash
scent-cli <name> [options]
```

| Option | Description |
|--------|-------------|
| `-V, --version` | Show version number |
| `-p, --pick` | Always show the picker instead of auto-selecting |
| `-h, --help` | Display help |

#### Examples

```bash
# Auto-select the best match
scent-cli "Creed Aventus"

# Force the interactive picker
scent-cli "Bleu de Chanel" --pick

# Quick lookup
scent-cli "Sauvage"
```

### 🎯 How It Works

1. **Search** — Opens Fragrantica in a headless browser and scrapes results
2. **Select** — Picks the best match automatically, or lets you choose from a list
3. **Scrape** — Pulls the full perfume profile including accords, notes, ratings, and similar perfumes
4. **Display** — Shows everything with beautiful colored terminal output

### 🧰 Tech Stack

| Package | Role |
|---------|------|
| [Commander](https://github.com/tj/commander.js) | CLI argument parsing |
| [Playwright](https://playwright.dev) | Headless browser for scraping |
| [Chalk](https://github.com/chalk/chalk) | Terminal colors |
| [Fuse.js](https://fusejs.io) | Fuzzy string matching |
| [Ora](https://github.com/sindresorhus/ora) | Loading spinners |
| [Cheerio](https://cheerio.js.org) | HTML parsing |
| [TypeScript](https://www.typescriptlang.org) | Type safety |

### 📁 Project Structure

```
src/
├── index.ts      # CLI entry point & orchestration
├── types.ts      # TypeScript interfaces
├── search.ts     # Search & caching logic
├── scraper.ts    # Perfume page scraping
└── display.ts    # Terminal output formatting
```

### 📄 License

MIT &copy; [Hasin Hayder](https://github.com/hasinhayder)
