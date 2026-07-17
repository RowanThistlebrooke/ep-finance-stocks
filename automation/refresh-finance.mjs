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
feed.updated = new Date().toISOString()

writeFileSync(FEED_PATH, JSON.stringify(feed, null, 2) + '\n')
console.log('Wrote ' + FEED_PATH + ': ' + Object.keys(quotes).length + ' quotes, ' + news.length + ' headlines.')
console.log('Next: the mentor reads and rates the headlines, then commits and pushes.')
