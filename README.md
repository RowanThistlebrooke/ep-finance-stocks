# 📈 Finance — the tile

Your money on your board. The grid shows the Finance poster (the amber
candles); tap it and the full page opens: your stocks read as one basket, a
daily pick, news only about what you own, plain-English health cards.

No jargon survives: "Expensive", never "P/E 32x". Mint is good, amber is
caution, never red.

---

## Add it to your seed board — one line

Open Claude Code inside your dashboard folder and paste:

> **Add the finance tile from `github.com/rowanthistlebrooke/ep-finance-stocks` to my dashboard.**

The mentor fetches `finance.html` into `tiles/`, registers it, and it's on
your board. Empty and honest until it's yours.

## Make it live (the episode)

The tile ships sealed — it never fetches and never holds a key. Real prices
and real news flow in through the routine in [`EPISODE.md`](./EPISODE.md):

1. Your own free Finnhub key (never shared, never committed)
2. Your holdings, said once
3. `automation/refresh-finance.mjs` — real quotes + real headlines into
   `tiles/data/finance.json`, then the mentor reads and rates what landed,
   and pushes. Your live board updates itself.

Ask your mentor to **"run the finance episode"** and it walks you through.

---

## For the hosted Vitality app

This repo also carries the module version — a Stocks tab beside your
subscription radar. Paste:

> **Install the Stocks tab from `github.com/rowanthistlebrooke/ep-finance-stocks` into my Finance module.**

Claude reads [`INSTALL.md`](./INSTALL.md) and wires it into your board.

---

## What's free vs. what's in the vault

- **Free (this repo):** the tile, the page, the refresh script — filled by hand
  or refreshed when you ask.
- **🔒 Inner Circle +:** the **7am routine** that reads, rates, and pushes the
  brief automatically, every morning, while you sleep.

---

*Built on [Vitality](https://github.com/rowanthistlebrooke). One video, one repo, one line to install.*
