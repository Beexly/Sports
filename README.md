# Sports Prediction Platform

Production-grade sports picks platform: real odds ingestion, AI-assisted ranking,
subscription paywalls, content generation, and automated job scheduling.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture and engineering rules.

---

## Local setup

You only need three things on your machine:

| Tool | Min version | Notes |
|---|---|---|
| Node.js | 20.x | https://nodejs.org |
| npm | 10.x | bundled with Node 20 |
| Docker | latest | Docker Desktop on Windows/macOS, Docker Engine on Linux. Must be **running** before you start. |

The setup script handles everything else (env files, Postgres, Redis, npm
install, Prisma generate + push).

### Windows (Command Prompt)

```cmd
git clone https://github.com/Beexly/Sports.git
cd Sports
scripts\setup.cmd
```

### Windows (PowerShell)

```powershell
git clone https://github.com/Beexly/Sports.git
cd Sports
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

### macOS / Linux / WSL

```bash
git clone https://github.com/Beexly/Sports.git
cd Sports
bash scripts/setup.sh
```

> **Pasting tip (Windows cmd.exe):** if you paste a multi-line block into the
> Command Prompt, paste it **one line at a time**. cmd.exe sometimes strips the
> newline between lines, producing garbage like `cd Sportsgit clone ...`.
> PowerShell and Windows Terminal handle multi-line pastes correctly.

### What the script does

1. Verifies Node 20+, npm, and a running Docker daemon.
2. Copies `.env.example` to `.env` (repo root, used by Prisma) and
   `apps/web/.env.local` (used by Next.js). Existing files are **not**
   overwritten.
3. Aligns `DATABASE_URL` and `DIRECT_URL` with the docker-compose Postgres
   credentials.
4. Generates a secure `NEXTAUTH_SECRET` if the placeholder is still in place.
5. Starts `postgres` and `redis` containers via
   `docker/docker-compose.yml`.
6. Waits for Postgres to accept connections.
7. Runs `npm install`, then `prisma generate` and `prisma db push`.

### After setup

Fill in the API keys you actually need in **both** `.env` and
`apps/web/.env.local`:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — NextAuth Google login
- `STRIPE_*` — billing
- `THE_ODDS_API_KEY` — live odds ingestion
- `ANTHROPIC_API_KEY` — content generation

Then start the dev server:

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Common commands

```bash
npm run dev            # start Next.js dev server
npm run build          # production build
npm run start          # run the built app

npm run test           # run all workspace tests
npm run typecheck      # tsc --noEmit across workspaces
npm run lint           # eslint across workspaces

npm run db:generate    # prisma generate
npm run db:push        # push schema to Postgres
npm run db:migrate     # run migrations
npm run db:seed        # seed data
npm run db:studio      # open Prisma Studio
```

Stop the local Postgres + Redis:

```bash
docker compose -f docker/docker-compose.yml down
```

---

## Troubleshooting

**`bash: scripts/local.sh: No such file or directory`**
The script is `scripts/setup.sh`, not `scripts/local.sh`. (An earlier
iteration referenced `local.sh`; that file was never committed.)

**`WSL ... execvpe(/bin/bash) failed: No such file or directory`**
You ran `bash ...` from cmd.exe but WSL is not installed (or is broken). On
Windows use `scripts\setup.cmd` (cmd) or
`powershell -ExecutionPolicy Bypass -File scripts\setup.ps1` (PowerShell)
instead of bash.

**`Cannot connect to the Docker daemon`**
Open Docker Desktop and wait for it to finish starting, then re-run the setup
script.

**`fatal: destination path 'Sports' already exists and is not an empty directory`**
You already cloned the repo. Just `cd Sports` and run the setup script.

**Prisma can't find `DATABASE_URL`**
Make sure both `.env` (repo root) and `apps/web/.env.local` exist. The setup
script creates both — if you only have one, copy `.env.example` to the missing
location.
