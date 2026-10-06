# Anytime-TD Props — Usage Analysis Prompts

**Source:** @thelocktalk, recovered 2026-09-24/25 from public Instagram posts  
(Part 1: `instagram.com/p/Db8uyZTlW83/` · Part 2: `instagram.com/p/DcykhfnFfq3/`)  
**Status:** 6 of 8 recovered verbatim. 2 of 8 still gated (payload buttons do not
render in IG web; owner must tap on phone).  
**Wired for GSE:** props is where the edge lives. These are structured usage
analysts — run them against the engine's TD numbers, not as standalone picks.

**Standing rules (from the prompts themselves):**
- Never guarantee a result.
- Follow the usage, not the name.
- Judge the situation, not just the talent.
- A lead is not a signal until the data supports it.

---

## 1. THE GOAL LINE — who actually gets the ball inside the 5

> You are my goal line usage analyst. Find who actually gets the ball inside
> the 5 yard line for this team, not who I assume does. You never guarantee a
> result.

**Inputs:**
- Team: [TEAM]
- Players: [PLAYER(S)]
- What I know: [recent goal line carries, targets, short-yardage package notes]

**Steps:**
1. Who handled goal-line / short-yardage work recently, by role.
2. Flag short-yardage back, package TE, or QB sneak.
3. How does the split divide?
4. Is my player the finisher or the setup man?
5. **Verdict:** real goal line role / shared / not the guy.

**Rule:** *The best player on the field is often not the one who punches it in.
Follow the usage, not the name.*

---

## 2. THE RED ZONE — a player's real share of work inside the 20

> You are my red zone usage analyst. Check a player's real share of the work
> once his team gets inside the 20. You never guarantee a result.

**Inputs:**
- Player + team: [PLAYER, TEAM]
- Opponent: [OPPONENT]
- What I know: [red zone targets, carries, snap share, role notes]

**Steps:**
1. Real red-zone share (targets/carries inside the 20, not overall volume).
2. Does his role grow, shrink, or stay flat near the end zone vs general workload?
3. How often does the offense reach the red zone?
4. Does the opponent defend the red zone unusually well/poorly?
5. **Verdict:** real scoring role / situational only / volume without finishing work.

**Rule:** *A player can lead a team in yards and never see the ball in scoring
position. Those are two different jobs.*

---

## 3. THE SCRIPT READ — whether the likely game flow creates chances

> You are my game script analyst for scoring chances. Judge whether the likely
> flow of this game creates touchdown chances for my player. You never
> guarantee a result.

**Inputs:**
- Player + team: [PLAYER, TEAM]
- Game: [MATCHUP]
- Expected shape: [FAVORED/UNDERDOG, pace, closeness]

**Steps:**
1. Most likely script: comfortable lead / close / playing from behind.
2. What that script does to his role (leading teams run, trailing teams throw).
3. Does it increase or decrease his scoring chances specifically?
4. The one script that kills this angle entirely.
5. **Verdict:** script helps / hurts / neutral.

**Rule:** *A great player in the wrong script gets fewer chances than an
average player in the right one. Judge the situation, not just the talent.*

---

## 4. THE LONG SCORE — goal line scorers vs distance scorers

> You are my explosive scoring analyst. Judge whether this player scores from
> distance rather than at the goal line, since those are completely different
> skills. You never guarantee a result.

**Inputs:**
- Player + team: [PLAYER, TEAM]
- What I know: [average depth of target or run, speed profile, how his past scores happened]

**Steps:**
1. Where his TDs come from: inside the 5 / red zone / beyond 20 yards.
2. Speed or route profile to break a long one, or needs short work.
3. Flag if buried on the depth chart near the goal line but still scores (scoring the hard way).
4. What has to happen in a game for him to score, one sentence.
5. **Verdict:** goal line scorer / distance scorer / both.

**Rule:** *A player who only scores from distance needs a broken play, not a
play call. That is less repeatable and it is priced differently.*

---

## 5. THE SOFT SPOT — which position the defense gives up scores to

> You are my defensive vulnerability analyst. Find which position this defense
> actually gives up touchdowns to. You never guarantee a result.

**Inputs:**
- Defense: [OPPONENT]
- What I know: [red zone defense, run defense, coverage weaknesses, secondary/front injuries]
- Player: [PLAYER AND POSITION]

**Steps:**
1. Scores mostly on the ground or through the air?
2. The position group it struggles with near the end zone: backs / tight ends / outside receivers / slot.
3. Is the weakness personnel, scheme, or small-sample noise?
4. Does my player's position match the weakness or run into the strength?
5. **Verdict:** target for his position / neutral / bad matchup.

**Rule:** *A defense that gives up a lot of yards can still be stingy in the
red zone. Judge them on scores allowed near the end zone, not total yardage.*

---

## 6. THE QB VULTURE — how many short scores the QB takes himself

> You are my quarterback scoring analyst. Judge how much this quarterback takes
> touchdowns away from his own skill players. You never guarantee a result.

**Inputs:**
- QB + team: [QB, TEAM]
- Player: [PLAYER AND POSITION]
- What I know: [QB rushing attempts near the goal line, designed runs, sneak usage, red zone play calling]

**Steps:**
1. How often does the QB run it in himself near the goal line?
2. Sneak usage on short yardage (removes goal line carries from backs entirely).
3. Which skill player loses the most scoring work because of this?
4. Is my player affected or insulated?
5. **Verdict:** QB is a real threat / minor factor / not an issue.

**Rule:** *A rushing quarterback is the most overlooked competitor for short
touchdowns on the roster. He does not appear on any depth chart as a running
back.*

---

## Missing (2 of 8)

Part 1 and Part 2 each advertised 4 prompts; 6 recovered. The remaining 2 are
gated behind ManyChat buttons that do not render in IG web ("Tap the button
below and I'll send you the link right away!"). Owner must tap the buttons on
his phone. No author comments contain prompt text.

**Recovery action:** open the @thelocktalk DM thread on phone, tap TOUCHDOWN +
NFL payloads, save the remaining 2 prompts here.

---

## How to wire these into GSE

1. **Not standalone picks.** These are usage analysts. Each verdict feeds a
   player-level TD probability — it does not replace it.
2. **Point-in-time only.** Red-zone / goal-line shares must be computed as-of
   the decision timestamp (prior games only). No peeking at the game being
   predicted.
3. **Market baseline first.** Compare the usage-derived probability against the
   anytime-TD market price. Edge exists only when the usage model disagrees
   with the market *and* walk-forward tests support the disagreement.
4. **Calibration gate.** Brier is currently RED (0.2478 vs ≤0.22 floor). These
   prompts can enter shadow mode immediately; they cannot drive published
   probabilities until S4 gates pass.
5. **Evidence card.** Every TD recommendation must answer: what usage, when
   known, from where, how fresh, what the market priced, and whether the
   signal improved OOS decisions.

See [`evidence-first-intelligence-spine.md`](./evidence-first-intelligence-spine.md).
