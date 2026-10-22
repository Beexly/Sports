# Zenoti + Harmonyze + n8n: Complete Project Brief

## Version: 1.0
## Date: August 20, 2026
## Status: Ready for Development

---

## 1. EXECUTIVE SUMMARY

**The Stakeholder:** The user's mother owns a Massage Heights franchise location. She currently uses Zenoti (corporate-mandated) and needs a system to manage daily operational checklists, assign recurring tasks to her team, and integrate everything with Outlook.

**The Core Tension:** Corporate controls the Zenoti instance. API access may or may not be granted. This requires an architecture that works in both scenarios.

**The Strategic Answer:**
- **Zenoti** stays as the system of record (non-negotiable).
- **Harmonyze** provides AI-powered performance coaching and analytics on top of Zenoti data.
- **n8n** (self-hosted) serves as the automation engine that pulls data from Zenoti (via API or email workaround) and creates tasks/checklists in Outlook.
- **The GitHub repos** (identified below) provide production-proven code for building the Zenoti → n8n → Outlook pipeline.

**End State:** A custom automation layer that runs daily operations without relying on corporate-controlled features, with a fallback if API access is denied.

---

## 2. BUSINESS CONTEXT & PROBLEM DEFINITION

### 2.1 The Business
- **Brand:** Massage Heights — 171 locations across the US
- **Business Model:** Membership-based massage therapy franchise
- **Growth Trajectory:** "Anticipates doubling our size in the next several years"
- **Key Metric:** Achieved **58% growth in online bookings** within six months of using Zenoti

### 2.2 The Stakeholder's Role
- Owns a **single franchise location**
- Operates within corporate-controlled systems
- Needs local operational efficiency while corporate manages the broader brand

### 2.3 The Core Pain Points
1. **Daily Operations:** No streamlined way to create and assign daily checklists (opening/closing procedures, room prep, cleaning tasks)
2. **Team Coordination:** No system for assigning recurring tasks to specific therapists and front-desk staff
3. **Outlook Integration:** Staff already use Outlook; tasks need to appear there without manual data entry
4. **Corporate Control:** Cannot modify Zenoti or guarantee API access

### 2.4 The User's Explicit Requirements
- "Not too complex, not too basic"
- Checklist system for daily operations
- Recurring task assignment to team members
- Outlook integration
- Free if possible, but open to paid options
- Open-source preferred

---

## 3. THE SYSTEMS LANDSCAPE

### 3.1 Zenoti — The System of Record

Zenoti is an AI-powered, all-in-one cloud management platform for the beauty, wellness, and fitness industries. For Massage Heights, it centralizes data across 171 locations.

#### What Zenoti Already Does (Native Features)

| Feature | Description | Relevance |
|---------|-------------|-----------|
| **Work Tasks** | Native checklist system where employees check-in/check-out of tasks | Directly solves the checklist problem — likely unused |
| **Employee Work Tasks** | Can be configured at organization level; employees track action items related to guests | Can auto-create tasks for no-shows/cancellations |
| **Calendar Sync** | One-way sync from Zenoti → Outlook (last 3 days + today + next 10 days) | Provides visibility but not automation |
| **AI Workforce** | AI Receptionist, AI Scribe, AI Concierge, AI Lead Manager, AI Inventory Manager | May require specific plan tier; check availability |
| **Reporting** | Appointment Summary, Sales Accrual, utilization reports | Data source for automation |
| **Zapier Integration** | Official integration; requires "API and Webhooks subscription" | Potential automation path |

#### How to Enable Work Tasks
1. Organization level → Configurations → **Enable work tasks**
2. Organization level → Configurations → **Work Task Types** → Add tasks
3. Employee profiles → General tab → Job Info → **Select Employee Work Tasks**

#### How to Enable Calendar Sync
1. Admin enables at organization level
2. Employees copy calendar URL into Outlook

#### How to Check API Access
1. Admin → Setup → Apps
2. Look for "Backend App" — if visible, API keys can be generated
3. If not visible, contact Zenoti CSM for "API and Webhooks subscription"

#### The Massage Heights Context
Massage Heights chose Zenoti specifically for scalability. Corporate has already invested in the ecosystem, making replacement unlikely.

#### Critical Constraint
**Zenoti is corporate-controlled.** The stakeholder cannot:
- Change settings that affect other locations
- Guarantee API access
- Install custom integrations without corporate approval

---

### 3.2 Harmonyze — The Performance Coaching Layer

**Harmonyze is NOT a replacement for Zenoti.** It is a complementary AI coaching platform that sits on top of existing systems.

| Attribute | Detail |
|-----------|--------|
| **What It Is** | AI-driven performance and coaching platform for franchise and multi-location brands |
| **Target Users** | Franchise Business Coaches (FBCs), operators, and brand leaders |
| **How It Works** | Evaluates data across POS, CRM, and operational tools to surface specific, context-aware coaching recommendations |
| **Key Benefit** | Reduces coach prep time by over 80%; responds to issues up to 6x faster |
| **Proven Results** | Heights Wellness Retreat (formerly Massage Heights) saw **5%+ lift in same-store sales** |
| **Integrations** | Connects to 200+ systems including Zenoti |
| **Deployment** | Enterprise SaaS — closed source, no self-hosting |
| **Website** | https://www.harmonyze.com/ |

**What Harmonyze Does NOT Do:**
- Create daily checklists
- Assign tasks to staff
- Sync with Outlook
- Replace operational systems

**Strategic Role:** Harmonyze tells the stakeholder *what* to fix (performance insights). The n8n automation layer handles *how* to run daily operations.

---

### 3.3 Microsoft 365 / Outlook — The Target Destination
- Staff already use Outlook
- Tasks need to appear in Outlook/To Do
- n8n has native Microsoft Outlook nodes

---

## 4. THE API CHALLENGE

### 4.1 Scenario A: Corporate Grants API Access (Best Case)
- Zenoti's API and Webhooks subscription is enabled
- Stakeholder can generate API keys (Admin → Setup → Apps → Backend App)
- **Note:** API keys expire every 12 months — plan for annual renewal

### 4.2 Scenario B: Corporate Denies API Access (Likely)
- No direct API access
- Must work with data Zenoti already outputs

**The Workaround:** Zenoti can email scheduled reports as CSV attachments. This is a **production-proven** pattern used by Evolve Med Spa (13 locations).

---

## 5. THE OPEN SOURCE ARSENAL (THE 88 REPOS — FILTERED)

From the 88 repositories identified in research, these are the actionable gems:

### 5.1 The n8n Connector
**Repo:** `n8n-code/n8n-nodes-zenoti`
- **What:** Dedicated n8n node for Zenoti
- **Why:** Gives n8n native superpowers to talk to Zenoti
- **Contains:** OpenAPI/Swagger spec and authentication patterns
- **Action:** Install this node into n8n instance

### 5.2 The Production "No-API" Blueprint
**Repos:** `evolvemedspa-sa/zenoti-download-reports` and `zenoti-ingestion-msql`
- **What:** Production-level Python code that automates Zenoti report downloads **without using the official API**
- **How:** Handles authenticated session, email detection, CSV parsing
- **Proven:** Live production system at Evolve Med Spa
- **Action:** Fork this; use its authentication logic to pull daily appointment CSVs

### 5.3 The NodeJS SDK
**Repo:** `LiftOffLLC/zenoti-sdk`
- **What:** NodeJS wrapper around Zenoti APIs
- **Why:** If API access is granted, this saves weeks of reading Zenoti docs
- **Action:** Use if API access is confirmed

### 5.4 The AI Agent Connector
**Repo:** `tacit-code/zenoti-mcp-server`
- **What:** Model Context Protocol (MCP) server for AI agents to query Zenoti
- **Exposes:** Guests, appointments, bookings, invoices to AI clients
- **Use Case:** Future AI integration — staff could ask a chatbot "What's on today's checklist?"
- **Action:** Keep for Phase 3

### 5.5 The ERP Integration
**Repo:** `frappe/ecommerce_integrations`
- **What:** Official ERPNext integration app that connects to Zenoti
- **Contains:** Battle-tested Zenoti API code (Python)
- **Use Case:** Can extract the Zenoti client logic for your own use
- **Action:** Reference for authentication patterns

### 5.6 The Selenium Backup
**Repo:** `akhildhar/Data-scrap-of-4-year-report`
- **What:** Selenium automation that logs into Zenoti and exports reports
- **Use Case:** Backup if email reports fail
- **Warning:** Fragile — Zenoti UI changes can break it

### 5.7 The Zapier App (Reference)
**Repo:** `dilawar30800/Zenoti-zapier-app`
- **What:** JavaScript implementation of Zenoti Zapier app
- **Use Case:** Reference for understanding Zenoti's API patterns

---

## 6. THE "NO-API" WORKAROUND — DETAILED

### 6.1 How It Works