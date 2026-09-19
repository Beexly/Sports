# NFL Roster Transaction Timing & Prop-Market Adjustment Lags
*Research Agent 17 deliverable. Sources: NFL Football Operations, ESPN, Action Network,
Tech Insider, OddsIndex, Rotowire, NFL Contract Language. Compiled from live web research.*

All 2024+ CBA rules apply to the **2026 season** (single cut-down date; 17-player practice
squads; IR returns after 4 games; up to 8 IR return slots/team).

---

## 1. 2026 TRANSACTION CALENDAR (key dates, all ET) — source: NFL Football Operations

| Date | Deadline / window | What moves |
|---|---|---|
| **Aug 30** | **6:00 PM** | 53-man roster cutdown (single date since 2024 CBA). PUP/NFI players simultaneously: place on Reserve/PUP or Reserve/NFI **or** terminate/trade/waive/fail-physical. |
| **Aug 30 (business day)** | cutdown day | Teams may designate for return **max 2** players placed on a Reserve List this business day (counts against season's 8 IR return slots). |
| **Aug 31** | 1:00 PM | Waiver claims from cut-down expire. Clubs may **establish practice squad (17 players; 1 Intl Pathway; <=6 vets, 10 rookies/2nd-years)**. |
| **Sep 6** | end | Training camp ends for all clubs. |
| **Oct 2 day-after 4th game & Oct 5-6** | 4:00 PM | Earliest a player on Reserve/PUP or Reserve/NFI may be **activated** (must have served minimum 4 games). |
| **Nov 10** | **4:00 PM** | **Trade deadline — all trading ends for 2026.** |
| **Nov 11** | — | Players with >=4 accrued seasons subject to **waiver system** rest of season. |
| **Weekly (reg. season)** | Wed / Fri 4PM / Sat | Injury reports; **Inactives** announced Fri-Sat for Sunday games. Thu/Fri reports for Wed games. |

> Note on date drift: cut-down was Tue Aug 26 (2024/25), Sun Aug 30 (2026). Always **late August, 6:00 PM ET**, single date. Trade deadline always **Week 9 Tuesday 4 PM ET** (Nov 4 in 2025 -> Nov 10 in 2026).

---

## 2. TRANSACTION TYPES & TIMING RULES

### CUTS (53-man reduction) - Aug 30, 6:00 PM ET
- 90 in camp -> submit final 53 by deadline.
- **Process lag**: submitted electronically -> *Personnel Notice*; binding roster = state at 6:00 PM.
  Teams tip moves 24-48h pre-deadline (cut-down Thu/Fri), but rosters not final until 6 PM ->
  depth-chart/snap-share assumptions stale ~1 day.
- Waiver claims run Aug 31, 1 PM (priority by draft order thru Week 3, then standings).
  -> **claims unresolved until next calendar day**, so roster survivors unknown until Aug 31 PM.
- Practice squad set Aug 31 -> final 53 + PS picture solid by Aug 31 1 PM.

### TRADES
- **In-season**: any time except Nov 10 (4 PM) deadline. Deal can be agreed/leaked *before*
  deadline and collapse, or reported *after* -> settlement risk window.
- **Off-season**: trading period opens **March 11, 4 PM ET** (after contracts expire).
- **Post-deadline processing**: Nov 11 onward, transactions published in daily batch
  *Personnel Notice* covering ~4-10 PM ET (the "portal" window). -> trade agreed 6 PM Tue may not
  be *official* until next morning notice.

### INJURED RESERVE (IR) PLACEMENT + RETURN
- **Aug 30 cut-down**: teams may place up to 2 players on IR & designate for return same day
  (count against season's return slots).
- **In-season**: any player can go on IR.
- **Return rule (2022+ CBA)**: placed player must miss **min 4 games** before designated for
  return; no 2-DTR cap, but each team has **up to 8 return activations/season** (ESPN/NFL).
  Per player max 2 returns.
- **Activation window**: once designated, **21 days** to move to active roster; must clear
  physical / ramp practice.
- **Edge**: IR placement -> market reacts seconds; *return timeline* + beneficiary role props lag.

### PUP / NFI
- Placed at cut-down (Aug 30). Activation eligible only **after serving min 4 games**
  (Oct 2 day-after / Oct 5-6, 4 PM ET). -> PUP player = **out Weeks 1-4**, a fixed window.

### PRACTICE SQUAD -> ACTIVE (Elevations / Call-ups)
- **Standard Elevation Addendum**: up to **2 elevations per game**; each player max **3
  elevations per season** before team must sign to 53 (4th = roster move + waivers). (NFL contract language)
- Elevations submitted **Fri-Sat** for Sun game (Sat for Mon); processed via league notice cycle.
  -> elevated player's snap-count prop + displaced incumbent's prop lag **hours** after processing.
- Practice squad = **17 players** (2025+), incl. 1 International Pathway slot.

---

## 3. REPORTING / PROCESSING SPEED (the "wire lag")

| Step | Speed |
|---|---|
| Team announces via X/social -> market reacts | seconds |
| Sportsbook auto "circles" game (scrapes out/torn/indefinitely) | seconds to ~2 min |
| Primary player prop + spread + total re-price | minutes (2-10) |
| Secondary / "next man up" teammate props re-price | hours (2-12 h unsteady) |
| League *Personnel Notice* (officially binds move) | next daily batch (4-10 PM ET portal, or overnight for cut-down claims) |
| Waiver claims resolve (cut-down) | next calendar day (Aug 31, 1 PM -> results overnight) |

> The market reacts faster than league processing. Player ruled out 9 AM on social -> books reprice
in minutes; league notice formally placing on IR may drop in the evening batch.

---

## 4. WEEKLY PROP-MARKET CYCLE (windows traded against)
*Sources: Tech Insider NFL Betting Guide 2026, Action Network, BetrQL day-by-day, Rotowire.*

| Period | Market state | Edge / risk |
|---|---|---|
| Mon-Tue | Next week props **open**. Opener = largest hold, lowest limits. | Early value if model sees a number; volatile. |
| Wed | Injury Report #1 (practice participation). | Base-game line near peak efficiency; **prop boards widest**. |
| Wed close | Line at ~peak sharp efficiency (Mon-Wed sharp window). | Cleanest baseline; retail money not yet flowed. |
| Thu-Fri | Retail flows; **final injury report due Fri 4 PM ET** (Sun games). | Line drifts on public money; biggest prop mis-pricing as role changes not priced. |
| Fri-Sat | **Inactives** announced for Sunday games (league requires submission ~10 AM ET Sun; teams tip Fri/Sat). | Primary prop adjusts minutes; teammate props lag hours -> core edge. |
| <=4h pre-kickoff | Largest line movements of week on news. | Props begin locking; books pull markets on breaking news. |
| 10-30 min pre-kick | Props lock (varies; spread/total often earlier). | Late inactives un-bettable; earlier role bets settle. |

---

## 5. THE EDGE WINDOWS (transaction -> prop lag) - core deliverable

### EDGE A - "Seconds" circle, "Hours" to stabilize (headline news)
- Credible injury/transaction news -> books **circle** within seconds, reopen minutes later with
  primary prop + spread + total re-priced (often over-adjusted, then reined in by sharps in
  "price discovery"). (Action Network: gap between news and adjustment = seconds, not minutes.)

### EDGE B - Secondary/"next man up" props lag HOURS (biggest, most reliable edge)
- "A player's prop line might not move for **hours** after news breaks that a key teammate is
  out, even though that absence directly affects the player's expected output." (OddsIndex)
- Starter ruled out -> backup's snap/share/role **not repriced for 2-12 h**.
- Action Network: target **Over** on secondary option's usage/share prop right after primary
  goes down, before the book adjusts the secondary line.

### EDGE C - Cut-down week (Aug 28-31) fixed-window lag
- Rosters final 6 PM Aug 30; claims + practice squads settle **next calendar day** (Aug 31).
  Weekly props (Week 1+) may price before that picture is locked -> **~24 h stale role props**.
  Best on week-vs-next week's snap-count/target-share props of players whose fate was sealed
  only at the Aug 30 deadline.

### EDGE D1 - Practice-squad elevation lag (Fri-Sat -> Sunday)
- Elevations submitted Fri-Sat don't reprice the elevated player's snap prop / displaced
  incumbent's prop for hours after processing. Max 3 elevations/player/season, 2/game -> recurring edges.

### EDGE D2 - PUP/NFI fixed absence (Weeks 1-4)
- PUP at cut-down = **out Weeks 1-4**; activation eligible Oct 5 (4 PM). Market prices the long
  absence early; beneficiary role props adjust slowly.

### EDGE E - Trade-deadline settling gap (Nov 10, 4 PM)
- Trades agreed/leaked before 4 PM can collapse; reported after deadline may be priced already.
  Books remove + reopen markets on breaking trade news with **reduced limits** -> thin-liquidity edge.

### EDGE F - IR-return timeline vs. activation window
- IR placement -> market reacts instantly. Return gated: min 4 games missed, then 21-day window.
  Value of returning player's prop vs. incumbent who played mis-priced until the
  **designation-for-return** moment (the 21-day countdown window).

---

## 6. KEY CAVEAT - NFL prop-market clampdown (2025-2026)
- NFL issued **memos limiting prop-bet info** shared with betting partners; working with state
  regulators to restrict certain player props (esp. around injury/news timing). Books pull markets
  preemptively on breaking news, reopen with reduced limits -> **shortens some windows, widens
  bid-ask spread**. (NYT Athletic Nov 2025; ESPN.)

---

## Sources (primary / authoritative)
1. NFL Football Operations - NFL Important Dates (operations.nfl.com) - cut-down Aug 30 6 PM; trade
   deadline Nov 10 4 PM; PUP activation Oct 5-6; waiver claims Aug 31 1 PM.
2. NFL Football Operations - Contract Language (standard elevation addendum: 3 elevations/player; 2/game).
3. ESPN - IR return rules (4-game min, 8 return slots/team, 21-day activation window).
4. Action Network - How Injuries Affect Betting Lines (seconds-to-circle; price discovery; next-man-up).
5. Tech Insider - NFL Betting Guide 2026 (weekly cycle: Mon-Wed sharp, Thu-Fri retail, <=4h news).
6. OddsIndex best-time-to-bet (prop line lags hours after teammate news).
7. Rotowire - injury reports Wed/Fri-by-4PM/Sat; inactives Fri-Sat.
8. Unabated / ESPN / SI / NFL ops - practice squad = 17; 2 elevations/game; 3/player/season; trade deadline Week 9 Tue.
9. Covers - line movement to kickoff; late inactives matter.

> Date reconciliation: sources straddle 2025 (Aug 26, Nov 4) and 2026 (Aug 30, Nov 10). 2026
> numbers used throughout (NFL Football Operations current Important Dates page).
