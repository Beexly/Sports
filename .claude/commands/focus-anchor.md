---
description: Strengthen the "do this first" visual hierarchy
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*)
---
Evaluate the cockpit's visual hierarchy: when the owner opens it, is the single most important action unmistakable within ~2 seconds?
Attention currently competes between the posture medallion (`apps/web/app/cockpit/page.tsx` — `PostureMedallion`, the gate-fill ring), the Decision Queue (`apps/web/app/cockpit/page.tsx`), and the Company pulse (`apps/web/components/cockpit/cockpit-pulse.tsx` — `CockpitPulse`). Propose one clear primary anchor (size, color, position, or motion) and de-emphasize secondary blocks. Recommend with rationale — don't apply.
