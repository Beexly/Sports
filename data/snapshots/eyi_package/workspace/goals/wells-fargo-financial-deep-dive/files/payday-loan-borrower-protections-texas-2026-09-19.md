# Texas Payday-Loan Borrower Protections — Research Findings
**Researched 2026-09-19. Research only — no lender, bank, or agency was contacted. This is legal information, not legal advice; verify with a Texas attorney before acting.**

Context: unemployed Texas borrower (Kingwood/Houston), disabled, bank accounts negative, CashNetUSA and Speedy Cash debiting hundreds/week via ACH, both operating in Texas as Credit Access Businesses. Pending EEOC case is attorney-handled and out of scope.

---

## A. What stops the bleeding fastest

In order of speed and cost:

1. **Revoke the ACH authorization with each lender, in writing.** Under the Electronic Fund Transfer Act (EFTA) / Regulation E, you can revoke a preauthorized debit authorization at any time — even one you signed before. Steps per the CFPB (payday-lender-specific page): (1) call and write the company revoking authorization; (2) call and write the bank saying authorization was revoked. CFPB sample letters: [payday-lender page](https://www.consumerfinance.gov/ask-cfpb/how-can-i-stop-a-payday-lender-from-electronically-taking-money-out-of-my-bank-or-credit-union-account-en-1605/) and [general stop-automatic-payments page (reviewed Aug 28, 2026)](https://www.consumerfinance.gov/ask-cfpb/how-do-i-stop-automatic-payments-from-my-bank-account-en-2023/).

2. **Stop-payment order with Wells Fargo: $30 per order, ACH stops do not expire.** Place via the Wells Fargo app/online (Accounts → Manage Accounts → "Stop Future Payment" for preauthorized ACH), by phone at **1-800-869-3557 (1-800-TO-WELLS)**, or at a branch. Fee is $30 per item (current WF FAQ). "The stop payment will remain in effect for six months for checks and indefinitely for ACH items." Sources: [WF order-checks FAQ](https://www.wellsfargo.com/help/checking-savings/order-checks-faqs/), [WF stop-payment disclosure (rev. 08/26)](https://www08.wellsfargomedia.com/assets/pdf/personal/help/stop-payment-disclosure.pdf). Reg E requires the bank to honor an oral stop-payment order given at least **3 business days before** the scheduled debit; the bank may require written confirmation within 14 days ([12 CFR 1005.10(c)](https://www.bankersonline.com/qa/stop-pays-subject-reg-e)).

3. **Dispute any post-revocation debit as unauthorized.** After revocation, any further debit by that lender is an error the bank must investigate. Under Reg E 1005.11, you must notify the bank **no later than 60 days after the periodic statement on which the transfer first appears**, and the bank must investigate and report results promptly ([Federal Reserve 1005.11 text](https://www.federalreserve.gov/frrs/regulations/section-100511-procedures-for-resolving-errors.htm)).

4. **Strongest practical stop: close the account and open a new one** (negative balance must be addressed with the bank first). This is the CFPB-consistent fallback if stops don't hold — but Wells Fargo's policy on closing negative-balance accounts was not verified.

**Caveats:** A stop-payment order is identified by company name / ACH company ID — payday lenders sometimes debit under multiple company names/IDs, so one $30 order may not catch them all. Whether a single Wells Fargo ACH stop covers varying amounts from the same originator is **unresolved** in Wells Fargo's published materials; assume one order per originator and confirm by phone. Also note: revoking authorization or stopping payments does NOT cancel the loan contract or the debt — the lender can still bill and sue.

---

## B. Federal ACH-revocation rights (EFTA / Regulation E) — the exact rules

- **Right to stop a preauthorized transfer:** A consumer may stop payment of a preauthorized electronic fund transfer by notifying the financial institution orally or in writing **at least 3 business days before** the scheduled date (12 CFR 1005.10(c)(1)).
- **Written confirmation:** The bank may require written confirmation of an oral order within 14 days; it must tell you where to send it ([bankersonline.com Q&A](https://www.bankersonline.com/qa/stop-pays-subject-reg-e)).
- **Revocation kills the whole series:** Once the bank is notified the authorization is no longer valid, it **must block all future payments** from that payee-originator — and it may not wait for the lender to terminate the debits. The bank may require documentation (e.g., a copy of your written revocation to the lender) within 14 days; without it, the bank may lift the block ([bankersonline.com staff-interpretation summary](https://www.bankersonline.com/qa/reg-e-cancelled-recurring-transactions)).
- **60-day unauthorized-transfer dispute right:** Notice of an error (including an unauthorized transfer) must be received by the bank **no later than 60 days after the institution sends the periodic statement on which the alleged error is first reflected** (12 CFR 1005.11(b)(1)). The bank must then investigate and report results within 3 business days of completing its investigation, and correct the error within 1 business day of determining one occurred ([Fed 1005.11](https://www.federalreserve.gov/frrs/regulations/section-100511-procedures-for-resolving-errors.htm)).
- Keep a copy of the revocation letter to the lender — Wells Fargo can ask for it as documentation of revocation.

---

## C. Texas CAB / OCCC rules when a borrower can't pay

**Hard truth up front: Texas law gives borrowers almost no leverage here.**

- **No state-mandated extended payment plan.** Texas Finance Code ch. 393 (the statute governing Credit Access Businesses like CashNetUSA and Speedy Cash) contains no extended-payment-plan requirement. A bankruptcy-law summary of Texas law: "There are no laws in place that require a lender to offer you a reasonable repayment plan, meaning you'll have to negotiate directly with the creditor" ([debtstoppers.com, secondary](https://www.debtstoppers.com/texas/payday-loans/)). The CFSA industry Best Practices code (self-regulation, not law) asks *member* lenders to offer a no-cost EPP — request before close of business the day before the due date — but current CFSA membership of CashNetUSA/Speedy Cash could not be verified, and Speedy Cash's own FAQ mentions EPP only for Louisiana.
- **No statewide rollover limits or fee caps.** The familiar guardrails (max 3 refinancings, 20%-of-gross-income cap, ≥25% of each renewal toward principal) come from **local city ordinances**, not state law — Houston passed its ordinance in 2013, and ~50 Texas cities use the template. A borrower in Kingwood/Houston may be covered by Houston's ordinance ([debthammer.org, secondary](https://debthammer.org/texas-payday-loan-laws/)). Whether the ordinance applies to these specific loans was not re-verified — flag for an attorney.
- **Three hard Texas-law protections that DO exist** (Fin. Code §393.201(c), via HB 2594, 2011 — [bill text](https://www.capitol.state.tx.us/tlodocs/82r/billtext/html/hb02594f.htm)):
  1. **No prepayment penalty** may be charged.
  2. **No person may threaten or pursue criminal charges** over a check or debit authorization given as security, absent forgery, fraud, theft, or other criminal conduct. **Not paying a payday loan is NOT a crime in Texas.** Texas's general consumer-debt theft protections align: unpaid payday debt alone, without fraud, is not a criminal offense.
  3. The CAB must comply with Texas Finance Code ch. 392 (Texas Debt Collection Act) and the federal FDCPA in collections.
- CABs must provide standardized cost disclosures at origination (APR, fees, total of payments) per Fin. Code §393.223 / 7 TAC §83.6007(b) ([OCCC rulemaking doc](https://occc.texas.gov/wp-content/uploads/2025/11/cab-rulereview-adoption-fc-030724.pdf)).

### Filing a complaint with the Texas OCCC (official)

- **Process:** Try resolving with the business first, then file. The OCCC assigns the complaint to Consumer Assistance staff, attempts resolution by phone/correspondence with the lender, may escalate to a field examiner for investigation, and notifies you. Limits: written complaints only; complaints are presumptively public under the Texas Public Information Act; the OCCC will not intervene if the matter is in litigation and cannot give legal advice ([OCCC complaint-resolution page](https://occc.texas.gov/consumers/complaint-resolution/)).
- **Where to file:** [Online complaint portal](https://occc.texas.gov/consumers/file-a-complaint) · Consumer Helpline **800-538-1579** (M–F 8am–5pm) · consumer.complaints@occc.texas.gov ([portal](https://occc.texas.gov/consumers/file-a-complaint), [helpline](https://occc.texas.gov/consumers/consumer-assistance-helpline/)).
- Debt-collection-specific complaints against third-party collectors go to the **TX Attorney General, 800-621-0508**, not the OCCC ([OCCC debt-collection page](https://occc.texas.gov/consumers/debt-collection-practices/)).

---

## D. Texas collections shields — what a lender can and cannot take

### (a) Wage garnishment — banned by the Texas Constitution
- Tex. Const. art. XVI, § 28: **"No current wages for personal service shall ever be subject to garnishment."** ([Texas State Law Library](https://sll.texas.gov/assets/pdf/braden/39-article-xvi.pdf), [UT Tarlton text](https://tarlton.law.utexas.edu/constitutions/texas-1876-en/article-16-general-provisions))
- Statutory mirror: Tex. Civ. Prac. & Rem. Code § 63.004 ("Except as otherwise provided by state or federal law, current wages for personal service are not subject to garnishment").
- Exceptions are narrow and do not include payday lenders: court-ordered **child support**, spousal maintenance, federal taxes, and federal student loans. A payday lender **cannot garnish wages in Texas**, period.

### (b) Bank-account levy after a judgment
- Texas unemployment benefits are **exempt from levy, execution, attachment, or any other remedy for debt collection** — Tex. Labor Code § 207.075(b) ([Justia](https://law.justia.com/codes/texas/labor-code/title-4/subtitle-a/chapter-207/subchapter-d/section-207-075/)). Benefits already received remain exempt if **not mingled with other funds** (§ 207.075(c)); no waiver of the exemption is valid (§ 207.075(d)).
- Practical notes: (1) Bank-account garnishment *is* allowed in Texas generally — but funds traceable to an exempt source (like unemployment benefits) are protected. Commingling UI money with other deposits weakens the protection, so keeping benefits in a separate account is the standard advice. (2) As a practical matter, **a negative-balance account has nothing to take** — and Texas creditors do not bother levying empty or negative accounts. (3) Note: exemption claims often have to be *asserted* — banks freeze first and ask questions later, so he should know the statute number if it ever comes up.

### (c) Statute of limitations
- **Four years** to sue on a debt in Texas — Tex. Civ. Prac. & Rem. Code § 16.004 ([Texas Law Help](https://texaslawhelp.org/article/time-barred-debts), [State Law Library](https://sll.texas.gov/faqs/debt-statute-of-limitations/)). Clock generally runs from missed payment / default.
- The 2019 "zombie debt" law (Tex. Fin. Code § 392.307) means the clock can no longer be restarted merely by making a payment or acknowledging the debt, and debt buyers must give written notice before acting on time-barred debt ([sll.texas.gov](https://sll.texas.gov/faqs/debt-statute-of-limitations/)).

---

## E. CFPB complaints against payday lenders

- **How to file:** online at [consumerfinance.gov/complaint](https://consumerfinance.gov:443/complaint/) (fastest), phone **1-855-411-CFPB (2372)** / TTY 1-855-729-CFPB (2372), or mail (PO Box 27170, Washington, DC 20038). Five steps: submit → routed to company → company responds (generally within 15 days, up to 60 for final) → complaint published de-identified → 60 days to review and give feedback. ([CFPB complaint page](https://consumerfinance.gov:443/complaint/))
- **Do they produce results?** Honest answer: they reliably produce a **company response** but rarely money. CFPB's own Consumer Response Annual Reports: **2025 data** — ~3,500 payday complaints; 95% got a company response; **86% closed with an explanation, only 2% with monetary relief** ([2025 report PDF](https://files.consumerfinance.gov/f/documents/cfpb_2025-cr-annual-report_2026-03.pdf)). **2024 data** — similar: 93% response, 83% explanation, 4% monetary relief ([2024 report PDF](https://files.consumerfinance.gov/f/documents/cfpb_cr-annual-report_2025-05.pdf)).
- Limits: the CFPB forwards complaints and uses the data for supervision/enforcement; it does not adjudicate individual cases (characterization inferred from process design + outcome data — not a quoted CFPB statement). Roughly a third of payday complaints are referred to other agencies or deemed not actionable rather than sent to the company.

---

## F. Houston-area free legal help for debt

- **Lone Star Legal Aid** (primary free civil legal aid for Harris County): **713-652-0077** / toll-free **800-733-8394**; apply online at [lonestarlegal.org](https://www.lonestarlegal.org/); office at 1415 Fannin St, Houston. Telephone intake Mon–Thu mornings; income eligibility required. Practice areas include consumer issues and disability rights ([Harris County resource page](https://dro.harriscountytx.gov/Home/Community-Legal-Resources)).
- **Houston Volunteer Lawyers Program**: **713-228-0735**; must apply online to get help ([makejusticehappen.org](https://www.makejusticehappen.org)).
- **Houston Bar Association Legal Line**: free legal advice sign-up at [legalhelphouston.org](https://legalhelphouston.org) ([hba.org](https://www.hba.org/?pg=Legalline)).
- **Beacon Law** (The Beacon): **713-220-9737** — pro bono for people facing homelessness; covers consumer rights and government benefits ([beaconhomeless.org/beaconlaw](https://www.beaconhomeless.org/beaconlaw)).
- Texas Legal Services Center ([tlsc.org/help](https://www.tlsc.org/help)) helps with public benefits and employment concerns.

---

## G. Chapter 7 bankruptcy for a zero-income filer

### Cost
- **Filing fee: $338** (confirmed current across multiple bankruptcy courts in 2026: N.D. Ohio "Effective Jan 1, 2026"; D. Nevada; D. Montana "Updated 5/11/2026") ([ohnb.uscourts.gov](https://www.ohnb.uscourts.gov/content/filing-fees), [nvb.uscourts.gov](https://www.nvb.uscourts.gov/filing/filing-fees/fee-schedule/)).
- **Fee waiver (Form 103B):** Chapter 7 only; income must be below 150% of poverty guidelines AND the filer unable to pay even in installments; a judge decides. At $0 income the income test is trivially met ([txeb.uscourts.gov](https://www.txeb.uscourts.gov/content/can-filing-fee-ever-be-waived-0)).
- **Installment option (Form 103A):** up to 4 payments within 120 days. Local caveat: W.D. Texas requires at least 50% within 7 days of filing ([txwb.uscourts.gov](https://www.txwb.uscourts.gov/filing-fee-information)).
- **Attorney fees are the real barrier:** typical flat fee ~**$1,000–$2,500** (WalletHub [wallethub.com](https://wallethub.com/edu/d/bankruptcy-costs/25565)); total outlay commonly ~$2,000–$4,000; most attorneys require full payment up front. Pro se (no lawyer) filing is legally possible but error-prone.

### Means test at $0 income
- Official Form 122A-1: if annualized current monthly income is at or below the state median, "There is no presumption of abuse" and Form 122A-2 is not required ([Form 122A-1](https://www.uscourts.gov/sites/default/files/form_b122a-1.pdf)). At $0 he passes automatically. (Note: "current monthly income" is a 6-month lookback average; even so, it would sit far below the Texas 1-person median.)

### Payday loans are dischargeable — with a timing caveat
- General rule: payday loans are **general unsecured nonpriority debts, dischargeable in Chapter 7** absent fraud; the automatic stay (11 U.S.C. § 362) halts collection once filed ([uscourts.gov Chapter 7 basics](https://www.USCOURTS.GOV/court-programs/bankruptcy/bankruptcy-basics/chapter-7-bankruptcy-basics), [Texas Bar disaster manual](https://www.texasbar.com/AM/Template.cfm?Section=Disaster_Resources_for_Attorneys&Template=/CM/ContentDisplay.cfm&ContentID=65336)).
- Timing caveat (confirmed thresholds): 11 U.S.C. § 523(a)(2)(C) creates a *presumption* of nondischargeability for luxury goods/services over **$800** within 90 days before filing, and cash advances over **$1,100** within 70 days before filing (amounts per the Apr 1, 2025 Judicial Conference adjustment). Payday loans are typically not "open-end credit plan" cash advances, so the presumption may not technically apply, but loans taken shortly before filing can draw creditor objections via adversary proceeding — practical guidance: **take no new loans before filing and list every lender on the schedules.**

### Texas exemptions in plain language
- Texas is an **opt-in state**: filers choose federal § 522(d) OR Texas exemptions (must be domiciled in Texas 730 days pre-filing for Texas exemptions) ([statutes.capitol.texas.gov/PR §42](https://statutes.capitol.texas.gov/GetStatute.aspx?Code=PR&Value=42)).
- Texas personal-property aggregate cap: **$50,000 (single adult) / $100,000 (family)**, fair market value, per Tex. Prop. Code § 42.001(a). The § 42.002 list includes home furnishings, **motor vehicles (one per licensed household member — no dollar cap stated)**, tools of trade, clothing, jewelry up to 25% of the cap, two firearms, sporting equipment, pets.
- Excluded from the cap entirely (§ 42.001(b)): **current wages**, professionally prescribed health aids, alimony/support. Retirement accounts protected (§ 42.0021). Texas homestead is unlimited (irrelevant here).
- Practical read: a person with no house, no significant assets, and one car is very likely to keep everything in a Chapter 7 — a classic **"no-asset" case** (trustee files a no-asset report, nothing sold, debts discharged in ~3–4 months).

### Required before filing
- **Credit counseling** from a U.S. Trustee–approved agency within **180 days before filing** (11 U.S.C. §§ 109(h), 111), plus a post-filing debtor-education course for the discharge. Usually ~$25–50 per course, sometimes waivable. Miss it and the case can be dismissed.

### Honest downsides
- Attorney cost is the practical blocker (see above).
- **Credit impact:** Chapter 7 stays on credit reports up to **10 years**; borrowing is affected for years (rebuilding is possible).
- **Not discharged:** domestic support obligations, most student loans (absent "undue hardship," § 523(a)(8)), recent income taxes, debts from fraud, DUI injury/death debts, unlisted debts.
- Bankruptcy is a public filing; case can be dismissed for incomplete schedules or missed steps; every lender must be listed on the schedules or that debt survives.

---

## H. "Judgment proof" in Texas — plain-language explainer

"Judgment proof" is not a legal status or a court finding — it means **a creditor can get a judgment against you and still not collect anything**, because everything you have is protected by law:

- **No wages to garnish.** Texas constitutionally bars garnishing current wages for personal service for consumer debt (art. XVI, § 28). There are no wages here anyway.
- **Only income is exempt.** His only income is Texas unemployment benefits, which are exempt from levy, execution, attachment, and "any other remedy for debt collection" (Labor Code § 207.075(b)) — and the benefits can't be pledged or assigned away (§ 207.075(a)).
- **No reachable assets.** Negative-balance bank accounts have nothing to levy; Texas's generous personal-property exemptions (up to $50k for a single adult, plus a vehicle and tools) shield what little he has.
- **What it does NOT do:** it doesn't stop lawsuits, judgments, or phone harassment; it doesn't erase the debt; interest/fees can keep accruing; and if his finances improve, creditors with valid judgments can act later (judgments in Texas are generally good for 10 years and renewable). It is a shield, not an eraser.

---

## I. What costs money he doesn't have — flagged

- Wells Fargo stop payments: **$30 per order** (potentially multiple, if lenders use multiple originator IDs or if one order doesn't cover varying amounts — unresolved, confirm by phone).
- Bankruptcy attorney: ~$1,000–$2,500 (the fee waiver covers only the $338 court fee, not a lawyer).
- Credit counseling courses: ~$25–50 each (waivers sometimes available).
- **Free:** EFTA revocation (a letter/phone call), OCCC complaint, CFPB complaint, Lone Star Legal Aid, the 4-year SOL defense, and the judgment-proof reality itself.

## J. Open items / flags (not verified — don't guess)

- Whether a single Wells Fargo ACH stop-payment order covers varying amounts from the same originator (unpublished; confirm by phone).
- Whether Wells Fargo will let him close a negative-balance checking account and open a new one.
- Whether Houston's 2013 payday-lending ordinance applies to these specific loans (ordinance text not re-verified; an attorney should check).
- Current CFSA membership of CashNetUSA/Speedy Cash (industry EPP route).
- The CFPB's 2026 enforcement posture — complaint outcome data above is the most recent available.
- Which bank account his TWC benefits flow into and whether they're commingled — matters for the § 207.075(c) exemption on received benefits.

---

### Recommended immediate sequence (no-cost first)

1. **Today:** Call/write each lender revoking ACH authorization (keep copies). Call Wells Fargo (1-800-869-3557): state authorization revoked, place "Stop Future Payment" on each lender, follow up in writing within 14 days.
2. **This week:** Call Lone Star Legal Aid (713-652-0077) about debt defense + the exemption strategy; file an OCCC complaint online ([portal](https://occc.texas.gov/consumers/file-a-complaint)) documenting the debits and any threats.
3. **If lenders threaten criminal charges or wage garnishment over payday debt:** that's bluffing against Texas law (§393.201(c); art. XVI § 28) — document it, report to the OCCC and CFPB.
4. **Only if the bleeding continues despite stops:** evaluate Chapter 7 via a free consult (Legal Aid may route to a bankruptcy attorney; fee waiver available), or close and reopen the bank account.
