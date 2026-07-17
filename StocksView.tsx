'use client'

import { useMemo, useState } from 'react'
import styles from './finance.module.css'
import type { Account, FinanceState, StockQuote } from './types'
import type { FinanceActions, QuoteMap } from './state'

/**
 * Stocks tab — a focused market view that sits beside the subscription radar.
 * Top: a market brief (news + buy/sell/watch signals, "best spots" highlighted).
 * Bottom: the user's live stock holdings (accounts with type === 'stocks'),
 * priced by the SAME quote machinery net worth uses — the quote-sync effect in
 * state.ts recomputes each holding's amountCHF from /api/finance/quote, so here
 * we only render numbers and read changePct off the live QuoteMap. No new
 * pricing, no new state slice.
 */
interface Props {
  state: FinanceState
  actions: FinanceActions
  fmt: (chf: number) => string
  quotes: QuoteMap
  refreshQuotes: () => void
}

// -----------------------------------------------------------------------------
// Market brief — seed data
//
// Design intent: a scheduled Claude routine overwrites this later (read_data /
// save_data into a finance slot). For now it ships as a constant so the tab
// boots with a real, useful briefing instead of an empty shell.
// -----------------------------------------------------------------------------

type Signal = 'bull' | 'bear' | 'watch'

interface MarketItem {
  tag: Signal
  /** Ticker the item is about. */
  tk: string
  /** Headline. */
  hl: string
  /** Source outlet. */
  src: string
  /** One-line "why it matters". */
  why: string
  /** true = a "best spot today" — rendered in the highlighted group. */
  top?: boolean
}

const MARKET_BRIEF: MarketItem[] = [
  { tag: 'bull',  tk: 'UNH',  hl: 'UnitedHealth blows past estimates, hikes earnings outlook', src: 'CNBC',    why: 'Beat + raised guidance, reining in costs, $1.5B into AI', top: true },
  { tag: 'watch', tk: 'NFLX', hl: 'Netflix reports earnings after the bell today',             src: 'CNBC',    why: 'Ad-tier growth + engagement in focus, live catalyst',    top: true },
  { tag: 'bull',  tk: 'IWM',  hl: 'Strongest small-cap market in three decades',               src: 'CNBC',    why: 'Russell 2000 up ~20%, best first half since 1991',       top: true },
  { tag: 'watch', tk: 'SMH',  hl: "TSMC's strong quarter isn't lifting chip stocks",           src: 'CNBC',    why: 'Cramer flags the disconnect, chips lag fundamentals' },
  { tag: 'watch', tk: 'USO',  hl: 'Iran tells Houthis to close Red Sea gateway if US strikes', src: 'Reuters', why: 'Shipping + oil risk building, watch crude' },
  { tag: 'bear',  tk: 'JETS', hl: 'Iran war leaves European airlines facing a shakeout',       src: 'Reuters', why: 'Conflict + fuel-cost risk pressures the sector' },
]

const SIGNAL_LABEL: Record<Signal, string> = {
  bull: 'bullish',
  bear: 'bearish',
  watch: 'watch',
}

const SIGNAL_CLASS: Record<Signal, string> = {
  bull: styles.mbPillBull,
  bear: styles.mbPillBear,
  watch: styles.mbPillWatch,
}

function MarketCard({ item }: { item: MarketItem }) {
  return (
    <div className={`${styles.mbCard} ${item.top ? styles.mbCardTop : ''}`}>
      <div className={styles.mbCardHead}>
        <span className={`${styles.mbPill} ${SIGNAL_CLASS[item.tag]}`}>{SIGNAL_LABEL[item.tag]}</span>
        <span className={styles.mbTicker}>{item.tk}</span>
        <span className={styles.mbSrc}>{item.src}</span>
      </div>
      <div className={styles.mbHeadline}>{item.hl}</div>
      <div className={styles.mbWhy}>{item.why}</div>
    </div>
  )
}

function MarketBrief() {
  const best = useMemo(() => MARKET_BRIEF.filter(m => m.top), [])
  const rest = useMemo(() => MARKET_BRIEF.filter(m => !m.top), [])

  return (
    <div className={styles.marketBrief}>
      {best.length > 0 && (
        <>
          <div className={styles.mbGroupLabel}>best spots today</div>
          <div className={styles.mbGrid}>
            {best.map(m => <MarketCard key={m.tk} item={m} />)}
          </div>
        </>
      )}
      {rest.length > 0 && (
        <>
          <div className={styles.mbGroupLabel}>also moving</div>
          <div className={styles.mbGrid}>
            {rest.map(m => <MarketCard key={m.tk} item={m} />)}
          </div>
        </>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Holdings — live stock holdings, priced by the shared quote machinery
// -----------------------------------------------------------------------------

function HoldingRow({
  acct,
  quote,
  fmt,
  onDelete,
}: {
  acct: Account
  quote: StockQuote | undefined
  fmt: (chf: number) => string
  onDelete: () => void
}) {
  const changeLabel = quote && quote.changePct != null
    ? `${quote.changePct >= 0 ? '+' : ''}${quote.changePct.toFixed(2)}%`
    : null
  const changeCls = quote && quote.changePct != null
    ? (quote.changePct >= 0 ? styles.up : styles.down)
    : ''
  const label = acct.ticker || acct.name

  return (
    <div className={styles.stockRow}>
      <span className={styles.tickerPill}>{label}</span>
      <span className={styles.stockShares}>{acct.shares ?? 0} sh</span>
      <span className={styles.stockChangeCol}>
        {changeLabel ? (
          <span className={`${styles.holdingChange} ${changeCls}`}>{changeLabel}</span>
        ) : (
          <span className={styles.stockChangeNone}>—</span>
        )}
      </span>
      <span
        className={styles.stockValue}
        title={quote ? 'Live value (USD price × shares, converted to display currency)' : 'Last known value — live price unavailable right now'}
      >
        {fmt(acct.amountCHF)}
        {!quote && acct.amountCHF > 0 && <span className={styles.holdingStale}> · cached</span>}
      </span>
      <button
        type="button"
        className={styles.deleteBtn}
        title="Delete"
        aria-label={`Delete ${label}`}
        onClick={onDelete}
      >
        ×
      </button>
    </div>
  )
}

function Holdings({ state, actions, fmt, quotes, refreshQuotes }: Props) {
  const stockAccounts = useMemo(
    () => state.accounts.filter(a => a.type === 'stocks'),
    [state.accounts],
  )
  const total = useMemo(
    () => stockAccounts.reduce((s, a) => s + (Number(a.amountCHF) || 0), 0),
    [stockAccounts],
  )

  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')

  function addStock() {
    const s = parseFloat(shares)
    if (!ticker.trim() || !isFinite(s) || s <= 0) return
    // Same action net worth's stocks card uses — the quote-sync effect fills
    // in amountCHF on the next price tick.
    actions.addHolding(ticker, s)
    setTicker('')
    setShares('')
  }

  return (
    <div className={styles.accountCard}>
      <div className={styles.accountHead}>
        <span className={styles.accountLabel}>Your holdings</span>
        <span className={styles.accountTotal}>
          {fmt(total)}
          <span className={styles.accountTotalPct}>· portfolio</span>
        </span>
      </div>

      {stockAccounts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>No holdings yet.</div>
          <div className={styles.emptyBody}>
            Add a ticker and how many shares you hold. Live prices pull in on their own once your
            Finnhub key is set, and the value keeps itself up to date.
          </div>
        </div>
      ) : (
        <div className={styles.accountList}>
          {stockAccounts.map(acct => (
            <HoldingRow
              key={acct.id}
              acct={acct}
              quote={quotes[(acct.ticker || '').toUpperCase()]}
              fmt={fmt}
              onDelete={() => actions.deleteAccount(acct.id)}
            />
          ))}
        </div>
      )}

      <div className={styles.addEyebrow}>+ add a stock</div>
      <div className={styles.quickAdd}>
        <input
          className={styles.quickAddInput}
          type="text"
          value={ticker}
          placeholder="Ticker (e.g. VTI)"
          autoCapitalize="characters"
          spellCheck={false}
          onChange={e => setTicker(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter') addStock() }}
        />
        <input
          className={styles.quickAddInput}
          type="number"
          inputMode="decimal"
          step="0.0001"
          value={shares}
          placeholder="Shares"
          onChange={e => setShares(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addStock() }}
        />
        <button type="button" className={styles.quickAddBtn} onClick={addStock}>+ Add</button>
      </div>

      {stockAccounts.length > 0 && (
        <div className={styles.holdingsFooter}>
          <button
            type="button"
            className={styles.linkAction}
            onClick={refreshQuotes}
            title="Force a fresh quote fetch (otherwise cached for 15 min)"
          >
            ↻ refresh prices
          </button>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Root view
// -----------------------------------------------------------------------------

export default function StocksView({ state, actions, fmt, quotes, refreshQuotes }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionEyebrow}>
        <span>Market brief</span>
        <span className={styles.sectionCount}>
          {MARKET_BRIEF.length} {MARKET_BRIEF.length === 1 ? 'signal' : 'signals'}
        </span>
      </div>

      <MarketBrief />

      <div className={styles.sectionEyebrow}>
        <span>Holdings</span>
      </div>

      <Holdings
        state={state}
        actions={actions}
        fmt={fmt}
        quotes={quotes}
        refreshQuotes={refreshQuotes}
      />
    </section>
  )
}
