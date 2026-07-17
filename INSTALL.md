# INSTALL — for Claude Code

You are adding a **Stocks tab** to a Vitality Finance module. The module lives at
`app/app/finance/`. This is **purely additive** — do NOT change the subscription
radar, its state, or any existing behavior. Five steps.

> If the target dashboard's Finance module differs from this structure, adapt the
> edits to fit its `TabKey` / TabBar / module-root pattern — the *intent* is:
> add a `stocks` tab that renders `StocksView` beside the existing subs view.

---

## 1. Add the component

Copy **`StocksView.tsx`** from this repo → `app/app/finance/StocksView.tsx`.

It reads `{ state, actions, fmt, quotes, refreshQuotes }` (already provided by
`useFinanceState()`), shows a seeded market brief, and lists holdings where
`account.type === 'stocks'`, priced via the existing `/api/finance/quote` route.

## 2. Append the styles

Append everything in **`finance.module.css.append`** to the END of
`app/app/finance/finance.module.css`. (All new class names are `stocks*` /
`brief*` / `sig*` — no collisions with existing classes.)

## 3. `types.ts` — register the tab

```diff
-export type TabKey = 'net' | 'subs' | 'orders' | 'wish' | 'coach'
-export const TAB_KEYS: TabKey[] = ['net', 'subs', 'orders', 'wish', 'coach']
+export type TabKey = 'net' | 'subs' | 'orders' | 'wish' | 'coach' | 'stocks'
+export const TAB_KEYS: TabKey[] = ['net', 'subs', 'orders', 'wish', 'coach', 'stocks']
+/** Tabs actually mounted in the launch Finance tile: subs radar + stocks. */
+export const MOUNTED_TABS: TabKey[] = ['subs', 'stocks']
```

## 4. `TabBar.tsx` — label it + accept a `tabs` prop

```diff
 const LABELS: Record<TabKey, string> = {
   net: 'net worth',
-  subs: 'subs',
+  subs: 'subscriptions',
   orders: 'orders',
   wish: 'wishlist',
   coach: 'coach',
+  stocks: 'stocks',
 }

 interface Props {
   active: TabKey
   onChange: (t: TabKey) => void
+  tabs?: TabKey[]
 }

-export default function TabBar({ active, onChange }: Props) {
+export default function TabBar({ active, onChange, tabs = TAB_KEYS }: Props) {
   ...
-        {TAB_KEYS.map(key => (
+        {tabs.map(key => (
```

## 5. `FinanceModule.tsx` — mount the tab bar + switch views

Add imports:
```tsx
import StocksView from './StocksView'
import TabBar from './TabBar'
import { MOUNTED_TABS } from './types'
import type { TabKey } from './types'
```

Pull `quotes` + `refreshQuotes` out of `useFinanceState()`, derive the active tab,
and render the subs view OR the stocks view, with the tab bar underneath:

```tsx
const { state, actions, fmt, rates, quotes, refreshQuotes } = finance
const activeTab: TabKey = state.activeTab === 'stocks' ? 'stocks' : 'subs'
```
```tsx
<div key={activeTab} className={styles.tabView}>
  {activeTab === 'subs' ? (
    <>
      <SubsView state={state} actions={actions} fmt={fmt} rates={rates} />
      <SpendStrip state={state} actions={actions} fmt={fmt} rates={rates} />
    </>
  ) : (
    <StocksView state={state} actions={actions} fmt={fmt} quotes={quotes} refreshQuotes={refreshQuotes} />
  )}
</div>
<TabBar active={activeTab} onChange={actions.setActiveTab} tabs={MOUNTED_TABS} />
```

---

## Verify
- The **subscriptions** tab renders exactly as before — untouched.
- A **stocks** tab appears: market brief on top, live holdings below.
- Typecheck / build passes (`npm run build`).

Report what changed. Do not touch anything outside `app/app/finance/`.
