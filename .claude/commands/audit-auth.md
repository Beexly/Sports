---
description: NextAuth / session / RBAC audit
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*)
---
Audit authn/authz. Find: API routes and server actions missing session checks, client-side-only gating, role checks that can be bypassed, and any token/secret reachable from the client bundle.
List each gap with file:line and the minimal server-side fix. Read-only.
