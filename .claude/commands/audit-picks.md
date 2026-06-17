---
description: Audit the pick lifecycle state machine
---
Map every state and transition in the pick lifecycle state machine.
Flag: illegal transitions, unreachable/orphaned states, missing terminal handling (win/loss/push/void), and any place a pick can mutate without passing through the state machine.
Check for race conditions on concurrent grade/settle. Read-only; report file:line + proposed fix.
