# SHARP MONEY — money% vs ticket%, and the card correction — 2026-10-27

The full split dataset is in the `__NEXT_DATA__` payload of `/nfl/public-betting`, not the rendered table. **812 records across 14 games, every book, every market type, tickets AND money with counts.** The two-row table is a display cap, not a data cap.

Divergence = `money% − ticket%` per side, median across books. Positive = stake is heavier than the crowd on that side.

---

## The correction that matters

My ticket-only read said PIT, DET and TEN were contrarian. **The money says the opposite.** Sharp stake is on CLE, MIN and CIN — against all three.

| Game | Sharp side | Divergence | Our play | Verdict |
|---|---|---|---|---|
| CHI @ SEA | **CHI +11** | +11 | CHI +3.5 | **model and money agree** |
| MIN @ DET | **MIN +14** | +14 | DET −3 | money against |
| TEN @ CIN | **CIN +18** | +18 | TEN +10.5 | money against |
| CLE @ PIT | **CLE +8** | +8 | PIT −4 | money against |
| LV @ NYJ | neutral | ±2 | LV +1 | no signal |
| CAR @ GB | CAR +3 | +3 | GB −4 | mild against |

## Re-ranked card

1. **CHI +3.5** — the only play where the model and the sharp money point the same way. It was sixth on model edge alone; it is first now.
2. **TEN +10.5** — biggest money disagreement on the card (+18). Model likes the dog, money likes the favourite. One of them is wrong and the model has the injury argument.
3. **DET −3** — +14 against, and the model's case (Murray out) is a real one.
4. **PIT −4** — biggest model edge on the board (+4.36) but only +8 against. Still a play, no longer the top one.
5. **LV +1** — dead neutral on money. The edge stands on the model alone.
6. **GB −4** — weakest on both axes.

**CHI +3.5 is the play.** Model edge is small (+1.53) but it is the only one the money confirms, and confirmation is worth more than two points of model disagreement.

## Board-wide sharpest signals

Not on our card, but the strongest divergences on the slate:

| Game | Market | Divergence |
|---|---|---|
| BUF @ BAL | total **over** | **+40** |
| CHI @ SEA | moneyline CHI | +32 |
| DEN @ KC | moneyline KC | +31 |
| GB @ CAR | moneyline CAR | +22 |
| DAL @ ARI | moneyline DAL | +19 |
| CIN @ TEN | spread CIN | +18 |

**BUF @ BAL over at +40 is the single sharpest number on the board** — 40 points of stake-to-ticket divergence. That is the kind of gap that means something happened.

## Method

```js
// on https://www.actionnetwork.com/nfl/public-betting
const d = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
// d.props.pageProps.scoreboardResponse.games[].markets[bookId].event[type][].bet_info
//   .tickets.percent / .money.percent
```

## Caveats

- Divergence is a **median across books**, not a single book's number; books differ in clientele.
- Ticket counts are retail, money is stake-weighted — a +40 can be one large bet.
- Snapshot at Tuesday. Splits sharpen into the last six hours and can reverse.
- Money% and ticket% are Action's sample, not the books' own.
- **A money signal against the model is not automatically a fade** — it is a reason to size down and re-check the injury news before kickoff.
