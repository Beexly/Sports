#!/usr/bin/env python3
import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml

OUT = os.path.expanduser("~/workspace/your_files/week-5-dfs-packet-2026/Week 5 DFS Packet 2026.docx")
doc = Document()
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(9.5)
style.paragraph_format.space_after = Pt(4)
style.paragraph_format.space_before = Pt(0)
for i in range(1, 4):
    h = doc.styles[f'Heading {i}']
    h.font.color.rgb = RGBColor(0x0B, 0x1F, 0x4A)
    h.font.name = 'Calibri'

def shade_cell(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hexcolor}"/>')
    tcPr.append(shd)
    for p in cell.paragraphs:
        p.paragraph_format.space_after = Pt(1)
        p.paragraph_format.space_before = Pt(0)

def set_cell(cell, text, bold=False, color=None, size=8.5):
    cell.text = ""
    p = cell.paragraphs[0]
    r = p.add_run(text)
    r.bold = bold
    r.font.size = Pt(size)
    r.font.name = 'Calibri'
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    return p

def add_table(headers, rows, widths=None, header_fill="0B1F4A"):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0].cells
    for j, h in enumerate(headers):
        set_cell(hdr[j], h, bold=True, color="FFFFFF", size=8)
        shade_cell(hdr[j], header_fill)
    for row in rows:
        cells = table.add_row().cells
        for j, val in enumerate(row):
            set_cell(cells[j], val, size=8)
    if widths:
        for j, w in enumerate(widths):
            for cell in table.columns[j].cells:
                cell.width = Inches(w)
    doc.add_paragraph("", style='Normal').paragraph_format.space_after = Pt(2)
    return table

def h1(text):
    p = doc.add_heading(text, 1)
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    return p

def h2(text):
    p = doc.add_heading(text, 2)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(3)
    return p

def para(text, bold_prefix=None):
    p = doc.add_paragraph()
    if bold_prefix:
        r = p.add_run(bold_prefix)
        r.bold = True
        r.font.size = Pt(9)
    r = p.add_run(text)
    r.font.size = Pt(9)
    return p

def bullet(text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    if bold_prefix:
        r = p.add_run(bold_prefix)
        r.bold = True
        r.font.size = Pt(9)
    r = p.add_run(text)
    r.font.size = Pt(9)
    return p

p = doc.add_paragraph()
r = p.add_run("GALAXY SPORTS EDGE")
r.bold = True; r.font.size = Pt(8); r.font.color.rgb = RGBColor(0x0B,0x1F,0x4A)
p = doc.add_paragraph()
r = p.add_run("Week 5 DFS Packet")
r.bold = True; r.font.size = Pt(22)
p = doc.add_paragraph()
r = p.add_run("2026 NFL Season  \u2022  October 8\u201312, 2026  \u2022  Information Corpus \u2014 Phase 1"); r.font.size = Pt(10); r.font.color.rgb = RGBColor(0x44,0x44,0x44)
p = doc.add_paragraph()
r = p.add_run("Updated Wednesday Oct 7, 2026 \u2014 8:30 PM CDT (tonight\u2019s full pull). No projections, no metrics, no ownership, no picks of our own. Everything attributed; \u201cnot verified\u201d where a number could not be sourced. Appendices still open: late-Wed SiriusXM (11:50 PM pull), Friday weather re-check, Thu/Fri practice."); r.font.size = Pt(8.5); r.italic = True

add_table(["Item","Status as of Wed Oct 7 evening","Next action"],[
["SiriusXM Ch 87 \u2014 Mans Oct 5/6/7, Bowden Oct 5/6/7","FULLY EXTRACTED via player Transcript panel (audio download infeasible \u2014 authenticated HLS). All six shows mined; see \u00a75.","Late-Wed shows pull at 11:50 PM CT tonight"],
["YouTube \u2014 morning sweep (7) + PM hyper-sweep (9 NFL + 6 CFB)","COMPLETE \u2014 consensus built; see \u00a76 and \u00a77","Fri re-sweep if Garrett wants fresh video"],
["DraftKings salaries (all slates)","COMPLETE \u2014 Main board 306 players + Thu-Mon/Sun-Mon/Showdown; KEY FINDING: identical pricing across classic slates","Re-verify in DK lobby Thu morning before lock"],
["Lines + weather (all 15 games)","COMPLETE Wed Oct 7 ~7:35 PM CT","Friday weather re-check; Sunday morning update"],
["Beat writers (all 30 teams)","COMPLETE Wed Oct 7 \u2014 every team\u2019s Wed report","Thu/Fri practice updates"],
["College Football Week 6","COMPLETE \u2014 7 biggest games, Heisman, injuries","Friday podcast use"],
], widths=[2.0,3.2,1.8])

para("How to use this packet: \u00a71\u20132 are locked facts for the podcast and lineup shop. \u00a73 is the salary board to build from. \u00a74 hands you every line move and weather flag. \u00a75\u20136 are other people\u2019s takes with their reasoning attached \u2014 use them as inputs, not verdicts. \u00a77 is the CFB pod lane. \u00a78 is every prop cited with its line and source. Nothing in here is a GSE pick.")

h1("1  Week 5 Highlights \u2014 The 12 Items That Move the Slate")
highlight_rows = [
["1","Mayfield OUT (thumb) \u2014 rookie Jalon Daniels starts TNF @ DAL","Bowles ruled Mayfield out (2nd straight miss). Daniels made his 2nd career start Thu night; Bucs shifted to spread/3-WR sets (SGPN). DAL \u22128.5 after bet-down from \u221210. Mike Evans also out for TB.","Beat writers (Bucs Wire 10/7); lines file; SGPN"],
["2","Lamar Jackson likely OUT \u2014 Tyler Huntley expected to start SNF @ ATL","Jackson DNP Wed (ankle, walking boot). Rapoport: \u2018outside chance\u2019 only. Huntley backed up Wed; Mark Andrews: \u2018a lot of trust in Snoop.\u2019","Beat writers; Rapoport via SI; RavensWire"],
["3","SNF flipped 9+ points on Lamar news","Opened Ravens \u22126 (lookahead); current Falcons \u22123.5 across 9 books. Total dropped 46.5 \u2192 43.5.","Lines/weather file (VegasInsider)"],
["4","Barkley unlikely for London; Eagles backfield down to Shipley + Pierce","Barkley (hamstring) DNP, week-to-week. Tank Bigsby to IR. Only healthy RBs: Will Shipley and Dameon Pierce (practice-squad activation).","Beat writers (USA Today, Eagles Wire 10/7)"],
["5","Lane Johnson RETIRED + Cam Jurgens traded to Baltimore","Johnson retired effective immediately (Schefter). Jurgens to Ravens for 2027 5th + 2028 2nd. Eagles also traded A.J. Brown earlier for a 2028 1st \u2014 now hold two 1sts + two 2nds in 2028. Roseman reboot.","Beat writers; Bowden Oct 7 show"],
["6","Caleb Williams OUT (Grade 2 hamstring) \u2014 Tyson Bagent starts @ GB","Third straight missed game; week-to-week. Bears 2\u20130 without him. Game FLEXED to 1 PM ET Sun (was 4:25).","Beat writers (PFT, PackersWire); lines file"],
["7","London books cannot agree \u2014 PHI vs JAX spread chaos","DK \u22124.5 (JAX), FanDuel \u22127, BetMGM \u22121.5. Totals 41.5\u201344.5. Injury-driven market; none averaged here.","Lines/weather file"],
["8","Rain games: NYG\u2013WSH worst of week; also CLE\u2013NYJ, IND\u2013PIT, HOU\u2013TEN","Landover 78\u2013100% rain (0.60\u20131.17\u2033). MetLife 80% (0.33\u2033). Pittsburgh 90% (0.44\u2033). Nashville 60% (0.07\u2033).","Lines/weather file (weather.com, Oct 7)"],
["9","Ja\u2019Marr Chase in concussion protocol; Tee Higgins DNP","Chase DNP Wed (\u2018day to day\u2019). Higgins DNP \u2014 adductor + new neck listing. Bengals Week 6 bye may keep both out. Healthy Cincy WRs: Dohnte Meyers, Mitch Tinsley, Ke\u2019Shawn Williams.","Beat writers (Enquirer, BengalsWire 10/7)"],
["10","Jacoby Brissett is the consensus cheap-QB crush ($5,500)","4 YouTube sources + Mans + Bowden: DET forces pass volume; pairs with M. Wilson ($6,200) or McBride ($6,700).","YouTube PM sweep; DK salaries"],
["11","MIXON CORRECTION: Joe Mixon did NOT sign with Seattle","Released by Houston March 2026. Seahawks declined to sign Oct 6 after failed physical. He is a free agent. Oct 5 reports of a signing were wrong.","Beat writers (Texans Wire, ProFootballNetwork 10/6); Mans Oct 6"],
["12","Jayden Daniels back (brace) vs NYG; Mariota out","Daniels full Wed practice, first since Week 2 elbow dislocation. HC Quinn: goal is full week + start Sunday. Mariota (MCL) doubtful.","Beat writers (Commanders Wire, Reuters 10/7)"],
]
add_table(["#","Item","What you need to know","Source"], highlight_rows, widths=[0.3,1.9,3.4,1.4])

h1("2  Injury Tracker \u2014 Every Material Week 5 Injury")
para("Wednesday Oct 7 status unless noted. DNP = did not practice, LP = limited, FP = full. Sources: beat-writer sweep (all 30 teams, Oct 7), team wires, national reporters. Items that reprice a slate are flagged in the impact column.")
injury_rows = [
["Lamar Jackson (QB)","BAL","Ankle (W4 vs TEN; left in boot)","DNP Wed","Likely OUT SNF; Huntley starts","SNF Showdown reprices entirely"],
["Tyler Huntley (QB)","BAL","\u2014 (backup)","\u2014","Would start if Jackson sits","Minimum-price Showdown punt"],
["Zay Flowers (WR)","BAL","Foot (new)","LP Wed","Monitor Thu/Fri","Target share shifts to Bateman/Moore if out"],
["Mark Andrews (TE)","BAL","Hand","FP Wed","Playing","BAL TE1 confirmed"],
["Baker Mayfield (QB)","TB","Thumb","OUT (Bowles)","OUT TNF \u2014 2nd straight miss","Rookie Jalon Daniels starts"],
["Jalon Daniels (QB)","TB","\u2014 (rookie UDFA)","\u2014","2nd career start @ DAL TNF","TNF Showdown pivot"],
["Mike Evans (WR)","TB","\u2014","OUT TNF","Out Thu night","Godwin/Egbuka/Otton bump (SGPN)"],
["Antoine Winfield Jr. (S)","TB","Rib","OUT","Out TNF","DAL pass-catchers up"],
["Benjamin Morrison (CB)","TB","Quad","OUT","Out TNF","DAL WRs up"],
["Saquon Barkley (RB)","PHI","Hamstring","DNP Wed","Unlikely London; week-to-week; possibly IR","Shipley/Pierce only healthy RBs"],
["Tank Bigsby (RB)","PHI","Abdomen","IR","Out","PHI backfield 2-man"],
["DeVonta Smith (WR)","PHI","Hamstring","DNP Wed","\u2018Wrong side of questionable\u2019 for London","PHI pass game thin"],
["Dallas Goedert (TE)","PHI","Knee (MCL W2)","Back at practice","On track London","PHI TE1 return"],
["Zack Baun (LB)","PHI","Concussion","Back at practice","On track","PHI D help"],
["Lane Johnson (RT)","PHI","Retired","\u2014","Retired effective immediately","PHI OL downgrade; rookie Markel Bell projects RT"],
["Cam Jurgens (C)","PHI\u2192BAL","Traded (concussion protocol)","\u2014","To Ravens; out 1+ week","PHI OL + BAL OL shuffle"],
["Caleb Williams (QB)","CHI","Grade 2 hamstring (W2)","DNP Wed","OUT @ GB \u2014 3rd straight; Bagent starts","Bears QB punt spot"],
["D\u2019Andre Swift (RB)","CHI","Hip (new)/knee","DNP Wed","Monitor; \u2018he will always play\u2019 (Mans)","If out: Monangai path"],
["Kyle Monangai (RB)","CHI","Thumb/toe","DNP Wed","Expected to play (Johnson)","CHI RB split watch"],
["Ja\u2019Marr Chase (WR)","CIN","Concussion protocol","DNP Wed","\u2018Day to day\u2019; ~30% per Action Network","If out: Meyers/Tinsley + Gesicki spike"],
["Tee Higgins (WR)","CIN","Adductor + neck (new)","DNP Wed","Unknown; W6 bye looming","CIN WR room thin"],
["Jayden Daniels (QB)","WSH","Dislocated left elbow (non-throwing)","FP Wed","Expected to start vs NYG (brace)","WSH offense restores"],
["Marcus Mariota (QB)","WSH","MCL sprain","DNP","Doubtful; 2\u20133 wks possible","Daniels is the guy"],
["Terry McLaurin (WR)","WSH","Hamstring","DNP Wed","Out track","WSH WR1 down"],
["Stefon Diggs (WR)","WSH","Hamstring (new)","DNP Wed","Sidelined","Top 2 WSH WRs out"],
["Jaylin Lane (WR)","WSH","\u2014","\u2014","Lost for season (W4)","WSH WR3 gone"],
["Justin Jefferson (WR)","MIN","Ankle","LP Wed (return)","\u2018Plan is to play\u2019 vs NO","If back: hurts Hockenson (Mans)"],
["Jordan Addison (WR)","MIN","Hamstring","DNP Wed","Minor per O\u2019Connell; monitor","Jefferson target share up if out"],
["Christian Darrisaw (LT)","MIN","Concussion","DNP Wed","Doubtful track","MIN OL down"],
["Breece Hall (RB)","NYJ","Quad (W3)","DNP Wed","Week-to-week; unlikely W5","Braelon Allen lead back"],
["Ladd McConkey (WR)","LAC","Foot (re-aggravated W4)","DNP Wed","Day-to-day per Harbaugh; official DNP","Tre Harris $4.1K relief if out"],
["Joe Alt (RT)","LAC","Neck","DNP Wed","Not expected Sun (Rapoport)","LAC OL crisis"],
["Rashawn Slater (LT)","LAC","Ankle","DNP Wed","Out track","Both tackles down"],
["Derwin James (S)","LAC","Hamstring","DNP Wed","Monitor","DEN offense up if out"],
["Patrick Surtain II (CB)","DEN","Ankle (non-contact W4)","DNP Wed","Week-to-week; possible IR Sat","LAC WRs up if out"],
["Riley Moss (CB)","DEN","Ribs","DNP Wed","Monitor","Both DEN CBs down"],
["Pat Bryant (WR)","DEN","Ankle (carted W4)","DNP Wed","Few weeks (Schefter)","DEN WR thin"],
["Alvin Kamara (RB)","NO","Back (new) + knee","DNP (walkthrough est.)","Monitor; \u2018how many more games, six?\u2019 (Mans)","Kendre Miller up if out"],
["Tank Dell (WR)","HOU","Knee (Dec 2024)","LP Wed (21-day window opened)","First team drills since injury; Sun TBD","HOU WR watch"],
["Will Anderson Jr. (DE)","HOU","Ankle (new)","DNP Wed","Week 5 in jeopardy","TEN offense up if out"],
["Malik Nabers (WR)","NYG","Knee (sore; same knee as \u201925 ACL)","DNP Wed","\u2018We\u2019ll see\u2019 for Sun","If out: Wan\u2019Dale/Slayton up"],
["Cam Skattebo (RB)","NYG","Shoulder (new)","LP (red jersey)","Trending toward playing","NYG RB1 watch"],
["Rico Dowdle (RB)","PIT","Toe","LP Wed","Back after 2 missed; may share w/ Warren","Warren $6.7K clarity Thu/Fri"],
["Michael Pittman Jr. (WR)","PIT","Plantar fasciitis (scooter Wed)","LP Wed","Ugly visual; 2 catches last 2 games","PIT WR fade (Mans out)"],
["Zach Charbonnet (RB)","SEA","Knee (ACL return)","LP Wed","Ruled OUT W5; W6 possible","E. Wilson one-week window stays open"],
["Leonard Williams (DT)","SEA","Ankle","LP Wed","Optimistic (Macdonald)","SEA D anchor watch"],
["Brock Bowers (TE)","LV","Knee","LP Wed","Playing through","LV TE1 at $7.0K (Q tag)"],
["Jalen Nailor (WR)","LV","Concussion protocol","DNP Wed","In protocol","LV WR thin"],
["DJ Moore (WR)","BUF","Shoulder (re-aggravated W4)","No Wed report (MNF team)","\u2018Not long-term\u2019 (Schefter); doubtful W4 exit","Coleman top-24 if Moore out (Mayo)"],
["Ed Oliver (DT)","BUF","Knee (W4)","No Wed report","Status unclear; limped off","LAR run game watch Mon"],
["Aaron Donald (DE)","LAR","Back (missed W4)","No Wed report (Mon presser)","\u2018Trending\u2019 to play Mon (McVay)","BUF OL watch"],
["Puka Nacua (WR)","LAR","Groin","Returned W4","Track Thu/Fri","LAR WR1"],
["Rashee Rice (WR)","KC","Hamstring","\u2014 (bye week)","Out several weeks","KC on bye; ROS note"],
["Joe Mixon (RB)","FA","Foot (2025 injury)","\u2014","FREE AGENT \u2014 failed SEA physical Oct 6","Correction item; do not roster"],
]
h2("Consolidated Injury Table (Wed Oct 7)")
add_table(["Player","Team","Injury","Wed","Week 5 outlook","DFS impact"], injury_rows, widths=[1.3,0.6,1.4,0.9,1.5,1.3])
para("Headline reads (attributed): Lamar \u2014 Rapoport \u2018outside chance,\u2019 boot, likely multi-week (Schefter verbal vs Rapoport written disagreement noted on Bowden Oct 6). Chase WR \u2014 Action Network ~30% to play; concussions rarely clear in a week (Bowden). Barkley \u2014 Mans questioned return before Weeks 8\u201310; Bowden/Bender: PHI may let soft-tissue injuries \u2018take their time\u2019 if season is lost. Jefferson \u2014 Mans: good chance back vs NO. Daniels (Jayden) \u2014 Flowers confidence 4.5/10 even though he\u2019s starting him.", bold_prefix="What moves price: ")

h1("3  DraftKings Salary Board \u2014 Identical Pricing Across Classic Slates")
para("KEY FINDING (confirms Garrett\u2019s hypothesis): all classic slates \u2014 Main, Early Only, Thu-Mon, Sun-Mon \u2014 use IDENTICAL salaries for overlapping players. Verified across every QB/RB/WR/TE/DST, zero differences. Larger slates just add players from extra games. Showdown slates use different (higher) single-game pricing with a Captain 1.5\u00d7 slot.")
bullet("Main: 11 games (Sun except London + SNF), locks Sun 1 PM ET, 306 players.", bold_prefix="Main slate \u2014 ")
bullet("Early Only: 8 games (1 PM ET window), 222 players.", bold_prefix="Early Only \u2014 ")
bullet("Thu-Mon: 15 games, locks Thu 8:15 PM ET, 411 players.", bold_prefix="Thu-Mon \u2014 ")
bullet("Sun-Mon: 13 games, 349 players.", bold_prefix="Sun-Mon \u2014 ")
bullet("Showdowns (CPT/Flex, $50K cap): TNF and London confirmed; SNF/MNF standard. Eight 1 PM Sunday games also have Showdowns (not extracted).", bold_prefix="Showdowns \u2014 ")
bullet("Late Only (3-game Sun afternoon): standard DK offering, not on source.", bold_prefix="Late Only \u2014 ")
para("Source: FantasySportsEdge published DK salaries (DK lobby requires login; FSE states prices match DK). Projections stamped \u2018updated October 7, 2026 at 3:42 PM EDT.\u2019 Cross-checked builder vs projections \u2014 samples agree. CAUTION: salaries moved intraday Wed (earlier: CMC $9,600 / Bijan $8,900; current: CMC $8,200 / Bijan $8,700). Re-verify in the DK lobby Thu morning before lock.", bold_prefix="Provenance + caution: ")

h2("Quarterbacks \u2014 Top of Board (Main slate)")
add_table(["QB","Salary","QB","Salary","QB","Salary"],[
["Joe Burrow (CIN)","$6,900","Jared Goff (DET)","$6,600","Brock Purdy (SF)","$6,500"],
["Drake Maye (NE)","$6,300","Caleb Williams (CHI) \u2014 O","$6,200","Tyler Shough (NO)","$6,100"],
["Jayden Daniels (WSH)","$6,000","C.J. Stroud (HOU)","$5,900","Sam Darnold (SEA)","$5,800"],
["Jordan Love (GB)","$5,700","Bo Nix (DEN)","$5,600","Jacoby Brissett (ARI)","$5,500"],
["Kirk Cousins (LV)","$5,400","Aaron Rodgers (PIT)","$5,300","Kyler Murray (ARI)","$5,200"],
["Justin Herbert (LAC)","$5,100","Deshaun Watson (CLE)","$5,100","Geno Smith (NYJ)","$5,000"],
["Daniel Jones (IND)","$5,000","Cam Ward (TEN)","$4,900","Jameis Winston (NYG)","$4,800"],
["Tyson Bagent (CHI)","$4,700","Malik Willis (GB)","$4,600","",""],
], widths=[1.4,0.8,1.4,0.8,1.4,0.8])

h2("Running Backs \u2014 Top of Board")
para("Gibbs $9,800 is the slate ceiling. Chase Brown $6,900 is the YouTube-consensus chalk RB1 (see \u00a76). Warren $6,700 is Dowdle-conditional. Full 81-RB board captured in source file; top tier below.")
add_table(["RB","Salary","Note"],[
["Jahmyr Gibbs (DET)","$9,800","Slate max; YouTube split \u2014 \u2018must-play\u2019 (Swolecast) vs \u2018too expensive\u2019 (Kunath/Stokastic)"],
["Christian McCaffrey (SF)","$8,200","Down from $9,600 intraday Wed; Stokastic fading, FSL contrarian"],
["Ashton Jeanty (LV)","$7,200","20+ touches weekly; efficiency worst-in-league so far (FSL)"],
["Chase Brown (CIN)","$6,900","Consensus RB1 of week vs MIA (32nd vs RB) \u2014 \u00a76"],
["Jaylen Warren (PIT)","$6,700","Jam if Dowdle out; 1A/1B if Dowdle plays"],
["Aaron Jones (MIN)","$6,500","23\u201328 opps, 72% snaps, 24% target share (3-source consensus)"],
["D\u2019Andre Swift (CHI) \u2014 Q","$6,200","Steal if Monangai sits; pivot if Monangai plays"],
["Jeremiyah Love (ARI) \u2014 Q","$6,100","\u2018Thousand-times-yes\u2019 vs PHI (Mans); soft vs DET per YouTube"],
["Cam Skattebo (NYG) \u2014 Q","$6,000","Shoulder; trending to play"],
["Omarion Hampton (LAC)","$6,000","TD 5 of 6; Vidal matching snaps \u2014 3-man concern (Mans)"],
["Quinshon Judkins (CLE)","$5,700","20\u201322 touches projected vs NYJ (25th DVOA run D)"],
["Emanuel Wilson (GB/SEA role)","$5,300","Volume vs SF; Charbonnet return caps it"],
["RJ Harvey (DEN)","$5,200","\u2018Real, real steal\u2019 \u2014 10 tgt/10 rec last week (Kunath/925)"],
], widths=[2.0,0.9,3.5])

h2("Wide Receivers \u2014 Top of Board")
add_table(["WR","Salary","Note"],[
["Jaxon Smith-Njigba (SEA)","$8,800","Slate WR max; rest-day DNP Wed only"],
["Ja\u2019Marr Chase (CIN) \u2014 Q","$8,100","Concussion protocol; if out, Meyers/Tinsley/Gesicki spike"],
["Amon-Ra St. Brown (DET)","$7,900","\u2018$8,500 receiver\u2019 at $7,900; ASB-over-Gibbs GPP pivot (\u00a76)"],
["Chris Olave (NO)","$7,700","22+ pts 3 straight; Shough stack piece"],
["Nico Collins (HOU)","$7,500","\u2018Touchdown monster\u2019 7/118/2 last week; 10+ tgt vs TEN"],
["Justin Jefferson (MIN) \u2014 Q","$7,300","Pay-up if back vs NO"],
["Tee Higgins (CIN) \u2014 Q","$7,100","16 tgt/11 rec last week; elite if Chase sits"],
["Michael Wilson (ARI)","$6,200","Chalkiest WR on slate: 30 tgt/2 wks, 37% share vs DET"],
["Jameson Williams (DET)","$5,900","GPP leverage Lion off ASB chalk (~12%, may go 18%+)"],
["Luther Burden (CHI)","$4,900","\u2018Obvious pricing mistake\u2019 7 tgt, 6/94 last week"],
["KC Concepcion","$4,200","8 tgt/5 rec; manufactured touches"],
["Tre Harris (LAC)","$4,100","Relief if McConkey out; \u2018WR1 by default\u2019 (Mans)"],
["Roman Wilson (PIT)","$3,700","Tied team TD lead; 1st in 20+ yd plays (Kunath flagship value)"],
], widths=[2.0,0.9,3.5])

h2("Tight Ends \u2014 Top of Board")
add_table(["TE","Salary","Note"],[
["Brock Bowers (LV) \u2014 Q","$7,000","Elite; skinny-stack w/ Cousins (FSL); Stokastic prefers McBride spot"],
["Trey McBride (ARI)","$6,700","Double-digit tgt all 4 games; pay-up consensus"],
["George Kittle (SF)","$5,200","Purdy+Kittle core build (Swolecast); ownership \u2018ginormous\u2019"],
["T.J. Hockenson (MIN)","$4,800","13/13/119 last week; \u2018Kyler\u2019s new McBride\u2019 (FSL)"],
["Colston Loveland (CHI)","$4,600","29% share W4, led CHI in tgt (Stokastic buy-low)"],
["Juwan Johnson (NO)","$4,500","82% routes w/o Fant; 45-attempt offense"],
["Isaiah Likely (NYG)","$4,300","CONSENSUS TE: 41% share (12 tgt), 88% routes, 99 air yds"],
["Mike Gesicki (CIN)","$4,100","\u2018Freaking jam\u2019 if Chase out; revenge vs MIA (worst vs TE)"],
["Michael Mayer (LV)","$3,500","10 tgt last week; offense TE-reliant"],
], widths=[2.0,0.9,3.5])

h2("Thu-Mon Adds (not on Main)")
para("TNF: Dak Prescott $6,700, Jalon Daniels $4,700, CeeDee Lamb $8,300, Javonte Williams $7,300. London: Jalen Hurts $6,400, Trevor Lawrence $5,900, DeVonta Smith (Q) $6,900, Parker Washington $6,200. SNF: Lamar Jackson (Q) $6,800, Bijan Robinson $8,700, Derrick Henry $8,000, Zay Flowers (Q) $7,000, Drake London $6,700. MNF: Josh Allen $7,400, Matthew Stafford $6,000, James Cook $7,100, Kyren Williams $6,400, Puka Nacua $7,800, Davante Adams $6,800.")
h2("Showdown Pricing (FLEX; Captain = 1.5\u00d7)")
para("TNF \u2014 Lamb $11,800, Dak $10,400, Javonte $10,800, Pickens $9,400, J. Daniels $8,600. London \u2014 Hurts $10,800, Lawrence $10,000, D. Smith (Q) $9,800, P. Washington $9,200, Bhayshul Tuten $8,800, Will Shipley $8,000.")
para("Board completeness: Main slate 306 players captured (81 RB, 109 WR, 71 TE, 22 DST in source). The values above are the decision tier; the full CSV-equivalent lives in the salary source file. DST value tier per YouTube: Raiders $2,500 vs NE, Browns cheap vs NYJ, Dolphins cheapest if Chase out, Vikings $3,100 popular, Giants $2,600 if Daniels sits, Jets $2,700 vs CLE.")

h1("4  Lines & Weather \u2014 All 15 Games (Wed Oct 7 Snapshot)")
para("Lines are Wed Oct 7 snapshots (DraftKings / FanDuel / BetMGM unless noted) and will move with Thu/Fri injury news. Weather is weather.com game-day forecast pulled Oct 7. Byes: Carolina Panthers, Kansas City Chiefs. Sources per row: lines/weather file; book names cited there.")
lines_rows = [
["Thu 10/8 8:15 PM ET","TB @ DAL (Prime Video, AT&T Stadium, roof)","DAL \u22128.5 (DK/FD); bet365 \u22129.5. Opener \u221210 \u2192 \u22128.5 on Mayfield out.","47.5 (steady)","Arlington clear 78\u00b0F, wind NE 5, 0% rain. Dome \u2014 no flag."],
["Sun 10/11 9:30 AM ET (London)","PHI vs JAX (Tottenham, open-air)","CHAOS: DK \u22124.5 JAX, FD \u22127, BetMGM \u22121.5. None averaged.","DK 43.5 / FD 41.5 / MGM 44.5","London ~60\u00b0F, wind W 9, 10% rain. No flag."],
["Sun 10/11 1:00 PM ET","CIN @ MIA (FOX, Hard Rock, open)","CIN \u22126.5 (DK/FD), \u22127 (MGM). Opener \u22125.5 \u2192 toward CIN.","42.5 all books (opened 49.5, down hard)","~89\u00b0F, wind SE 11, rain 20%. No flag."],
["Sun 10/11 1:00 PM ET","CLE @ NYJ (CBS, MetLife, open)","NYJ \u22121.5 (DK/FD), \u22122 (MGM)","39.5\u201340.5","60\u201364\u00b0F, wind ESE 10, RAIN 80% (0.33\u2033). \u26a0\ufe0f HEAVY RAIN"],
["Sun 10/11 1:00 PM ET","HOU @ TEN (CBS, Nissan, open)","HOU \u22127.5 all books. Opener \u22123.5 \u2192 \u22127.5 (biggest move).","37.5 all (opened 43.5)","65\u201370\u00b0F, wind SW 11, rain 60% (0.07\u2033). \u26a0\ufe0f RAIN LIKELY"],
["Sun 10/11 1:00 PM ET","IND @ PIT (CBS, Acrisure, open)","PIT \u22122.5 all books \u2014 steadiest line of week.","44.5 all (opened 47.5)","62\u201365\u00b0F, wind ESE 9, RAIN 90% (0.44\u2033). \u26a0\ufe0f HEAVY RAIN"],
["Sun 10/11 1:00 PM ET","LV @ NE (CBS, Gillette, open)","NE \u22123.5 all. Opener \u22128.5 \u2192 \u22123.5 (5-pt move to LV).","44.5\u201345.5","62\u201365\u00b0F, wind SSW 9, rain 40% (0.04\u2033). Watch only."],
["Sun 10/11 1:00 PM ET","MIN @ NO (FOX, Superdome, dome)","MIN \u22121.5 (DK/FD), \u22122 (MGM)","42\u201342.5 (opened 44.5)","Indoor \u2014 no flag."],
["Sun 10/11 1:00 PM ET","NYG @ WSH (FOX, Landover, open)","WSH \u22123.5 all. Opener \u22122.5 \u2192 \u22123.5.","42.5 all (opened 48.5)","66\u201368\u00b0F, wind E 9\u201311, RAIN 78\u2013100% (0.60\u20131.17\u2033). \u26a0\ufe0f WORST RAIN OF WEEK"],
["Sun 10/11 1:00 PM ET (FLEXED)","CHI @ GB (FOX, Lambeau, open)","CHI \u22122.5 (DK/FD), \u22122 (MGM). Opened GB \u22123 \u2192 flipped.","45.5\u201346 (opened 49.5)","72\u201375\u00b0F, wind SSW 12, rain 0%. No flag."],
["Sun 10/11 4:05 PM ET","DEN @ LAC (CBS, SoFi, ETFE roof)","DEN \u22123.5 all books \u2014 flat all week.","42.5 (opened 43.5, steamed down)","Showers 75\u00b0F, rain 60% but roofed; wind 14. Noted, no flag."],
["Sun 10/11 4:25 PM ET","DET @ ARI (FOX, State Farm, retract. roof)","DET \u22125.5 (DK/FD), \u22124.5 (MGM). Dipped to \u22124.5 midweek, back to \u22125.5.","54.5 (opened ~53) \u2014 highest total on slate","84\u00b0F, T-storms 70% (0.21\u2033), wind SSE 17. \u26a0\ufe0f WIND + STORMS \u2014 roof almost surely closed."],
["Sun 10/11 4:25 PM ET","SF @ SEA (FOX, Lumen, open)","SEA \u22122.5 (DK), \u22123 (FD/MGM). Opened \u22123.5 \u2192 toward SF.","45.5\u201346 (FD roundup 47.5 \u2014 conflict kept)","Sunny 62\u00b0F, rain 10%, wind N 10. No flag."],
["Sun 10/11 8:20 PM ET (SNF)","BAL @ ATL (NBC, Mercedes-Benz, retract. roof)","FLIPPED: opened BAL \u22126 \u2192 ATL \u22123.5 across 9 books (Lamar).","43.5 (opened 46.5)","65\u00b0F, wind W 9, rain 20%. Dome \u2014 no flag at kick. Sat 90% rain is travel context only."],
["Mon 10/12 8:15 PM ET (MNF)","BUF @ LAR (ESPN/ABC, SoFi canopy, outdoor class)","LAR \u22122.5 (DK/MGM), \u22123 (FD) \u2014 steady.","53.5\u201354.5","66\u201369\u00b0F, wind NW 5\u201310, showers 40\u201350% (0.06\u2033). \u26a0\ufe0f MODERATE RAIN CHANCE; canopy covers bowl."],
]
add_table(["Kickoff (ET)","Game","Spread + movement","Total","Weather"], lines_rows, widths=[1.2,1.9,1.9,1.0,1.8])
para("Line-move headlines: (1) SNF 9\u20139.5-pt flip to ATL \u22123.5 on Lamar. (2) HOU \u22123.5 \u2192 \u22127.5 at TEN (0\u20134 vs 0\u20134). (3) LV +5 pts at NE (\u22128.5 \u2192 \u22123.5). (4) CHI @ GB flipped GB \u22123 \u2192 CHI \u22122.5 after flex + Bagent/Caleb news settled. (5) DET @ ARI total 54.5 is the only shootout number \u2014 next highest Sunday total is 45.5 (Bowden: \u2018a one-off week more than a stacking week\u2019). Weather re-check Friday; rain flags (MetLife, Pittsburgh, Landover, Nashville) are the Sunday-morning update priority.", bold_prefix="Move summary: ")

h1("5  Analyst Takes \u2014 Jeff Mans & Jim Bowden (SiriusXM Ch 87)")
para("All takes attributed with show and date. Confidence language is the host\u2019s own. Mans hand-builds 2 lineups/week (1 cash, 1 GPP) and uses an optimizer for 10\u201320 templates; his standing DFS philosophy: never stream QB/TE/K/DST.")
h2("Jeff Mans \u2014 Elite Sports (Oct 5 Reaction / Oct 6 Waiver Wire / Oct 7 Week 5 Ranks)")
mans_rows = [
["Drake Maye \u2014 BUY LOW","\u201cDon\u2019t be out on Drake Maye.\u201d Member-voted QB1 for Week 5. Soft run: LV, NYJ, CHI, MIA, GB, DET.","HIGH \u2014 repeated across Oct 7 show"],
["Bhayshul Tuten (JAX) \u2014 MUST START vs PHI","\u201cA thousand times, yes.\u201d Eagles disintegrating vs run. Two TDs called back by penalties recently (\u201815, almost 20 fantasy points off the board\u2019). Bowden agrees: JAX bellcow.","HIGHEST \u2014 signature call of the week"],
["Keon Coleman \u2014 #1 WAIVER ADD OF WEEK","\u201cThe number one receiver in Buffalo right now\u2026 looks different this year.\u201d If DJ Moore active, Moore over Coleman (nothing physically wrong).","HIGH \u2014 Oct 6 show lead item"],
["Jacoby Brissett \u2014 START OVER HERBERT","\u201cThe perfect quarterback to use in daily.\u201d One-week streamer vs DET \u2018historically bad secondary.\u2019 Both Mans and Flowers start him over Herbert this week.","HIGH \u2014 aligns with YouTube consensus"],
["FLEE ALL EAGLES","\u201cEverything Philadelphia Eagle related, I\u2019m out on now.\u201d Eagles \u2018a four-win team\u2026 4-13, maybe 5-12\u2019 post-Johnson retirement. Shipley FAAB 10\u201312% but Mans himself: \u2018I\u2019m not picking up Will Shipley\u2026 that\u2019s a no burger\u2019 (list was pre-retirement). Pierce ~$1 less. Fears 3-way split: \u2018Pierce sucks up 14 carries for 51 yards.\u2019","HIGHEST \u2014 \u2018bloodbath\u2019 in London"],
["Kyle Pitts receiving line \u2014 BET IT EVERY TIME","Standing angle: bet Pitts over ~20 rec yds \u2018every time\u2026 until they raise the number \u2014 play the market.\u2019 MNF parlay Kamara 3+ rec + Pitts 20+ (+120 FD) already cashed.","STANDING \u2014 repeat until books move"],
["Emanuel Wilson \u2014 ONE-WEEK RENTAL ONLY","Start THIS week (\u2018gash SF on ground\u2019) but strictly one week: zero 3rd-down snaps, Charbonnet returning (ruled out W5, W6 possible), SEA signed RBs and tried Mixon \u2014 \u2018screaming\u2026 not secure at RB.\u2019 Mans wants nothing to do with SEA backfield ROS.","HIGH for W5 only"],
["Drake London / ATL passing","Penix: \u2018all he does is go 223 and 1,\u2019 ~80% to London. Pitts \u2018breakout games coming, but not vs Ravens D\u2019 (Week 5 caution).","MEDIUM"],
["Marvin Harrison Jr. \u2014 \u2018CALLING MY SHOT\u2019 vs DET","MHJ + Michael Wilson \u2018go off\u2019 vs Detroit (historically bad secondary). \u2018If you can\u2019t start him this week, he shouldn\u2019t be on your team\u2019 \u2014 sell-high after.","HIGH \u2014 Oct 5 show"],
["Kenneth Walker \u2014 DON\u2019T CHASE","\u2018It\u2019s Kenneth Walker\u2019s world\u2026 every record for yards after contact\u2019 BUT never trade for a guy this hot. \u2018From this point to Week 18, Jeanty is gonna outperform him.\u2019","HOLD/FADE-THE-BUY"],
["Lamar Jackson \u2014 DONE WITH HIM","\u2018I\u2019m done messing around\u2026 take the damn cart.\u2019 MRI ankle; Mans out regardless of Huntley matchup.","OUT"],
["Tyreek Hill \u2014 HARD NO","\u2018A nothing burger\u2026 hasn\u2019t been productive since 2023\u2026 dumbest money I\u2019ve ever heard\u2019 to spend half a FAAB budget. KC reunion = \u2018Drew Rosenhaus money grab.\u2019 Flowers agrees.","HARD FADE"],
["Mike Evans (now SF) + Purdy","Evans = WR2 every week (\u2018catching five for a touchdown every week\u2019). Purdy is Mans\u2019 \u2018MVP of the league.\u2019 CMC counter: \u2018an absolute downright blob\u2026 like a bag of potatoes.\u2019","BULLISH Evans/Purdy; FADE CMC"],
["Trey Harris / Roman Wilson / Ekeler","Harris \u2018WR1 by default\u2019 in LAC with McConkey hurt. Roman Wilson preferred over Pittman \u2018and probably even more than DK Metcalf\u2019 ROS. Ekeler suggests Rashaad White \u2018hurt a lot more than we thought.\u2019","WAIVER-TIER BULLISH"],
["Super Bowl pick (for the pod)","\u2018Jacksonville Jaguars, Chicago Bears\u2026 Liam Cohen and Ben Johnson are the two best coaches going now.\u2019 They meet Week 13.","FUN \u2014 not a Week 5 play"],
]
add_table(["Take","Reasoning (host\u2019s words/paraphrase)","Confidence read"], mans_rows, widths=[1.7,3.6,1.5])
h2("Jim Bowden \u2014 Fantasy Alarm (Oct 5 Week 4 Chaos / Oct 6 Flush-or-Crush / Oct 7 Picks & Survivor)")
bowden_rows = [
["SURVIVOR ORDER: Bengals #1","\u2018Joe Burrow\u2019s gonna win this game. I don\u2019t care.\u2019 Then Cowboys #2, Jaguars, Texans. Bender split Cowboys/Jaguars; Josh also Bengals.","HIGHEST \u2014 Oct 7 farewell show lead"],
["DOG OF WEEK: Raiders +3.5 @ NE","\u2018Tom Brady Revenge game\u2026 against Robert Kraft.\u2019 Called it a potential 5th straight dog hit. Bender took Packers \u22122.5.","HIGH \u2014 personal heater cited"],
["Showdown CAPT: George Pickens (Thu)","Bowden\u2019s TNF Showdown captain. \u2018It\u2019s coming\u2019 per Jerry/Schottenheimer; franchise-tag motivation. Bender: Lamb \u2018undefensable\u2019 Thu vs TB \u2014 Pickens is the leverage pivot off Lamb chalk.","CIRCLE OF TRUST \u2014 IN"],
["STACKS: Lions + Bengals","Lions: Goff/ARSB/LaPorta/Gibbs (\u2018any of those four\u2019). Bengals vs MIA: Burrow, Chase Brown (\u2018might have the best game of his year\u2019), Dante Myers, Gesicki \u2014 \u2018they\u2019re going to eat. Dolphins are really bad.\u2019 Bender run-it-back: ARI (Brissett/M. Wilson/McBride); CHI ground vs GB (Swift+Monangai \u2018bargain\u2019); Judkins \u2018destroys\u2019 Jets.","HIGH \u2014 two-stack week"],
["FLUSH Ollie Gordon (sell high)","Loftus segment: \u2018Neither one of \u2019em are gonna be very good.\u2019 CRUSH KC Concepcion (17 rec vs Boston\u2019s 13; better ROS) and Gainwell (checkdown while TB trails). Mild crush Braelon Allen. Chargers: crush ONLY Tre Harris, \u2018flush everything else.\u2019","SEGMENT VERDICT"],
["Mike Gesicki revenge game vs MIA","Both hosts love it: MIA dead last DVOA vs TEs, 70 yds/game allowed. Spikes if Chase (and Higgins) out. Dulcich flip side: CIN \u2018cannot cover the tight end, period.\u2019","HIGH \u2014 conditional on Chase"],
["Carnell Tate \u2014 \u2018BIG FAN\u2019","Bender\u2019s call (38.7% target share W4; 5th-highest rookie WR target rate since 2021 \u2014 Puka/Nabers/London/Flowers comp); Bowden: \u2018Love that call. I\u2019m in.\u2019 CamATL: \u2018favorite of the week,\u2019 predicted most popular play.","CIRCLE OF TRUST \u2014 IN"],
["Roman Wilson \u2014 sneaky add","Rodgers\u2019 new favorite (Lazard/Cobb pattern); TDs 2 straight. Circle of Trust IN (with Pickens, Tate, Goff).","IN"],
["OUT list","Bucky Irving (zero targets with Daniels at QB; DAL sells out vs run), Wicks/Eagles (\u2018you don\u2019t change the stripes on a zebra\u2019), Shough @ MIN vs Flores.","OUT"],
["Eagles/Cowboys future","Bowden picks COWBOYS to win NFC East (Dart/Burns injuries sink NYG; Eagles \u2018more questions than answers\u2019). Roseman rebooting. Farewell context: Bowden off to NLCS/World Series coverage after this show.","POD COLOR"],
["MNF Magic Leg Parlay (played Mon \u2014 historical)","+950: Bijan o85.5 rush yds, Vele o44.5 rec yds, Pitts o30.5 rec yds, London anytime TD. From Oct 5 show.","HISTORICAL"],
["If you have Bijan, HOLD Brian Robinson","Brian Robinson is the Bijan handcuff (scored TD in Oct 6 MNF Falcons\u2013Saints). Bender: \u2018if you have Bijan, Brian Robinson is your handcuff\u2026 one and done\u2019 vs league-worst Saints run D.","SEASON-LONG HOLD NOTE"],
]
add_table(["Take","Reasoning","Confidence read"], bowden_rows, widths=[1.7,3.6,1.5])
para("Where Mans and Bowden agree: Brissett as the cheap-QB play, Tuten as the JAX bellcow, Gesicki if Chase sits, Coleman/Tate/Wilson as the cheap-WR tier, and a full fade of Philadelphia. Where they differ in tone: Bowden is stacking Lions+Bengals aggressively; Mans is more QB-rank-driven (Maye 1, Love 2, Brissett 3, Bagent 4, Penix 5) and is the one pounding the Pitts receiving line every week.")

h1("6  YouTube Consensus \u2014 What 16 Videos Agree On")
para("Morning sweep (7 videos) + PM hyper-sweep (9 NFL). A take is \u2018consensus\u2019 at 3+ independent sources. Salaries are DK Main slate.")
h2("The four headline consensus plays")
bullet("Jacoby Brissett ($5,500) \u2014 the week\u2019s cheap-QB crush (4 sources: Stokastic, Kunath, 925 Sports, Fantasy Sports Lab). DET forces Arizona into pass volume (35\u201350+ attempts). Pairs: Michael Wilson or Trey McBride. Mans and Bowden independently landed in the same spot.", bold_prefix="QB \u2014 ")
bullet("Chase Brown ($6,900) \u2014 the chalk RB1 (3 sources). Cincinnati \u22126.5/\u22127 vs Miami (32nd in points allowed to RBs, bleeds RB receiving). 11 targets the week Chase exited. Bowden: \u2018might have the best game of his year.\u2019", bold_prefix="RB \u2014 ")
bullet("Amon-Ra St. Brown ($7,900) over Jahmyr Gibbs ($9,800) as the GPP pivot (CamATL\u2019s full lineup thesis). \u2018When everyone else picks Gibbs and you take ASB\u2026 you instantly leapfrog a huge group.\u2019 ASB: double-digit targets every week, priced like an $8,500 receiver. Gibbs counter: Swolecast \u2018I\u2019ll play him on every team\u2019; Kunath/Stokastic \u2018too expensive.\u2019", bold_prefix="GPP pivot \u2014 ")
bullet("Carnell Tate \u2014 \u2018favorite of the week\u2019 (CamATL), predicted slate\u2019s most popular play. 12 targets, 0\u20134 team always trailing. Bender\u2019s 38.7% Week 4 target share; Bowden \u2018big fan.\u2019 Note: Tate is a college name surfacing in the NFL DFS transcripts as transcribed \u2014 treat the label as reported.", bold_prefix="WR chalk callout \u2014 ")
h2("Position-by-position consensus")
consensus_rows = [
["QB","Brissett $5.5K (4-src crush); Goff $6.6K the only pay-up worth it; Shough $6.1K leverage (48/42/56/34 attempts); Cousins $5.4K FSL lineup QB; Maye SPLIT (Stokastic \u2018first click\u2019 vs Kunath out)"],
["RB","Chase Brown $6.9K (3-src); Jonathan Taylor $7.8K \u2018matchup-proof\u2019 vs PIT (4-src, TD 4 straight); Aaron Jones (3-src, 23\u201328 opps); Judkins $5.7K (3-src, 20\u201322 touches vs NYJ); Warren CONDITIONAL on Dowdle; Swift CONDITIONAL on Monangai; Braelon Allen if Hall out (100% of NYJ RB rushes W4); RJ Harvey $5.2K \u2018steal\u2019"],
["WR","Michael Wilson $6.2K \u2014 chalkiest WR (4-src, 30 tgt/37% share vs DET); ASB $7.9K (4-src); Nico Collins $7.5K (3-src); Nabers (3-src, \u2018classic Jameis game\u2019); Jefferson $7.3K if back (3-src); Jameson Williams = GPP leverage Lion (3-src); Burden $4.9K \u2018pricing mistake\u2019; Bengals cheapies Meyers/Tinsley ~$3.5K if Chase sits"],
["TE","Isaiah Likely $4.3K \u2014 THE key TE (4-src: 41% share, 12 tgt, 88% routes); McBride $6.7K pay-up; Hockenson $4.8K (3-src); Juwan Johnson $4.5K (3-src); Loveland $4.6K buy-low (29% share W4)"],
["DST","Raiders $2.5K vs Maye (NE leads NFL in giveaways); Browns cheap vs Geno; Dolphins cheapest if Chase out; Vikings $3.1K popular vs NO; Jets $2.7K vs CLE"],
["Stacks","Purdy+Kittle core (Swolecast \u2014 Kittle ownership \u2018ginormous\u2019); Brissett+Wilson+McBride (Bowden/Bender/CamATL); Goff+ASB+LaPorta (Bowden); Winston+Nabers+Likely (Bender \u2018very bullish\u2019 \u2014 WAS secondary \u2018atrocious\u2019)"],
]
add_table(["Pos","Consensus (salaries are DK Main)"], consensus_rows, widths=[0.7,5.8])
para("Splits worth knowing: Maye (Stokastic first-click vs Kunath out; Mans QB1). Gibbs (Swolecast every-team vs Kunath/Stokastic too-expensive; FSL GPP pivot only). CMC (Stokastic hard fade \u2014 32% opportunity share \u2014 vs FSL contrarian-bullish). Chase WR (Kunath out off injury vs Stokastic no-concern-if-plays; FSL bullish on Higgins regardless). Bagent (925 \u2018too cheap hidden stack\u2019 vs FSL avoid; Mans ranks him QB4). Full per-video claims with timestamps are in the master rollup \u2014 this section is the compression.")

h1("7  College Football Week 6 \u2014 For the Friday Podcast")
para("AP Top 25 (Oct 4): 1 Texas (4\u20130, 61 first-place votes), 2 Georgia (5\u20130), 3 Notre Dame (5\u20130), 4 Miami FL (5\u20130), 5 Ohio State (4\u20131), 6 Alabama (5\u20130), 7 Indiana (5\u20130), 8 BYU (4\u20130), 9 Ole Miss (3\u20131), 10 LSU (4\u20131). Lines are Oct 3\u20137 snapshots \u2014 recheck before air.")
cfb_rows = [
["No. 2 Georgia @ No. 6 Alabama","Sat 7:30 PM ET, ABC, Bryant-Denny","Alabama \u22121.5 / 52.5 (DK/FD/BetRivers/Fanatics, Oct 6). Flipped: Georgia opened \u22122.5. BetMGM Oct 5 still showed Georgia \u22121.5/56.5 \u2014 books split.","Game of the year so far. Kirby 2\u20137 vs Bama, 120\u201314 vs everyone else. Russell (281 ypg) vs Stockton (210 ypg) production gap is the number. Pate picks Alabama outright; Cover 3 no pick (Georgia D edge, Bama battle-tested); SGPN 2\u20131 Alabama. Models split: Bookies.com Georgia by 4.6; Dimers Alabama 29\u201326 (53.2%); FPI 52.6% Bama. Tropical-system weather watch."],
["No. 1 Texas vs Oklahoma (Red River)","Sat 3:30 PM ET, ABC, Cotton Bowl","Texas \u22128.5 / 39.5 (DK Oct 4; BetMGM Oct 6). FanDuel had \u22127.5 Oct 6 \u2014 shop 7.5\u20138.5.","OU hasn\u2019t scored a TD vs Texas since 2023. OU offense 131st rushing/giveaways. Pate: Texas \u22127.5 covers (model \u221210.5); Cover 3 ~20\u201310 Texas; SGPN 3/3 Oklahoma +8.5 (Sean Green show-closing lock, ML sprinkle +280)."],
["No. 21 UCLA @ No. 13 Oregon","Sat 3:30 PM ET, CBS, Autzen","Oregon \u221211.5 / 58.5 (DK Oct 5; FD Oct 6). Range \u221211 to \u221212.5.","Oregon QB Dante Moore OUT (concussion vs USC Sep 26). Dylan Raiola likely starts (19/25, 289, 2 TD in relief). UCLA = nation\u2019s #1 rush attack (1st success/EPA) but 96th EPA/dropback. SGPN 3/3 UCLA +11.5 vs Cover 3 \u2018Oregon by three scores.\u2019"],
["No. 19 USC @ Penn State (White Out)","Sat 7:30 PM ET, NBC, Beaver Stadium","Pick\u2019em to Penn State \u22122 (books split) / 54.5\u201357.5. Highest-fluctuation game on board.","Unranked PSU favored over No. 19 USC is the tell. USC 2\u201310 in ET games since 2012. WagerTalk: Penn State \u22121.5 is Marco\u2019s best bet; Tman opposes (USC 28\u201323)."],
["Iowa State @ No. 8 BYU","Fri 10:15 PM ET, ESPN, Provo","BYU \u221210.5 / 46.5 (BetMGM Oct 6).","Universal look-ahead angle: Notre Dame on deck for BYU (\u2018biggest game in program history\u2019). SGPN 3/3 + TCE double-lock + Tman all on Iowa State +10.5."],
["No. 7 Indiana @ Nebraska","Sat 12:00 PM ET, FOX, Lincoln","Indiana \u22127.5 / 49.5\u201350.5 (FD Oct 6).","Both 5\u20130. Nebraska 31 straight losses vs ranked foes (since 2016). Pate: Nebraska +7.5 covers, Indiana wins close (model only \u22124.5). USA Today panel: Indiana \u22127 \u2018with room to spare.\u2019 88\u00b0F, 15\u201325 mph wind \u2014 kicking watch."],
["Kansas @ No. 12 Utah","Sat 10:15 PM ET, ESPN, Rice-Eccles","Utah \u221215.5 / 52.5 (DK opener Oct 3 \u2014 total not re-verified midweek).","VSiN fade system: ranked home favorites of 14+ vs unranked conference foes are 43.8% ATS since Oct 2015."],
]
add_table(["Game","When / where","Line (attributed)","Podcast angle"], cfb_rows, widths=[1.4,1.5,1.9,2.5])
h2("Heisman movement (Oct 3\u20137 prices)")
heisman_rows = [
["Jeremiah Smith (WR, Ohio State) \u2014 FAVORITE, pulling away","+100 FanDuel (from +290); \u2212110 best (bet365); 48% Kalshi, no one else above 15%. 44/823/9 \u2014 leads nation in all three. Back-to-back 200+ (217/4 vs Illinois, 206/2 vs Iowa). Ohio State all-time leader: 207 rec, 3,381 yds, 36 TD. Would be 2nd primary WR to win this century (DeVonta Smith 2020)."],
["Keelon Russell (QB, Alabama) \u2014 RISING FAST","+1100 \u2192 +700 FanDuel (Oct 5); +350 at Legal Sports Report. 10\u20130 TD\u2013INT last 3 games. 71.2%, 1,414 yds, 11:2, 4 rush TD. PFF 2nd-highest-graded QB (92.6). A win over Georgia could put him in the lead (USA Today)."],
["Darian Mensah (QB, Miami) \u2014 HOLDING","+700 FanDuel (2nd favorite); 1,438 yds, 15 TD, 84.2%, 0 INT. Miami on bye Week 6."],
["CJ Carr (QB, Notre Dame) \u2014 CLIMBING","+750 FanDuel; +900 BetMGM (3rd). Climbing after 5-TD road win."],
["FALLING","Kamario Taylor (Miss State) +600 \u2192 +3750 in 7 days (2 early INTs vs Bama). Jadan Baugh (Florida) +1200 \u2192 +7750 (29 yds vs Missouri). Arch Manning +3000 and falling (Week 5 was Texas bye, not injury)."],
]
add_table(["Player","Movement"], heisman_rows, widths=[2.0,4.8])
h2("CFB injuries that matter Saturday")
bullet("Oregon QB Dante Moore OUT (concussion) \u2014 Dylan Raiola likely starts vs UCLA. The single biggest CFB availability item of the week.", bold_prefix="Oregon \u2014 ")
bullet("Georgia @ Alabama SEC report (Oct 7): Alabama OUT LB Umeozulu, LB Hill, LB Jones, DB Sherman, DL Beaman; Georgia OUT WR Blackshear, RB Bowens, OLB Williams, S Green, OL Harrison.", bold_prefix="SEC title game \u2014 ")
bullet("Texas mounting injuries pre\u2013Red River: RB Hollywood Smothers \u2018emergency only,\u2019 WR Cam Coleman dinged vs Tennessee, edge Colin Simmons playing through elbow (5.5 sacks vs Tennessee anyway). TE Nick Townsend out 3rd straight.", bold_prefix="Texas \u2014 ")
bullet("Tennessee QB Faizon Brandon questionable (shoulder); George MacIntyre may make first career start vs Arkansas. Seven season-ending injuries for the Vols.", bold_prefix="Tennessee \u2014 ")
bullet("South Carolina edge Dylan Stewart (suspended Week 5) trending toward playing at No. 16 Florida (Zenitz, Oct 7).", bold_prefix="Suspension watch \u2014 ")
para("Analyst confidence map and full scheme breakdowns (Stockton deep-ball chart, UCLA run-fit math, Red River trench numbers) are in the CFB source file \u2014 pull from there on Friday if the segment runs long.")

h1("8  Prop Angles \u2014 Every Prop Cited, With Line + Source")
para("No prop below is a GSE pick. Lines are as quoted by the source at recording time; re-verify before any use.")
prop_rows = [
["Mans standing angle","Kyle Pitts OVER ~20 receiving yards \u2014 \u2018bet it every time until they raise the number.\u2019 MNF parlay Kamara 3+ rec + Pitts 20+ (+120 FD) cashed Oct 5.","Mans, Elite Sports Oct 6"],
["Bowden Magic Leg Parlay (played Mon Oct 5, historical)","Bijan o85.5 rush yds + Vele o44.5 rec yds + Pitts o30.5 rec yds + London anytime TD = +950.","Bowden, Fantasy Alarm Oct 5"],
["TNF \u2014 Jalon Daniels (TB rookie)","OVER 174.5 pass yds (\u2212115 DK); over rush yds (line unstated); OVER 7.5 rush attempts (DAL allows most QB rush att/yds). First-TD 20/1; anytime-TD leverage noted.","SGPN TNF; BettingPros TNF (Oct 7)"],
["TNF \u2014 TB pass-catchers","Hurst o22.5 rec yds (over in all 4); Godwin o3.5 rec (+money) and o27.5 rec yds; Otton o27.5 rec yds; Egbuka o34.5 rec yds (steamed 31.5\u219234.5; Bowles promised more usage).","SGPN; BettingPros"],
["TNF \u2014 DAL","Lamb o80.5 rec yds + o6.5 rec (SGP with Egbuka o34.5 = +340); Javonte o2.5 rec (\u2212125), anytime TD +200 (65.5% sim \u2014 negative edge at price); Ferguson o3.5 rec (\u2018riskiest leg\u2019 \u2014 TB TE-funnel D); Gainwell anytime TD +450 FD (best model value, 16.5% edge); Pickens o4.5 rec (juiced) / 70+ yds (+120 FD) as Lamb-chalk leverage; Dak INT +110; Javonte UNDER 15.5 longest rush (\u2212115), NO TD +180.","BettingPros; MySpariPicks; SGPN"],
["TNF \u2014 team angles","DAL 1H team total o14.5 (main play \u2014 DAL avg 17 1H pts at home); DAL full-game TT o27.5 \u2018viable\u2019; DAL 1H spread alternate.","Mark Zinno (line DAL \u22129.5 at recording)"],
["Sun \u2014 Gesicki (CIN) receiving","Lean OVER only if Chase AND Higgins both out (historical spike games in that spot).","Action Network; Fantasy Sports Lab"],
["Sun \u2014 Likely (NYG) receiving","Reception/yardage interest as Giants\u2019 target leader (12 tgt, 41% share W4). No lines stated by source.","Fantasy Sports Lab"],
["Sun \u2014 49ers sack props","Angle only: SF hasn\u2019t allowed a sack all season. No line stated.","Action Network"],
["Longshots (TNF, for color only)","Daniels 2+ TD + DAL \u22126.5 at 69/1; Daniels 225+ pass + 100+ rush at 61/1; Daniels 90+ rush at 80/1; Bucs \u221216.5 alt at 30/1.","SGPN"],
]
add_table(["Angle","Line / detail","Source"], prop_rows, widths=[1.5,3.8,1.5])

h1("What Is Still Pending (By Design)")
bullet("Late-Wednesday SiriusXM shows \u2014 the 11:50 PM CT pull tonight (transcript method, now fixed). Anything material merges into \u00a75 Friday morning.", bold_prefix="Tonight \u2014 ")
bullet("Thu/Fri practice reports \u2014 the injury table (\u00a72) is the Wednesday snapshot. Huntley/Lamar final call, Chase/Higgins clearance, Barkley London travel, Jefferson full-go, Dowdle/Warren split, and Monangai/Swift are the six to re-verify.", bold_prefix="Thu/Fri \u2014 ")
bullet("DK lobby re-verification Thu morning \u2014 the salary board (\u00a73) is from a published mirror (FantasySportsEdge, Oct 7 3:42 PM EDT stamp). Prices already moved intraday Wednesday. Confirm in-lobby before lock; Showdown CPT prices especially.", bold_prefix="Thu morning \u2014 ")
bullet("Friday weather re-check \u2014 rain games (Landover, MetLife, Pittsburgh, Nashville) and the Detroit\u2013Arizona roof decision. London and SNF are weather-clean.", bold_prefix="Friday \u2014 ")
bullet("Friday YouTube re-sweep is optional \u2014 the 16-video consensus (\u00a76) is built. Garrett\u2019s podcast is self-made; the Saturday ~8 AM weekly aggregate email is the standing delivery, not an extra pull.", bold_prefix="Friday (optional) \u2014 ")
bullet("Phase 2 (metrics) does not start until Garrett says so. No projections, ownership, or lineup builds in this packet.", bold_prefix="Phase gate \u2014 ")

h1("Sources & Provenance")
sources = [
"SiriusXM master rollup: goals/gse-advanced-metrics-benchmark-sweep/files/siriusxm-weekly/week-05.md (Mans Elite Sports Oct 5/6/7; Bowden Fantasy Alarm Oct 5/6/7 \u2014 full transcript-panel extraction; YouTube morning sweep 7 videos + PM hyper-sweep 9 NFL + 6 CFB).",
"DK salaries: hidden_files/dk-week5-salaries-2026-10-07.md (FantasySportsEdge DK mirror, Oct 7; identical-pricing finding verified across classic slates).",
"Lines/weather: hidden_files/week5-lines-weather-2026-10-07.md (DK/FanDuel/BetMGM/VegasInsider/SI/Covers; weather.com Oct 7).",
"Beat writers: hidden_files/week5-beat-writers-2026-10-07.md + east/north/south/west part files (all 30 teams, Oct 6\u20137).",
"CFB: hidden_files/cfb-week6-2026-10-07.md (AP poll NCAA.com Oct 4; lines rg.org/NBC/SI/BetMGM Oct 3\u20137; Heisman FanDuel/bet365/Kalshi via SI/NBC/Boyd\u2019s Bets Oct 3\u20137; YouTube SGPN/Pate/Cover 3/Tman/WagerTalk/USA Today Oct 5\u20137).",
]
for s in sources:
    p = doc.add_paragraph(style='List Bullet')
    r = p.add_run(s); r.font.size = Pt(7.5)
p = doc.add_paragraph()
r = p.add_run("\u2014 End of Wednesday Oct 7 full-corpus build \u2014 Update in place Thu/Fri; do not start a second packet file \u2014"); r.font.size = Pt(8); r.italic = True
doc.core_properties.title = "Week 5 DFS Packet 2026"
doc.core_properties.subject = "NFL Week 5 DFS information corpus (Phase 1)"
doc.save(OUT)
print(f"Saved to {OUT}")
