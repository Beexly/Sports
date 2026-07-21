# react-email: Transactional Email Templates for GSN

> Source: `resend/react-email` (MIT, 14k★)
> Purpose: Type-safe, React-based email templates with live browser preview — the rendering layer that n8n routes but cannot produce

## What This Solves

n8n handles email routing and scheduling (welcome drips, win alerts, weekly summaries).
But the emails themselves are raw HTML strings or markdown — brittle, hard to maintain, and not visually consistent.

react-email fills the rendering gap:
- **React components** for email — `<Button>`, `<Section>`, `<Hr>`, `<Image>` that render cross-client
- **Browser preview server** — see exactly how emails look in Outlook, Gmail, Apple Mail before sending
- **TypeScript** — pick data, user data, and subscription tier are typed, not string-interpolated
- **Resend integration** — Resend is the send layer; react-email is the template layer

The split: react-email → HTML string → Resend (via n8n or direct SDK) → user inbox.

## Installation

```bash
# Email template renderer
npm install @react-email/components react-email --workspace=apps/web

# Resend SDK (send layer)
npm install resend --workspace=apps/web

# Or create a dedicated email package in the monorepo:
# mkdir packages/email && cd packages/email
# npm init -y
# npm install @react-email/components react-email resend
```

## Preview Server

```bash
# Start live preview server — http://localhost:3001
npx react-email dev --dir apps/web/src/emails --port 3001
```

This opens a browser with every email template rendered. Click between templates, see
live updates as you edit, no send needed.

## Template Structure

```
apps/web/src/emails/
├── welcome-free.tsx          # Welcome email for FREE tier sign-ups
├── welcome-elite.tsx         # ELITE welcome (richer, immediate value delivery)
├── win-alert.tsx             # High-confidence pick settled WIN
├── weekly-summary.tsx        # Weekly picks record summary
├── elite-day-1.tsx           # ELITE onboarding: Day 1 — how to read confidence scores
├── elite-day-3.tsx           # ELITE onboarding: Day 3 — re-engagement
├── elite-day-7.tsx           # ELITE onboarding: Day 7 — "7 days in" record
└── upgrade-nudge.tsx         # Sent after FREE user hits paywall 3× in one week
```

## Templates

### ELITE Welcome Email

**`apps/web/src/emails/welcome-elite.tsx`**:

```tsx
import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Img, Preview, Section, Text,
} from "@react-email/components";

interface WelcomeEliteProps {
  firstName: string;
  dashboardUrl: string;
  currentRecord?: { wins: number; losses: number; units: number };
}

export function WelcomeEliteEmail({
  firstName,
  dashboardUrl,
  currentRecord,
}: WelcomeEliteProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to ELITE — your edge starts now</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to ELITE, {firstName}.</Heading>

          <Text style={text}>
            You now have access to every pick — including the high-confidence
            plays that our PRO and FREE tiers don't see.
          </Text>

          {currentRecord && (
            <Section style={recordBox}>
              <Text style={recordLabel}>Current season record</Text>
              <Text style={recordValue}>
                {currentRecord.wins}W – {currentRecord.losses}L{" "}
                (+{currentRecord.units.toFixed(1)}u)
              </Text>
            </Section>
          )}

          <Button href={dashboardUrl} style={button}>
            View today's picks →
          </Button>

          <Hr style={hr} />

          <Text style={footer}>
            Galaxy Sports Edge · Unsubscribe
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#0a0a0a", fontFamily: "system-ui, sans-serif" };
const container = { maxWidth: "600px", margin: "0 auto", padding: "40px 20px" };
const h1 = { color: "#ffffff", fontSize: "28px", fontWeight: "700" };
const text = { color: "#a1a1aa", fontSize: "16px", lineHeight: "24px" };
const recordBox = { background: "#18181b", borderRadius: "8px", padding: "20px", margin: "24px 0" };
const recordLabel = { color: "#71717a", fontSize: "12px", textTransform: "uppercase" as const, letterSpacing: "0.1em" };
const recordValue = { color: "#22c55e", fontSize: "32px", fontWeight: "700", margin: "4px 0 0" };
const button = { background: "#eab308", color: "#000000", padding: "12px 24px", borderRadius: "6px", fontWeight: "600", display: "inline-block" };
const hr = { borderColor: "#27272a", margin: "32px 0" };
const footer = { color: "#52525b", fontSize: "12px" };
```

### WIN Alert Email

**`apps/web/src/emails/win-alert.tsx`**:

```tsx
interface WinAlertProps {
  firstName: string;
  pick: {
    selection: string;
    sport: string;
    confidence: number;
    units: number;
  };
  result: {
    finalScore: string;
    unitsWon: number;
  };
}

export function WinAlertEmail({ firstName, pick, result }: WinAlertProps) {
  return (
    <Html>
      <Head />
      <Preview>✓ {pick.selection} WON — +{result.unitsWon}u</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={badge}>WIN</Text>
          <Heading style={h1}>{pick.selection}</Heading>
          <Text style={meta}>
            {pick.sport} · {pick.confidence}% confidence · {pick.units}u play
          </Text>
          <Text style={score}>{result.finalScore}</Text>
          <Text style={profit}>+{result.unitsWon.toFixed(2)} units</Text>
        </Container>
      </Body>
    </Html>
  );
}

const badge = { background: "#166534", color: "#bbf7d0", display: "inline-block", padding: "4px 12px", borderRadius: "9999px", fontSize: "12px", fontWeight: "700" };
const h1 = { color: "#ffffff", fontSize: "32px", fontWeight: "700", margin: "12px 0 4px" };
const meta = { color: "#71717a", fontSize: "14px" };
const score = { color: "#a1a1aa", fontSize: "18px", margin: "16px 0 4px" };
const profit = { color: "#22c55e", fontSize: "40px", fontWeight: "700" };
const main = { backgroundColor: "#0a0a0a" };
const container = { maxWidth: "600px", margin: "0 auto", padding: "40px 20px" };
```

## Sending via Resend

```typescript
// apps/web/src/lib/email.ts
import { Resend } from "resend";
import { render } from "@react-email/render";
import { WelcomeEliteEmail } from "@/emails/welcome-elite";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeElite(user: {
  email: string;
  firstName: string;
  id: string;
}) {
  const html = await render(
    <WelcomeEliteEmail
      firstName={user.firstName}
      dashboardUrl={`${process.env.NEXTAUTH_URL}/picks`}
    />
  );

  await resend.emails.send({
    from: "GSN <picks@galaxy-sports.com>",
    to: user.email,
    subject: "Welcome to ELITE — your edge starts now",
    html,
  });
}
```

## Wiring to n8n + Stripe Webhooks

n8n still orchestrates timing and routing. But instead of n8n rendering HTML,
it calls the GSN API which renders via react-email:

```typescript
// apps/web/src/app/api/internal/send-email/route.ts
import { sendWelcomeElite } from "@/lib/email";
import { sendWinAlert } from "@/lib/email";

const EMAIL_HANDLERS = {
  "welcome-elite": sendWelcomeElite,
  "win-alert": sendWinAlert,
};

export async function POST(req: Request) {
  const { template, data } = await req.json();

  // Verify internal call (n8n webhook secret)
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_EMAIL_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const handler = EMAIL_HANDLERS[template as keyof typeof EMAIL_HANDLERS];
  if (!handler) return Response.json({ error: "Unknown template" }, { status: 400 });

  await handler(data);
  return Response.json({ sent: true });
}
```

n8n calls `POST /api/internal/send-email` with `{ template: "welcome-elite", data: { email, firstName } }`.

## Direct Stripe Webhook Integration

For subscription events, skip n8n entirely and send directly:

```typescript
// In Stripe webhook handler (apps/web/src/app/api/webhooks/stripe/route.ts):
case "customer.subscription.created":
  const user = await db.user.findUniqueOrThrow({
    where: { stripeCustomerId: subscription.customer as string },
  });
  const tier = subscription.items.data[0]?.price?.nickname;

  if (tier === "ELITE") {
    await sendWelcomeElite({
      email: user.email!,
      firstName: user.name?.split(" ")[0] ?? "there",
      id: user.id,
    });
  }
  break;
```

## Environment Variables

```bash
RESEND_API_KEY=re_...           # From resend.com dashboard
INTERNAL_EMAIL_SECRET=...       # Random secret for n8n → GSN API calls
```

## What This Does NOT Cover

- Email routing and scheduling → n8n (`N8N-WORKFLOW-AUTOMATION.md`)
- Email deliverability / SPF / DKIM setup → configure in Resend + domain DNS
- SMS / push notifications → separate integration (Expo Push / Pushover)

## Status

- [ ] `npm install @react-email/components react-email resend --workspace=apps/web`
- [ ] Create `apps/web/src/emails/` directory
- [ ] Build `welcome-elite.tsx`, `win-alert.tsx`, `weekly-summary.tsx`, `upgrade-nudge.tsx`
- [ ] Run preview: `npx react-email dev --dir apps/web/src/emails`
- [ ] Add `RESEND_API_KEY` to Vercel env
- [ ] Build `sendWelcomeElite()` in `apps/web/src/lib/email.ts`
- [ ] Wire to Stripe webhook handler (`subscription.created` → `sendWelcomeElite`)
- [ ] Wire WIN alerts: `settle-sport.ts` confidence ≥ 75% + WIN → `sendWinAlert`
- [ ] Add internal `/api/internal/send-email` route for n8n → react-email bridge
- [ ] Test all templates in preview server before sending to real users
