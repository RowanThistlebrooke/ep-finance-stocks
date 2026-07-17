# The episode: Finance, live

For the mentor. The tile is already on the board (the three moves). This file
is the automation behind it: real prices and real news, flowing in daily,
through git, with the key never leaving their machine.

Follow it like the setup: one step at a time, exact clicks, say what each step
gives them and whether it is optional. The house rules outrank this file.

---

## 0. The board's host must know feeds

Compare their `lib/tiles/host.js` with the seed's latest
(github.com/rowanthistlebrooke/seed). If theirs predates feed support (no
`fetchFeed` in the file), replace that one file with the seed's current copy.
One file, nothing else.

## 1. Their own key (free)

Send them to finnhub.io - Get free API key - sign up - copy the key.

Write it into `.env.local` at the board repo root:

```
FINNHUB_API_KEY=their_key
```

Make sure `.gitignore` exists and contains `.env.local`. The key never gets
committed, never goes in a tile, and is never shared - their quota, their key.

## 2. Their holdings, once

Ask what they own: ticker and share count, that is all. Write
`tiles/data/finance.json`:

```json
{
  "holdings": [
    { "ticker": "VOO", "shares": 3 },
    { "ticker": "AAPL", "shares": 10 }
  ]
}
```

From now on this file is the list. They change holdings by telling you; you
edit this file.

## 3. Wire the tile to the feed

In `lib/tiles/registry.js`, the finance entry gains its feed (and its page, if
not already there):

```
{ id: 'finance', name: 'Finance', file: 'tiles/finance.html', size: 'm', page: true, data: 'tiles/data/finance.json' }
```

## 4. The refresh - run it now

Copy `automation/refresh-finance.mjs` from this repo into the board repo, then
from the board root:

```
node automation/refresh-finance.mjs
```

It writes real quotes and the latest real headlines into the feed. Then YOUR
half: read each headline it wrote, set its `signal` (good / watch / negative)
and rewrite `why` in one plain sentence - only from what the piece actually
says. If you have not read it, it stays `watch`.

The pick and the health cards are yours too, same law: written only from real
reading, never invented. Their shapes are declared in `tiles/finance.html`
(DAILY_PICK, HOLDING_NEWS, STOCK_HEALTH and the HealthCard renderer) - read
them there, never guess. Empty is always an honest state.

Then commit and push (never `.env.local`). The live board updates on its own.

## 5. The rhythm (optional)

Offer once: they can ask you to "refresh my stocks" any time - that runs step
4 whole. If they want it daily and their machine supports scheduled Claude
tasks, schedule it. If not, say plainly it runs when they ask. Never promise a
schedule you cannot keep.

## 6. The cloud (optional) - every morning, laptop closed

GitHub can run the facts half daily. Copy `cloud/refresh-finance.yml` from
this repo into their board repo at `.github/workflows/refresh-finance.yml`,
then walk them through the ONE browser step, exact clicks:

their board repo on github.com - Settings - Secrets and variables - Actions -
New repository secret - Name: `FINNHUB_API_KEY` - Value: their key - Add secret.

Push the workflow. From tomorrow, 06:00 UTC: fresh prices and raw headlines
land in the feed, the push wakes Vercel, the live board updates itself. Crypto
prices ride along keyless (CoinGecko) once `cryptoHoldings` exist in the feed.

BE HONEST about the split: the cloud runs the FACTS. The judgement (THE FILTER
LAW - rating, why lines, pick, health) still happens through you when they say
"refresh my stocks" - it reads whatever accumulated. Fully-cloud judgement is
the scheduled-AI episode, later. Subscriptions have no wire at all yet: their
source is Gmail, which is its own episode.

---

Sealed stays sealed: the tile never fetches and never sees the key. Facts come
from Finnhub; judgements come from you, after reading; everything reaches the
board through git.
