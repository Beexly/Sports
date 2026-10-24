# Sandbox-blocker cleanup

Per the memory file `sports-intelligence-os.md`, the workspace has two
sandbox-held files that prevent local `npm install`, `git commit`, and
`npm run build` from running cleanly:

1. `.git/index.lock` (or `.git/index.lock.bak` from a prior session)
2. `node_modules/` is partially populated from an interrupted install

These can't be deleted from inside the Claude sandbox — they have to be
cleared from the Windows host. Below is the one-time PowerShell sequence
that fixes both.

## Run this in PowerShell (not Claude's shell)

```powershell
# 1. Move to the workspace.
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"

# 2. Clear the git index lock (both names — current session may have
#    renamed it to .bak).
Remove-Item -Force -ErrorAction SilentlyContinue ".git\index.lock"
Remove-Item -Force -ErrorAction SilentlyContinue ".git\index.lock.bak"

# 3. Nuke the partial node_modules. `-LiteralPath` avoids globbing
#    weirdness; `-Force` overrides read-only attributes; `-Recurse`
#    walks the directory.
if (Test-Path "node_modules") {
    Remove-Item -LiteralPath "node_modules" -Recurse -Force
}
if (Test-Path "_speedtest") {
    Remove-Item -LiteralPath "_speedtest" -Recurse -Force
}

# 4. Clear apps/web/node_modules too (the monorepo hoists most of it but
#    Next.js sometimes installs a local copy).
if (Test-Path "apps\web\node_modules") {
    Remove-Item -LiteralPath "apps\web\node_modules" -Recurse -Force
}

# 5. Clean npm cache — defensive, doesn't hurt.
npm cache clean --force

# 6. Re-install everything.
npm install

# 7. Generate the Prisma client.
npm run db:generate
```

If step 3 errors with **"The directory is not empty"** or
**"Access to the path is denied"**:

- Close VS Code / your editor — file watchers can hold inodes open.
- Open PowerShell as Administrator and retry.
- If still stuck, run `handle.exe node_modules` (from Sysinternals) to
  see what process has it open.

## After it succeeds

Verify the toolchain works:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

All four should pass. `npm run build` is the slowest (1–3 minutes); the
others run in under 60 seconds.

If any fail, read the first failure carefully. The most common cause
after a fresh install is a Prisma client mismatch — run
`npm run db:generate` and try again.

## Then re-enable git

```powershell
git status                  # should respond, not hang
git checkout -b feature/helm-launch-pass
git add .
git commit -m "feat(launch): brand config, design system v2, marketing surface, launch-prep docs"
git push -u origin feature/helm-launch-pass
```

If `git status` hangs, the index lock came back. Repeat steps 2 and
the rest of the sequence.
