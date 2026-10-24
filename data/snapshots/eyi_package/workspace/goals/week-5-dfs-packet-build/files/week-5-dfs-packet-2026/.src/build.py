#!/usr/bin/env python3
"""Generate Week 5 DFS Packet DOCX — information corpus only, no metrics."""
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import pathlib

OUT = pathlib.Path.home() / "workspace/your_files/week-5-dfs-packet-2026/Week 5 DFS Packet 2026.docx"

doc = Document()
# Page setup - narrow margins for dense packet feel
for s in doc.sections:
    s.top_margin = Inches(0.5)
    s.bottom_margin = Inches(0.5)
    s.left_margin = Inches(0.6)
    s.right_margin = Inches(0.6)

style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(9)
style.paragraph_format.space_after = Pt(4)

# Colors
NAVY = RGBColor(0x0F, 0x2B, 0x46)
TEAL = RGBColor(0x0E, 0x7A, 0x6B)
GRAY = RGBColor(0x5A, 0x6C, 0x7D)
LIGHT_BG = "F2F4F7"

def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), color)
    shd.set(qn('w:val'), 'clear')
    tcPr.append(shd)

def add_heading_styled(text, level=1):
    h = doc.add_heading(text, level=level)
    for r in h.runs:
        r.font.color.rgb = NAVY
    return h

def add_table(headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = h
        for p in hdr[i].paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.bold = True
                r.font.size = Pt(7.5)
                r.font.color.rgb = RGBColor(0xFF,0xFF,0xFF)
        shade(hdr[i], "0F2B46")
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = str(val)
            for p in cells[i].paragraphs:
                for r in p.runs:
                    r.font.size = Pt(7.5)
    # shade alternating
    for idx, row in enumerate(t.rows[1:], start=1):
        if idx % 2 == 0:
            for c in row.cells:
                shade(c, LIGHT_BG)
    doc.add_paragraph("", style='Normal').paragraph_format.space_after = Pt(2)
    return t

def note_box(text):
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), 'FFF8E1')
    shd.set(qn('w:val'), 'clear')
    pPr.append(shd)
    r = p.add_run(text)
    r.font.size = Pt(8)
    r.italic = True
    r.font.color.rgb = RGBColor(0x6D,0x4C,0x00)
    return p

# COVER
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("GALAXY SPORTS EDGE")
r.font.size = Pt(9)
r.font.color.rgb = TEAL
r.bold = True
r.font.name = 'Calibri'

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("Week 5 DFS Packet")
r.font.size = Pt(28)
r.bold = True
r.font.color.rgb = NAVY

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("2026 NFL Season  •  October 8–12, 2026  •  Information Corpus — Phase 1")
r.font.size = Pt(11)
r.font.color.rgb = GRAY

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("Built Wednesday Oct 7, 2026 (CDT) — Wednesday build, Thursday/Friday update windows noted throughout.\nNo projections, no metrics, no ownership forecasts in this phase. Raw information only for engine ingestion.")
r.font.size = Pt(8.5)
r.italic = True
r.font.color.rgb = GRAY

# Status banner table
add_table(
    ["Item", "Status as of Wed Oct 7 evening", "Next action"],
    [
        ["SiriusXM Ch 87 Mon–Wed replays", "PENDING — manual pull in progress; nightly job missed 10/6", "Complete Mon/Tue/Wed + 11:50 PM Wed late-show pull"],
        ["YouTube hyper-extensive sweep", "SCHEDULED TONIGHT — 15–20 videos targeted", "Transcribe, timestamp, extract analyst claims verbatim"],
        ["DraftKings salaries (all slates)", "PARTIAL — QB board captured; full lobby pull pending", "Pull Main, Main+Late, Showdown, TNF/MNF single-game files"],
        ["Injury / availability", "LIVE — Wednesday practice reports in", "Update Thu/Fri/Sat with practice + inactive lists"],
        ["Weather / venues", "London + dome/outdoor noted; forecasts pending", "Add hourly wind/precip by Friday morning"],
        ["Engine / metrics layer", "ON HOLD BY DESIGN — Garrett directive", "Run only after corpus is locked"],
    ]
)

note_box("READ THIS FIRST — How to use this packet: Sections 1–4 are locked facts (schedule, slates, salaries captured so far, injuries sourced). Sections 5–7 are structured intake logs — every SiriusXM show and YouTube video gets a dated entry with speaker, timestamp, exact claim, and confidence language preserved. Do not convert a claim into a projection in this document. The engine pass happens after the corpus is complete.")

add_heading_styled("1  Week 5 at a Glance", 1)
doc.add_paragraph("Week 5 runs Thursday Oct 8 through Monday Oct 12, 2026. Fifteen games — the first bye week of the season. Carolina Panthers and Kansas City Chiefs are on bye. The Sunday early window includes the second London game of the year (Eagles vs Jaguars at Tottenham Hotspur Stadium, Jacksonville designated home team). Prime time: Buccaneers at Cowboys Thursday night, Ravens at Falcons Sunday night, Bills at Rams Monday night. Chicago at Green Bay was flexed from 4:25 PM ET to 1:00 PM ET on Sept 29 — now a 1:00 PM ET FOX game at Lambeau Field.")

add_table(
    ["Window", "Games", "DFS relevance"],
    [
        ["Thu Oct 8 — TNF", "1 (TB @ DAL)", "Showdown only; not on Sunday Main"],
        ["Sun Oct 11 — London 9:30 AM ET", "1 (PHI vs JAX)", "Early/London slate + Main inclusion varies by site — verify in lobby"],
        ["Sun Oct 11 — 1:00 PM ET", "8", "Core Main slate window"],
        ["Sun Oct 11 — 4:05 / 4:25 PM ET", "3", "Late window; Main + Late swap leverage"],
        ["Sun Oct 11 — SNF", "1 (BAL @ ATL)", "Showdown + Sunday Night special slates"],
        ["Mon Oct 12 — MNF", "1 (BUF @ LAR)", "Showdown; Main+Late / Mon-Thu combined slates"],
    ]
)

add_heading_styled("Full Schedule — All Times Eastern", 2)
add_table(
    ["Date", "Matchup", "Time (ET)", "TV", "Venue / Note"],
    [
        ["Thu Oct 8", "Tampa Bay Buccaneers @ Dallas Cowboys", "8:15 PM", "Prime Video", "AT&T Stadium, Arlington, TX"],
        ["Sun Oct 11", "Philadelphia Eagles vs Jacksonville Jaguars", "9:30 AM", "NFL Network", "Tottenham Hotspur Stadium, London (JAX home)"],
        ["Sun Oct 11", "Cincinnati Bengals @ Miami Dolphins", "1:00 PM", "FOX", "Hard Rock Stadium, Miami Gardens, FL"],
        ["Sun Oct 11", "Cleveland Browns @ New York Jets", "1:00 PM", "CBS", "MetLife Stadium, East Rutherford, NJ"],
        ["Sun Oct 11", "Houston Texans @ Tennessee Titans", "1:00 PM", "CBS", "Nissan Stadium, Nashville, TN — final season at current stadium"],
        ["Sun Oct 11", "Indianapolis Colts @ Pittsburgh Steelers", "1:00 PM", "CBS", "Acrisure Stadium, Pittsburgh, PA"],
        ["Sun Oct 11", "Las Vegas Raiders @ New England Patriots", "1:00 PM", "CBS", "Gillette Stadium, Foxborough, MA"],
        ["Sun Oct 11", "Minnesota Vikings @ New Orleans Saints", "1:00 PM", "FOX", "Caesars Superdome, New Orleans, LA (dome)"],
        ["Sun Oct 11", "New York Giants @ Washington Commanders", "1:00 PM", "FOX", "Northwest Stadium, Landover, MD"],
        ["Sun Oct 11", "Chicago Bears @ Green Bay Packers", "1:00 PM", "FOX", "Lambeau Field, Green Bay, WI — flexed from 4:25 PM"],
        ["Sun Oct 11", "Denver Broncos @ Los Angeles Chargers", "4:05 PM", "CBS", "SoFi Stadium, Inglewood, CA"],
        ["Sun Oct 11", "Detroit Lions @ Arizona Cardinals", "4:25 PM", "FOX", "State Farm Stadium, Glendale, AZ"],
        ["Sun Oct 11", "San Francisco 49ers @ Seattle Seahawks", "4:25 PM", "FOX", "Lumen Field, Seattle, WA"],
        ["Sun Oct 11", "Baltimore Ravens @ Atlanta Falcons", "8:20 PM", "NBC / Peacock", "Mercedes-Benz Stadium, Atlanta, GA (SNF)"],
        ["Mon Oct 12", "Buffalo Bills @ Los Angeles Rams", "8:15 PM", "ESPN / ABC", "SoFi Stadium, Inglewood, CA (MNF)"],
    ]
)
doc.add_paragraph("Byes: Carolina Panthers, Kansas City Chiefs. Sunday Night Football is flex-eligible from Week 5 onward — confirm kickoff times Friday. Sources: NFL schedule releases via FB Schedules (revised Sept 29 flex notice), ESPN Week 5 fixtures, Sky Sports fixture list — cross-checked Oct 7.", style='Normal')

add_heading_styled("2  DraftKings Slate Map", 1)
doc.add_paragraph("DraftKings runs multiple overlapping slates each week. Pricing is largely consistent across slates — the player pool rotates in and out by window, salaries themselves rarely change between Main, Main+Late, and single-game Showdown (Showdown uses Captain pricing at 1.5× salary for 1.5× points). Garrett's note is correct: build one master salary board, then map pool eligibility per slate rather than re-pricing per slate.")
add_table(
    ["Slate", "Games included", "Roster", "Notes for this packet"],
    [
        ["Sunday Main (Classic)", "Sun 1:00 + 4:05/4:25 PM ET (typically 11–12 games; London inclusion varies)", "QB, RB, RB, WR, WR, WR, TE, FLEX, DST — $50,000 cap", "Primary GPP + cash focus. Full salary board in §3 maps to this pool."],
        ["Main + Late / Full Sunday", "Main + SNF (BAL @ ATL)", "Same Classic roster", "Adds Sunday night leverage; ownership disperses."],
        ["Sunday Late (4 PM only)", "DEN@LAC, DET@ARI, SF@SEA + CHI@GB if flex window applies", "Classic, smaller pool", "Late swap edge; pricing identical to Main."],
        ["Showdown — TNF (TB @ DAL)", "Single game", "Captain (1.5×) + 5 FLEX — $50,000 cap", "Captain salary = 1.5× base. See Showdown notes §3."],
        ["Showdown — SNF (BAL @ ATL)", "Single game", "Captain + 5 FLEX", "Jackson/Huntley news directly reprices this slate."],
        ["Showdown — MNF (BUF @ LAR)", "Single game", "Captain + 5 FLEX", "Monday hammer; also in Mon–Thu combined slates next week."],
        ["London / Early", "PHI vs JAX (+ early Sun)", "Varies", "Small-field; casual ownership higher. Verify lobby Thu."],
        ["Tiers / Pick'em variants", "Curated tiers", "No salary cap — tier selection", "Not salary-driven; excluded from board."],
    ]
)
note_box("LOBBY VERIFICATION PENDING (Thu morning): exact Main slate game count (11 vs 12), whether London is Main-inclusive on DraftKings this week, and Showdown Captain prices for TNF. This packet will be updated in place — do not build lineups off pool assumptions until the lobby CSV is pasted into §3.")

add_heading_styled("3  DraftKings Salary Board — Week 5", 1)
doc.add_paragraph("Master board below captures salaries verified from published Week 5 pricing coverage as of Wednesday Oct 7. The full DraftKings lobby CSV (every player, every position) is still to be pulled — Garrett directed a full DK salary lookup tonight. Until that CSV lands, treat blank cells as NOT YET PULLED, not as zero. Do not fill from memory.")
doc.add_paragraph("Scoring reminder (DraftKings Classic NFL): 1 pt / 10 rush or rec yards, 1 pt / 25 pass yards, 6 pts rush/rec TD, 4 pts pass TD, 1 pt per reception (full PPR), bonuses at 300 pass yards (+3) and 100 rush/rec yards (+3), −1 interception, −1 fumble lost. DST scoring per DK standard table. Showdown Captain earns 1.5× fantasy points at 1.5× salary.", style='Normal')

add_heading_styled("Quarterbacks — DraftKings (verified Wednesday)", 2)
add_table(
    ["Player", "Team", "Opp", "DK Salary", "FD Salary (ref)", "Availability note"],
    [
        ["Joe Burrow", "CIN", "@ MIA", "$6,900", "$8,700", "Healthy — top-priced QB on board per FantasyAlarm Week 5 QB pricing"],
        ["Brock Purdy", "SF", "@ SEA", "$6,500", "$8,300", "Healthy; divisional road spot"],
        ["Drake Maye", "NE", "vs LV", "$6,300", "$7,800", "Healthy"],
        ["Jayden Daniels", "WAS", "vs NYG", "$6,000", "$8,000", "Returning — left elbow dislocation; new brace; full week of practice planned per Dan Quinn (Mon)"],
        ["Bo Nix", "DEN", "@ LAC", "$5,600", "$7,600", "Healthy"],
        ["Jacoby Brissett", "ARI", "vs DET", "$5,500", "$6,800", "Starting for ARI; priced QB11 DK vs QB17 FD — largest DK/FD gap on QB board"],
        ["Lamar Jackson", "BAL", "@ ATL", "— PENDING LOBBY —", "—", "QUESTIONABLE — ankle sprain; see §4. If out, Tyler Huntley becomes minimum-price punt. Do not lock salary until DK updates."],
        ["Tyler Huntley", "BAL", "@ ATL", "— PENDING (min-price expected if starting) —", "—", "Would start if Jackson sits; completed 8/9 for 63 yds in relief Week 4"],
        ["All other QBs", "—", "—", "— PENDING FULL LOBBY CSV —", "—", "Pull Thu morning from DK contest lobby export"],
    ]
)
doc.add_paragraph("Source for QB prices above: FantasyAlarm NFL DFS Week 5 QB Picks 2026 (DraftKings & FanDuel pricing table, updated ~Oct 5–6). Cross-site gaps noted in that coverage: Brissett six spots cheaper on FanDuel relative rank; Nix cheaper path via DraftKings; Daniels cheaper on DraftKings. Full RB/WR/TE/DST pricing was not in that source and is NOT invented here — pending lobby pull.", style='Normal')

add_heading_styled("Running Backs / Wide Receivers / Tight Ends / DST", 2)
add_table(
    ["Position", "What is captured now", "What is pending", "Why it matters"],
    [
        ["RB", "Injury-driven pool changes only (see §4): Saquon Barkley status, Bigsby to IR, PHI backfield thinned", "Full salary list — every RB $3,000–$9,000+", "PHI backfield (Shipley/Pierce) becomes salary leverage if Barkley sits"],
        ["WR", "Zay Flowers limited (foot) — BAL; other WR injuries in §4", "Full salary list", "Flowers status moves BAL Showdown and Main pricing"],
        ["TE", "Mark Andrews full participant (hand) — BAL", "Full salary list", "Thin TE pool on DK typically; pricing pending"],
        ["DST", "Matchup list only (15 games)", "Full DST salaries ($2,000–$4,000 range typical)", "London game DST ownership often inflated — verify"],
    ]
)
note_box("TONIGHT'S ACTION (Garrett directive): pull the complete DraftKings salary file for Main, Main+Late, TNF Showdown, SNF Showdown, and MNF Showdown. Paste CSV into .src/ and update this section in place. Pricing stays constant across slates — one master table, pool flags per slate.")

add_heading_styled("Showdown Notes (Single-Game)", 2)
doc.add_paragraph("TNF — Buccaneers at Cowboys (Thu Oct 8, 8:15 PM ET, AT&T Stadium): Showdown Captain options and salaries pending lobby pull. Both offenses at full strength per Wednesday reports available at build time — update Thu with inactives 90 minutes before kickoff. SNF — Ravens at Falcons: entirely dependent on Jackson news — if Huntley starts, Captain ownership and salary efficiency flip. MNF — Bills at Rams (SoFi): Monday Showdown caps the week; also the Monday hammer for Main+Late combined-entry leverage. Captain salary = 1.5× base salary in all Showdown contests; FLEX slots accept any position including DST and K is not a DraftKings NFL position (no kickers on DK Classic/Showdown).")

add_heading_styled("4  Injury & Availability Tracker", 1)
doc.add_paragraph("Wednesday Oct 7 status. Practice designations: DNP = did not practice, LP = limited, FP = full. This is the highest-signal section for DFS — every name below moves a salary pool or a Showdown slate. Updated again Thu/Fri.")
add_table(
    ["Player", "Team", "Injury", "Wed status", "Week 5 outlook", "DFS impact"],
    [
        ["Lamar Jackson (QB)", "BAL", "Left ankle sprain (Week 4 vs TEN, left at halftime, walking boot)", "DNP Wed", "OUTSIDE CHANCE — Ian Rapoport: 'just an outside chance' for SNF @ ATL; could miss multiple weeks; no surgery, not long-term", "If out: Huntley starts. BAL@ATL Showdown reprices entirely. Jackson salary unusable until cleared."],
        ["Tyler Huntley (QB)", "BAL", "— (backup)", "—", "Would start if Jackson sits (5–6 career as BAL spot starter)", "Minimum-price QB punt in Showdown; Main slate punt if BAL included."],
        ["Zay Flowers (WR)", "BAL", "Foot (previously hamstring on report)", "LP Wed", "Monitor Thu/Fri", "If limited/out, Bateman/Moore target share shifts."],
        ["Kyle Hamilton (S)", "BAL", "Groin", "LP Wed", "Monitor", "Defensive impact only."],
        ["Marlon Humphrey (CB)", "BAL", "Hamstring / calf", "DNP Wed", "Monitor", "ATL passing matchup improves if out."],
        ["Trey Hendrickson (OLB)", "BAL*", "Finger", "DNP Wed (4th straight)", "Doubtful trend", "*Listed on BAL report per Ravens Wire Wed report."],
        ["Mark Andrews (TE)", "BAL", "Hand", "FP Wed", "On track", "Available TE option if Jackson/Huntley targets TE."],
        ["Ronnie Stanley (LT)", "BAL", "Rest / toe / ankle", "DNP Wed (rest)", "Expected OK", "Non-injury rest designation."],
        ["Saquon Barkley (RB)", "PHI", "Hamstring strain (left Week 4 game)", "Not expected to practice Wed; week-to-week per Eagles", "DOUBTFUL for London vs JAX — short-term absence possible", "If out: PHI backfield = Will Shipley + Dameon Pierce (activated from practice squad). Both become salary leverage."],
        ["Tank Bigsby (RB)", "PHI", "Abdomen", "Placed on Injured Reserve this week", "OUT — IR", "Removes PHI RB depth; confirms Shipley/Pierce as only healthy RBs on active roster if Barkley sits."],
        ["Jayden Daniels (QB)", "WAS", "Dislocated left elbow (non-throwing)", "Planned full week of practice; new brace", "EXPECTED TO START vs NYG per Dan Quinn (Mon)", "Priced $6,000 DK — brace does not affect throwing per team. WAS stack in play."],
        ["Caleb Williams (QB)", "CHI", "Hamstring", "Out — per NFL Week 5 schedule note", "OUT @ GB", "Tyson Bagent starts for Chicago at Green Bay (per FB Schedules Week 5 note). Bagent salary = punt tier — pull from lobby."],
        ["Braxton Berrios (WR)", "—", "Season-ending — surgery", "Out for season (per overnight X sweep Oct 6–7)", "OUT", "Removes depth WR from pool. Team confirmation pending in lobby scratch list."],
        ["Joe Mixon (RB)", "HOU", "Foot — described as 'troublesome'", "Status pending team report", "Monitor — @ TEN", "If limited/out, HOU backfield splits shift. Awaiting Wed HOU practice report paste."],
    ]
)
doc.add_paragraph("Additional Wednesday BAL report names (limited): Rashod Bateman (shoulder), Chris Moore (ankle), John Simpson (groin). Non-participants on rest: Calais Campbell. Durham Smythe (TE, designated to return from IR) DNP with Achilles. Andrew Vorhees (G) DNP foot. Sources: USA Today Week 5 injury report (Oct 7), Ravens Wire Wednesday practice report (Oct 7), Reuters/Field Level Media (Oct 5), FTW/Rapoport reporting (Oct 6). Every status above will be refreshed Thu and Fri — practice participation is the tell, not Monday coach quotes.", style='Normal')
note_box("UNVERIFIED AT BUILD TIME — do not treat as locked: Berrios team designation and Mixon Wednesday practice participation were captured from overnight sweeps and need team-report confirmation in the Thu update. They are flagged here so they are not lost, not as final inactive designations.")

add_heading_styled("5  SiriusXM Channel 87 — Mon–Wed Intake Log", 1)
doc.add_paragraph("Garrett directive: pull Monday, Tuesday, and Wednesday audio (Channel 87 on-demand replays), transcribe via faster-whisper, and capture CONTEXT — not just facts. How confident does the analyst sound? Who do they trust, who do they fear, where do they disagree and why? That situational layer is training data for the reasoning engine. Jeff Mans (also check his Spotify show nightly) and Jim Bowden are priority voices. Bowden covers football and baseball — baseball takes route to the MLB lane, not this packet.")
doc.add_paragraph("Status at Wednesday build: the nightly pull missed Oct 6 (inference outage). Manual browser pulls are running. The 11:50 PM Wednesday one-shot will capture late Wednesday shows that are not yet posted at build time. Entries below are the structured log — each show gets one row block when its transcript lands. No analyst claim is paraphrased into a projection here; claims are preserved with speaker and timestamp.")
add_table(
    ["Slot", "Show / Host (Ch 87)", "Replay date", "Transcript status", "Claims captured"],
    [
        ["MON — Show 1", "— to be filled from Mon replay index —", "Mon Oct 5", "PENDING PULL", "—"],
        ["MON — Show 2", "Jeff Mans block (priority)", "Mon Oct 5", "PENDING PULL", "—"],
        ["MON — Show 3", "Jim Bowden block (priority)", "Mon Oct 5", "PENDING PULL", "—"],
        ["TUE — Show 1", "— to be filled —", "Tue Oct 6", "PENDING PULL (nightly job missed)", "—"],
        ["TUE — Show 2", "Jeff Mans / Spotify cross-check", "Tue Oct 6", "PENDING PULL", "—"],
        ["WED — Day shows", "— to be filled —", "Wed Oct 7 (day)", "PULL IN PROGRESS", "—"],
        ["WED — Late shows", "Late Wed Ch 87 replays", "Wed Oct 7 (evening)", "11:50 PM ONE-SHOT SCHEDULED", "—"],
        ["SUN — Live listen", "Sunday 5 AM–12 PM CT live block (standing)", "Sun Oct 11", "SCHEDULED — Report #1 ~10 AM, #2 11:30 AM CT", "Game-time decisions only in Report #2"],
    ]
)
doc.add_paragraph("Capture template per show (copy for each transcript): Show name | Host(s) | Air date/time (CT) | Replay ID | Transcript file (.src/) | Speaker-by-speaker claims with timestamps | Injury mentions (exact wording) | DFS takes (player, slate, salary if mentioned) | Confidence signals (hedging, certainty, disagreement) | Cross-show consensus or conflict flag. Do not summarize away disagreement — record both sides.", style='Normal')

add_heading_styled("6  YouTube Hyper-Extensive Sweep — Tonight's Log", 1)
doc.add_paragraph("Garrett directive: hyper-extensive YouTube sweep tonight — not a handful, 15–20 videos. Two standing sweep windows exist (Wed 7:30 PM and Fri 7:30 PM CT, ~8 videos each) feeding Saturday; tonight is an accelerated Wednesday sweep ahead of the Friday podcast. Every video gets a full entry: channel, title, publish time, URL (from search result verbatim), duration, transcript status, and timestamped claims. Analyst consensus is built across videos, not from any single video.")
add_table(
    ["#", "Channel / Video", "Published", "Transcript", "Key claims (timestamped)"],
    [
        ["1–8", "Wed sweep Block A — Week 5 DFS main slate breakdowns", "Oct 6–7", "TONIGHT", "— pending sweep —"],
        ["9–14", "Wed sweep Block B — Showdown / TNF + SNF/MNF single-game", "Oct 6–7", "TONIGHT", "— pending sweep —"],
        ["15–20", "Wed sweep Block C — injury, weather, betting-line movement, college football bonus", "Oct 6–7", "TONIGHT", "— pending sweep —"],
        ["FRI", "Fri 7:30 PM CT sweep (~8 videos) — standing window", "Oct 9", "SCHEDULED", "Feeds Saturday aggregate"],
    ]
)
doc.add_paragraph("Rules for this log: (1) Record who said what — channel and analyst name on every claim. (2) Preserve salary mentions exactly as stated; if a video cites a salary that differs from the DK lobby, flag the conflict, do not silently overwrite. (3) Note flips — analysts who changed a take Mon→Wed. (4) Note consensus clusters (3+ independent channels on same player/game) and lone-wolf takes separately. (5) College football videos go in §7, not here.", style='Normal')

add_heading_styled("7  College Football Add-On (Podcast Option)", 1)
doc.add_paragraph("Garrett may include college football in the Friday podcast. This section is a holding lane — capture any college content that surfaces in tonight's YouTube sweep or SiriusXM Bowden/baseball crossover that touches college, but do not build a college DFS board unless Garrett directs it. If college is added, it needs its own slate map (DraftKings college slates run Saturday, different roster and pricing) — do not commingle with the NFL salary board in §3.")

add_heading_styled("8  Venues, Weather & Situational Notes (Information Only)", 1)
add_table(
    ["Game", "Venue type", "Situational note (fact, not projection)"],
    [
        ["PHI vs JAX — London", "Outdoor (Tottenham)", "9:30 AM ET kick — travel + body-clock factor for both teams; JAX designated home team, frequent London participant"],
        ["MIN @ NO", "Dome (Superdome)", "Weather-neutral"],
        ["DEN @ LAC / BUF @ LAR", "SoFi Stadium", "Covered stadium environment"],
        ["DET @ ARI", "State Farm Stadium (retractable)", "Roof status game-day decision — capture Fri"],
        ["CHI @ GB", "Lambeau Field, outdoor", "Early-October Green Bay — forecast pending Fri; flexed to 1 PM ET"],
        ["SF @ SEA", "Lumen Field, outdoor", "Crowd noise factor noted for reasoning layer — capture analyst comments, do not quantify here"],
        ["BAL @ ATL", "Mercedes-Benz Stadium", "SNF — Jackson availability dominates all other factors in this game"],
    ]
)
doc.add_paragraph("Hourly wind, precipitation, and temperature forecasts per outdoor venue will be pasted here Friday morning from the weather pull. No weather-based player adjustments in this phase.", style='Normal')

add_heading_styled("9  What Is NOT in This Packet Yet (By Design)", 1)
doc.add_paragraph("Per Garrett's Wednesday directive — information first, metrics after: no projections, no expected points, no ownership percentages, no lineup builds, no stack rankings, no value ratings, no engine scores. Those layers run only after the corpus in §§3–6 is complete and locked. Anything that looks like a recommendation in analyst claims is recorded as a CLAIM with attribution, not adopted as a GSE position. The podcast Garrett is building for Friday (possible Saturday hold) will draw on the completed corpus — this packet is the source document, not the podcast script.")

add_heading_styled("10  Engine Handoff Checklist", 1)
add_table(
    ["Check", "Done when"],
    [
        ["Full DK lobby CSV pasted (§3)", "Every Main-slate player has a salary; Showdown Captain prices listed for TNF/SNF/MNF"],
        ["SiriusXM Mon–Wed transcripts filed (§5)", "Each show has .src/ transcript + timestamped claim block; 11:50 PM Wed pull merged"],
        ["YouTube sweep complete (§6)", "15–20 videos entered with URLs, channels, timestamped claims; consensus clusters flagged"],
        ["Injury tracker refreshed", "Thu + Fri practice reports pasted; Fri inactive designations for TNF resolved"],
        ["Weather forecasts pasted (§8)", "Outdoor venues have Fri hourly forecast"],
        ["THEN: engine/metrics pass", "Garrett gives the word — projections, CPOE/pressure/receiver bundles, calibration layer run against this corpus"],
    ]
)

add_heading_styled("Sources & Provenance", 1)
doc.add_paragraph("Schedule & flex: FB Schedules NFL 2026 Week 5 revision (Sept 29 flex notice — Bears @ Packers moved to 1 PM ET); ESPN Week 5 fixtures; Sky Sports 2026 fixture list; NFL Playoff Pass Week 5 schedule — all retrieved Oct 7, 2026. QB DraftKings/FanDuel pricing: FantasyAlarm NFL DFS Week 5 QB Picks 2026 pricing table (FantasyAlarm, updated Oct 5–6). Injuries: USA Today Week 5 fantasy injury report (Oct 7, 2026); Ravens Wire Wednesday practice report (Oct 7, 2026); Reuters / Field Level Media Ravens update (Oct 5, 2026); FTW / Ian Rapoport reporting (Oct 6, 2026). SiriusXM and YouTube sections are intake logs — claims will carry per-show and per-video citations as transcripts land. No analyst claim in §§5–6 has been adopted as a GSE projection.", style='Normal')

# Footer note
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("— End of Wednesday build — Update in place Thu/Fri; do not start a second packet file —")
r.font.size = Pt(8)
r.italic = True
r.font.color.rgb = GRAY

# Core properties
core = doc.core_properties
core.title = "Week 5 DFS Packet 2026 — Galaxy Sports Edge"
core.subject = "NFL Week 5 2026 DraftKings DFS information corpus (Phase 1, no metrics)"

doc.save(str(OUT))
print(f"Saved to {OUT}")
