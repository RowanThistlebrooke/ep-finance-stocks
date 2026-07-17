#!/usr/bin/env node
/**
 * The finance refresh - half one of the daily routine.
 *
 * Prices every holding in tiles/data/finance.json and pulls each ticker's
 * latest real headlines from Finnhub, then writes the file back. Run it from
 * the board repo root:
 *
 *   node automation/refresh-finance.mjs
 *
 * Half two is the mentor: it READS what landed, sets each headline's signal
 * (good / watch / negative) and rewrites `why` in one plain sentence from what
 * the article actually says, then commits and pushes. This script never does
 * that part on purpose - it fetches facts, it does not judge them, and it
 * never invents a tone, a pick, or a health rating.
 *
 * The key comes from FINNHUB_API_KEY in .env.local (gitignored) or the
 * environment. Your own free key from finnhub.io - never a shared one.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const FEED_PATH = 'tiles/data/finance.json'

function keyFromEnvLocal() {
  if (process.env.FINNHUB_API_KEY) return process.env.FINNHUB_API_KEY.trim()
  if (!existsSync('.env.local')) return null
  const line = readFileSync('.env.local', 'utf8')
    .split('\n')
    .find(l => l.trim().startsWith('FINNHUB_API_KEY='))
  return line ? line.split('=').slice(1).join('=').trim() : null
}

const KEY = keyFromEnvLocal()
if (!KEY) {
  console.error('No FINNHUB_API_KEY found. Put it in .env.local (gitignored):')
  console.error('  FINNHUB_API_KEY=your_key_from_finnhub.io')
  process.exit(1)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
async function get(url) {
  try {
    const r = await fetch(url + '&token=' + KEY)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

const feed = existsSync(FEED_PATH)
  ? JSON.parse(readFileSync(FEED_PATH, 'utf8'))
  : { holdings: [] }

const holdings = Array.isArray(feed.holdings) ? feed.holdings : []
if (!holdings.length) {
  console.log('No holdings in ' + FEED_PATH + ' yet. Tell the mentor what you own first.')
  process.exit(0)
}

const iso = d => d.toISOString().slice(0, 10)
const to = new Date()
const from = new Date(Date.now() - 2 * 86400e3)

const quotes = {}
const news = []

for (const h of holdings) {
  const t = String(h.ticker || '').trim().toUpperCase()
  if (!t) continue

  const q = await get('https://finnhub.io/api/v1/quote?symbol=' + t)
  if (q && isFinite(q.c) && q.c > 0) {
    quotes[t] = { priceUSD: q.c, changePct: isFinite(q.dp) ? q.dp : null }
  } else {
    console.warn('  no price for ' + t)
  }

  const items = await get('https://finnhub.io/api/v1/company-news?symbol=' + t + '&from=' + iso(from) + '&to=' + iso(to))
  for (const n of (Array.isArray(items) ? items.slice(0, 2) : [])) {
    if (!n || !n.headline) continue
    news.push({
      ticker: t,
      // 'watch' until the mentor has actually read it. Honest default: a tone
      // this script assigned without reading would be an invented judgement.
      signal: 'watch',
      headline: String(n.headline),
      why: 'From ' + (n.source || 'the wire') + '. Unread - ask your mentor to read and rate it.',
    })
  }

  await sleep(1100) // free tier is 60 calls/min. never hammer it.
}

feed.quotes = quotes
feed.news = news // the mentor rewrites signals + why after reading, then pushes

// ── Crypto. Held coins live in feed.cryptoHoldings: [{ coin:'bitcoin',
//    symbol:'BTC', qty }]. Prices come from CoinGecko, keyless. Coin news
//    comes from Finnhub's crypto wire, cut mechanically to headlines that
//    actually name a held coin - the mentor judges the survivors, same law.
//    No holdings, no calls: the crypto episode simply hasn't started yet.
const cryptoHoldings = Array.isArray(feed.cryptoHoldings) ? feed.cryptoHoldings : []
if (cryptoHoldings.length) {
  const ids = cryptoHoldings.map(h => String(h.coin || '').toLowerCase()).filter(Boolean)
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(ids.join(',')) +
      '&vs_currencies=chf&include_24hr_change=true'
    )
    if (r.ok) {
      const data = await r.json()
      const cq = {}
      for (const id of ids) {
        const row = data[id]
        if (row && isFinite(row.chf)) {
          cq[id] = { priceCHF: row.chf, changePct: isFinite(row.chf_24h_change) ? row.chf_24h_change : null }
        }
      }
      feed.cryptoQuotes = cq
    }
  } catch { console.warn('  coingecko unreachable; crypto prices keep their last values') }

  const wire = await get('https://finnhub.io/api/v1/news?category=crypto')
  const cryptoNews = []
  for (const n of (Array.isArray(wire) ? wire : [])) {
    if (!n || !n.headline) continue
    const hl = String(n.headline).toLowerCase()
    const hit = cryptoHoldings.find(h =>
      hl.includes(String(h.symbol || '').toLowerCase()) || hl.includes(String(h.coin || '').toLowerCase()))
    if (!hit) continue // general crypto chatter is not YOUR coin's news
    cryptoNews.push({
      symbol: String(hit.symbol || hit.coin).toUpperCase(),
      signal: 'watch',
      headline: String(n.headline),
      why: 'From ' + (n.source || 'the wire') + '. Unread - ask your mentor to read and rate it.',
    })
    if (cryptoNews.length >= 3) break
  }
  feed.cryptoNews = cryptoNews
}

// Subscriptions have no wire to fetch: their data source is Gmail receipts,
// which is its own episode. This script stays honest and touches nothing.

feed.updated = new Date().toISOString()

writeFileSync(FEED_PATH, JSON.stringify(feed, null, 2) + '\n')
console.log('Wrote ' + FEED_PATH + ': ' + Object.keys(quotes).length + ' stock quotes, ' + news.length + ' headlines'
  + (cryptoHoldings.length ? ', ' + Object.keys(feed.cryptoQuotes || {}).length + ' coin prices, ' + (feed.cryptoNews || []).length + ' coin headlines' : '')
  + '.')
console.log('Next: the mentor reads and rates what landed, then commits and pushes.')
