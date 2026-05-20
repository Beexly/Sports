# Overnight quarantine

These files/dirs were renamed out of the way during the overnight rebuild
because the sandbox ACL would not let me delete them. They are safe to
remove from your Windows shell:

```cmd
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
rmdir /s /q _overnight_quarantine
```

Contents:
- `node_modules.bad` / `node_modules.partial` — leftover partial installs
- `_speedtest.bad` / `_disktest.bad` — disk-speed measurements
- `index.lock*` — stale git locks that were blocking commits
