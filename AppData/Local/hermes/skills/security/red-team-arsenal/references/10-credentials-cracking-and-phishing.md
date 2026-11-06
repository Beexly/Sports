# 10 — Credentials: Cracking and Phishing

> Scope: offline cracking (hashcat/John), NTLM/Kerberos capture→crack, spraying, AitM phishing.
  Facts via `gh api`; speeds/spray maths labelled. Nothing invented — gaps are `UNVERIFIED`.
  File:line citations are from the GitHub repos below.

## Tool inventory (`gh api repos/O/R`)
| Tool | Stars | License | Pushed | Role |
|---|---|---|---|---|
| hashcat/hashcat | 27,276 | MIT `docs/license.txt:1` | 2026-11-06 | GPU recovery |
| openwall/john | 13,875 | GPL-2.0-or-later `LICENSE` | 2026-11-04 | CPU cracking |
| kgretzky/evilginx2 | 15,834 | BSD-3-Clause | 2026-06-10 | AitM proxy |
| gophish/gophish | 14,394 | NOASSERTION | 2024-09-23 | Email campaigns |
| GSRHaX/NGL-Phish | 113 | none | 2026-06-23 | IG lure |
| knavesec/CredMaster | 1,299 | MIT | 2025-03-19 | Spraying |
| danielmiessler/SecLists | 74,577 | MIT | 2026-11-06 | Wordlists |

---

## hashcat / hashcat
**What.** GPU rule/mask/brute-force recovery; one kernel per mode in `src/modules/module_*.c`. Mode
  table is `docs/hashcat-example-hashes.md` (no `docs/hashcat-modes`; `docs/hashcat-table.md` is
  Table Attack `-a 5`). **Install.** Clone + `make`; `hashcat -I` for OpenCL/CUDA. **Surface.**
  `module_00100.c:21 "SHA1"`, `module_01000.c:21 "NTLM"`, `module_03200.c:21 "bcrypt $2*$"`,
  `module_05600.c:23 "NetNTLMv2"`, `module_13100.c:22 "Kerberos 5, etype 23, TGS-REP"`,
  `module_18200.c:22 "Kerberos 5, etype 23, AS-REP"`. Attack modes `include/types.h:415-430`: `0
  Straight, 1 Combination, 3 Brute-force, 6 Hybrid Wordlist+Mask, 7 Hybrid Mask+Wordlist` (+4/5/8,
  `docs/hashcat-help.md:205-211`). Flags `include/options.def`: `-m :72`, `-a :18`, `-r/--rules-file
  :126` (singular `--rule-file` does not exist), `-O :106`, `-w :149`, `--session :132`, `--restore
  :123`, `--potfile-path :115`; `src/user_options.c:351-478`. `-w` is a compat no-op
  (`src/user_options.c:452`, `:447-450`). **Recipes.** §Hash identification…–§NetNTLM…; `hashcat
  --identify` or `hashid`. **Detection.** Offline only: `.potfile`/`.restore`, rule files, GPU load.
  **Limits.** Some modes need `--username`; `-O` raises memory; speeds algorithm-bound. **License.**
  MIT (`docs/license.txt:1`, `include/options.def:2`).

## openwall / john
**What.** CPU cracker, 372 `src/*_fmt[_plug].c` formats, 115 `*2john` converters in `run/`.
  **Install.** Clone openwall/john, build `src/`, run `run/`; exact flags `UNVERIFIED`
  (`doc/INSTALL`). **Surface.** `run/john.conf:607 [Disabled:Formats]`, `:611 [Formats:7z]`,
  `doc/OPTIONS:482 --format=NAME` (wildcards, `dynamic/cpu/omp/opencl/ztex/all`, `@tag/#tag`,
  `-/+`), `doc/SHOW_FORMATS.md:1 --show=formats`, `src/listconf.c:592-634 --list=formats`,
  `src/formats.c:41 fmt_list`, `:452 fmt_register()`. Modes `src/options.c:71 single, 81 wordlist,
  110 rules, 113 incremental, 122 mask, 162 format`. Incremental `src/charset.c:628
  charset_generate_all()`; mask `src/mask.c:41 parsed_mask`, config `run/john.conf:686 [Mask]`,
  `doc/MASK:1 (?l?u?d?s?a?B?h?H?L?U?D?S?A, ?1-?9, ?w/?W)`; rules `src/rules.c:546
  rules_init_stack()`, `doc/RULES:1`. `run/john.conf` (4,415 lines): Incremental ×15 `:1357-1449`
  (Custom,UTF8,Latin1,ASCII,LM_ASCII,LanMan,Alnumspace,Alnum,Alpha,LowerNum,UpperNum,LowerSpace,Lower,Upper,Digits);
  Rules ×40 `:747+`
  (None,Drop,JumboSingle,Single,Extra,Wordlist,Policy,NT,ShiftToggle,Multiword,Phrase*,best64,d3ad0ne,OneRuleToRuleThemAll/Still,Loopback,Jumbo,All);
  Mask `:686`, UserClasses `:681`, Subsets `:709`; `[List.External:*]:1775+`. Converters 115 incl.
  `krb2john.py, kirbi2john.py, hccapx2john.py, pcap2john.py, ssh2john.py, office2john.py,
  pdf2john.py, pdf2john.pl, bitlocker2john.py, luks2john.py, 7z2john.pl, keepass2john.py` (full list
  `run/`). **Recipes.** `--show=formats`; `--incremental=ASCII`; `--mask='?l?l?l?d?d?d?d'`;
  `--wordlist=… --rules=best64`; convert first (`python3 krb2john.py … > h.txt`). **Detection.**
  Offline: `.pot, john.log, *.chr`, wordfiles. **Limits.** CPU 1–2 orders below GPU; default when no
  hashcat module. **License.** GPL-2.0-or-later (+OpenSSL exp.).

## kgretzky / evilginx2
**What.** Go AitM proxy (BSD-3-Clause): rewrites target pages, captures credentials **and** session
  cookies → MFA bypass via post-auth session. **Install.** Release binary or `go build`; needs
  public IP, DNS, valid TLS (Let's Encrypt) per `proxy_hosts` domain; release steps `UNVERIFIED`.
  **Surface — phishlet schema `core/phishlet.go`.** `Phishlet :108-134
  {Name,ParentName,Path,Author,Version,RedirectUrl,minVersion,proxyHosts,subfilters,cookie/body/httpAuthTokens,username/password
  PostField,login,js_inject,intercept,forcePost,custom}`; `ConfigPhishlet :221-235
  {name,redirect_url,params,proxy_hosts,sub_filters,auth_tokens,auth_urls,credentials,force_post,landing_path,login,js_inject,intercept}`;
  `ConfigProxyHost :142-149 {phish_sub,orig_sub,domain,session,is_landing,auto_filter}`;
  `ConfigSubFilter :151-160
  {triggers_on,orig_sub,domain,search,replace,mimes,redirect_only,with_params}`; `ConfigAuthToken
  :162-170 {domain,keys,type cookie|body|http,path,name,search,header}` (`CookieAuthToken :34,
  BodyAuthToken :43, HttpAuthToken :50`); `ConfigCredentials :178-182` + `ConfigPostField :172-176
  {key,search,type post|json}` default `post :624-630`; validation `:378-390` requires
  proxy_hosts/auth_tokens/credentials/user/pass. Loader `LoadFromFile :271` — **filename is the
  name** (`:283`), `Author :286`, `RedirectUrl :287`. Example `phishlets/example.yaml:1-20`. Lures
  `core/config.go:17-31
  Lure{Id,Hostname,Path,RedirectUrl,Phishlet,Redirector,UserAgentFilter,Info,OgTitle/OgDescription/OgImageUrl/OgUrl,PausedUntil}`,
  `PhishletConfig :39-44`, `Config :79-94`, `AddLure :682, SetLure :689, GetLure :733, GetLureByPath
  :741, GetPhishlet :757, AddPhishlet :558`; session `core/session.go:9-31
  {Username,Password,PhishLure}`, `database/db_session.go:13,30`; Gophish bridge
  `core/gophish.go:12-21,54-75` → `/api/results/{rid}/open`; `GetLureUrl :779, GetLoginUrl :794`.
  **Recipes.** §AitM phishlet engineering. **Detection.** §Detection artifacts. **Limits.** DNS/TLS
  control required; cert-pinning/IP-bound sessions defeat it. **License.** BSD-3-Clause.

## gophish / gophish
**What.** Email campaign manager (Go, 14,394★, pushed 2024-09-23, maintenance-mode): templates,
  landing pages, sending profiles, groups, results. Auth `X-Gophish-API-Key`. **Install.** Release
  binary + `config.json`; defaults/ports `UNVERIFIED` (README). **Surface — models.** `Campaign
  models/campaign.go:15-34
  {Id,UserId,Name,Created/Launch/SendBy/CompletedDate,TemplateId/Template,PageId/Page,Status,Results,Groups,Events,SMTPId/SMTP,URL}`,
  `PostCampaign :452, GetCampaign :398, DeleteCampaign :613, CompleteCampaign :643`; `Template
  models/template.go:13-22
  {Id,UserId,Name,EnvelopeSender,Subject,Text,HTML,ModifiedDate,Attachments}`, `PostTemplate :124,
  PutTemplate :149`; `LandingPage=Page models/page.go:13-21
  {Id,UserId,Name,HTML,CaptureCredentials,CapturePasswords,RedirectURL,ModifiedDate}`, `PostPage
  :123`; `SMTP models/smtp.go:34-45
  {Id,UserId,Interface,Name,Host,Username,Password,FromAddress,IgnoreCertErrors,Headers[]Header:50,ModifiedDate}`,
  `PostSMTP :191, PutSMTP :216`; `Group models/group.go:16-21
  {Id,UserId,Name,ModifiedDate,Targets[]Target}`, `Target :48, BaseRecipient :55-59
  {Email,FirstName,LastName,Position}`, `PostGroup :194`. **API v1 only — no `api/v2`** (tree grep):
  `controllers/api/server.go:55-90 registerRoutes`, prefix `/api/ :58`, credentials `:59` —
  `/campaigns/ :64`, `/campaigns/{id} :66`, `/campaigns/{id}/results :67`, `/groups/ :70`,
  `/templates/ :74-75`, `/pages/ :76-77`, `/smtp/ :78-79`, `/users/ :80-81`, `/webhooks/ :86-88`,
  `/imap/ :61-62`, `/import/* :83-85`, `/util/send_test_email :82`, mounted
  `controllers/route.go:145`; handlers `api/campaign.go:17,64`. **Recipes.** §Gophish campaign ops.
  **Detection.** §Detection artifacts. **Limits.** No built-in AitM (pair evilginx2 via
  `core/gophish.go`). **License.** NOASSERTION in API — confirm upstream.

## GSRHaX / NGL-Phish
**What.** Small social-phishing kit (113★, JavaScript, no license): Instagram credential lure
  cloaked as NGL anonymous-questions app. **Repo has no backend/config code** — tree `README.md,
  traction.js` (hashtag comment block, no logic), `imgs/`. **Install.** None in-repo; flow hosted
  externally at `https://ngliink.web.app/signup.html` per README; self-hosting `UNVERIFIED`.
  **Surface/flow (README).** Operator enters IG username → sets profile pic → copies lure → IG Story
  + link sticker “NGL.LINK” → victim lands on fake IG login. Prior names
  `GSRHaX/NGL-Not-Good-Links`, `NGL-Nefariously-Generated-Links`; commits README-only (`3664c88`,
  2026-06-23). **Recipes.** Story sticker + bio link is the whole surface. **Detection.** Lookalike
  login domain, domain age/TLS, missing reputation. **Limits.** IG-only, no in-repo payload, not a
  general AitM. **License.** None.

## knavesec / CredMaster
**What.** Provider password spraying (MIT, 1,299★, “uses FireProx APIs to rotate IP addresses”).
  **No `creds.py`** — file is `credmaster.py` (769 lines). **AWS is FireProx infra, not a target
  plugin; no Citrix plugin.** **Install.** Deps `UNVERIFIED`; `python3 credmaster.py --plugin <p> -f
  users.txt -a passwords.txt`; `config.json`; AWS creds for FireProx. **Surface.** Plugins dynamic
  `importlib.import_module(f"plugins.{self.plugin}") :237`, auth `:513`; `plugins/: adfs, azuresso,
  azvault, ews, fortinetvpn, gmailenum, httpbrute, httppost, msgraph, msol, o365enum, okta, owa,
  pingfed, template/`; plus `config.json, passwords.txt, users.txt, useragents.txt,
  utils/{fire,notify,ntlmdecode,utils}.py`. **Proxy rotation:** `utils/fire.py` FireProx (boto3
  `apigateway`, retries=10) per-region passthroughs; `credmaster.py:386-410 load_apis/create_api`
  one API per region/thread (cap `len(regions) :388-390`), Swagger maps
  `X-My-X-Forwarded-For→X-Forwarded-For, X-My-Authorization→Authorization,
  X-My-X-Amzn-Trace-Id→X-Amzn-Trace-Id`; `spray_thread :510-538` via `api[proxy_url]`,
  `random.choice(useragents) :617`, random XFF — fresh egress IP per attempt. **Evasion flags**
  (arg-def lines): `--plugin :719`, `-u/-p/-f/-a :720-723`, `--config :724`, `-t/--threads :728`
  (max 15), `--region :729`, `-j/--jitter :730, -m/--jitter_min :731` (`:533-536`), `-d/--delay
  :732, --passwordsperdelay :733` (`:343-362`), `--batch_size :734, --batch_delay :735`
  (`:255-257,:525-527`), `-r/--randomize :736` (`:576-600`), `--header :737`, `--xforwardedfor
  :738`, `--weekday_warrior :739` (`:312-326,:628-671`), `--color :740, --trim :741`, AWS
  `--profile_name/--access_key/--secret_access_key/--session_token :756-760`,
  `--clean/--api_list/--api_destroy :763-765`. **Recipes.** §Provider spray via CredMaster.
  **Detection.** §Detection artifacts. **Limits.** Per-account lockout still applies; AWS spend;
  plugins brittle to IdP changes. **License.** MIT.

## danielmiessler / SecLists (passwords + usernames + rule sections only)
**What.** Curated wordlist corpus (74,577★, MIT). **No `Rules/` directory** — rules/grep content is
  `Pattern-Matching/` plus `Passwords/Permutations/`, `Passwords/Keyboard-Walks/`. **Install.**
  Clone; reference paths. **Surface.** `Passwords/` (~700 files): `Books/, Common-Credentials/
  (+Language-Specific/), Cracked-Hashes/, Default-Credentials/ (+Routers/, ~300
  *_default-{users,passwords}), Honeypot-Captures/, Keyboard-Walks/, Leaked-Databases/ (rockyou
  variants), Malware/, PHP-Hashes/{Floating-Comp,Pre-Hashed,Truncated,Plaintext}/, Permutations/,
  Software/, WiFi-WPA/, Wikipedia/`; root e.g. `corporate_passwords.txt, days.txt, months.txt,
  seasons.txt, clarkson-university-82.txt`. `Usernames/`: `Names/ (familynames-usa-top1000.txt,
  femalenames-usa-top1000.txt, malenames-usa-top1000.txt, forenames-india-top1000.txt, names.txt,
  names-brazil-top100000.txt)`, `Honeypot-Captures/`, root `cirt-default-usernames.txt,
  sap-default-usernames.txt, top-usernames-shortlist.txt, mssql-usernames-nansh0u-guardicore.txt,
  CommonAdminBase64.txt, xato-net-10-million-usernames.txt (+-dup)`. `Pattern-Matching/`:
  `grepstrings-basic.txt, grepstrings-auditing-php.md, errors.txt, dangerous-functions-angular.txt,
  malicious.txt, php-magic-hashes.txt, repo-scan.txt, thickclient-basic.txt, pcap-strings.txt,
  Source-Code-(PHP)/`. **Recipes.** §Wordlist and rule engineering. **Detection.** Honeypot lists
  are watched — noisy to use. **Limits.** Corpus, not a cracker. **License.** MIT.

---

## Hash identification and mode map
Identify first: `hashcat --identify <hash>` (vs `docs/hashcat-example-hashes.md`) or `hashid
  <hash>`; John `john --list=formats` / `--format=<name>` (`doc/OPTIONS:482`,
  `src/listconf.c:592-634`); converted formats via `run/*2john` first (§john). 25 types → mode →
  **indicative RTX-4090 speed: public benchmark-class H/s, not exact** (driver, `-O`, temperature,
  salt count move it 2–5×; speeds `UNVERIFIED` against repo — hashcat ships no per-GPU table in
  files read):

| Hash | Mode | 4090 (UNVERIFIED) | Hash | Mode | 4090 |
|---|---|---|---|---|---|
| MD5 | 0 | ~110 GH/s | NetNTLMv2 | 5600 | ~75 GH/s |
| MD5(salt) | 10 | ~55 GH/s | NetNTLMv2 server | 26800 | ~70 |
| SHA-1 | 100 | ~45 | Krb TGS etype23 | 13100 | ~60 |
| SHA1-HMAC | 1450 | ~40 | Krb AS-REP etype23 | 18200 | ~60 |
| SHA-256 | 7400 | ~21 | Krb AES128 | 17600 | ~3 |
| SHA-512 | 9300 | ~8.5 | Krb AES256 | 17700 | ~1.5 |
| SHA3-256 | 17400 | ~30 | bcrypt | 3200 | ~150 kH/s |
| NTLM | 1000 | ~95 | scrypt | 8900 | ~1.5 MH/s |
| LM | 3000 | ~95 | PBKDF2-SHA512 | 10900 | ~2 MH/s |
| NetNTLMv1 | 5500 | ~90 | PBKDF2-SHA1 | 12000 | ~8 MH/s |
| MySQL 4.1 | 300 | ~40 | MSSQL 2012+ | 1731 | ~15 |
| Cisco MD5 | 500 | ~25 | WPA2/3 EAPOL | 22000 | ~3 MH/s |
| Argon2 | UNVERIFIED* | memory-hard | — | — | — |

*Verify Argon2 mode in `docs/hashcat-example-hashes.md` before scripting (not line-read here).
  Missing mode in `src/modules/` → John jumbo. Memory-hard (bcrypt/scrypt/Argon2): dictionary only.

## Cracking strategy ladder
Stop at first rung that cracks; escalate only on failure. 1 **Dictionary** `hashcat -m 1000 -a 0
  h.txt rockyou.txt`. 2 **best64 / OneRuleToRuleThemAll** `-r rules/best64.rule` then `-r
  rules/OneRuleToRuleThemAll.rule` (John `run/john.conf:1239+ [List.Rules:best64]`, `:1295+
  [List.Rules:OneRuleToRuleThemAll]`; chain both). 3 **Hybrid `-a 6`/`-a 7`** (`types.h:423-424`):
  `-a 6 wordlist.txt '?d?d?d?d'`, `-a 7 '?u?l?l?l' wordlist.txt`. 4 **Mask `-a 3`**: `?l?l?l?l?d?d`
  — small keyspaces/known policy only (John `doc/MASK:1`, `run/john.conf:686`). 5 **PRINCE `-a 8`**
  (Generic, weighted candidates; support `UNVERIFIED` here). 6 **Targeted rules from policy**
  (§Wordlist…; highest value). Chain cheapest-first; `--session/--restore` between rungs
  (`options.def:123,132`; `src/user_options.c:351,411`). John ladder: `--wordlist` →
  `--rules=best64` → `--rules=OneRuleToRuleThemAll` → `--incremental=ASCII` (`run/john.conf:1374`) →
  `--mask`.

## Wordlist and rule engineering
**SecLists taxonomy (§SecLists).** Provenance first: `Passwords/Leaked-Databases/` (rockyou) +
  `Common-Credentials/` → `Permutations/` + `Keyboard-Walks/` → `corporate_passwords.txt`,
  `days.txt`, `months.txt`, `seasons.txt`. Usernames `Usernames/top-usernames-shortlist.txt` →
  `Names/*top1000` → `xato-net-10-million-usernames.txt` only for enumeration.
  `Pattern-Matching/grepstrings-basic.txt` etc. is target-side grepping, not cracker input. **Rule
  chaining.** `-r best64.rule -r OneRuleToRuleThemAll.rule -r <targeted>.rule`; each `-r` multiplies
  — cheapest first, `--restore` between rungs. **Mangling by observed policy.** Digit-required →
  `append $1…$9`; symbol → `append $!,$@`; banned roots → leetspeak; seasonal → `season+year`.
  Template: John `run/john.conf:979 [List.Rules:Policy]`. **Hostname-based wordlists from recon.**
  Build from org/product/city/executives/codenames (DNS/WHOIS/LinkedIn) + years/seasons; feed before
  generic corpus. No generator in the seven repos — workflow, not a tool claim.

## NetNTLMv2/krb5tgs capture -> crack pipeline
Capture tooling is operator-side (`UNVERIFIED` here); crack: **NetNTLMv2** `hashcat -m 5600 -a 0
  netntlmv2.txt rockyou.txt -r best64.rule -r OneRuleToRuleThemAll.rule -O --session ntlm
  --potfile-path audit.pot` (`module_05600.c:23`); **krb5tgs** `-m 13100` same shape
  (`module_13100.c:22`) | John `krb2john.py` → `--wordlist --rules=best64`; **krb5asrep** `-m 18200`
  (`module_18200.c:22`) | `kirbi2john.py`; **NTLM** `-m 1000` (`module_01000.c:21`, ~95 GH/s class)
  hybrid `-a 6 wordlist '?d?d?d?d'` early; **SHA1/bcrypt** `-m 100` (`module_00100.c:21`)
  straight+rules, `-m 3200` (`module_03200.c:21`) dictionary only (~150 kH/s class). John: `john
  --format=krb5tgs --wordlist=… --rules=best64` (`doc/OPTIONS:482`).

## Password spray maths
Budget: `attempts/account/window ≤ threshold` (threshold from RoE; common 5–10 — do not assume).
  With `U` users, `P` passwords: **One-password-many-users (OPMU)** = `P` waves × `U`/wave,
  inter-wave delay > lockout window (safer); **Many-passwords-one-user (MPOU)** = `U×P` concentrated
  per account, burns budget fast. Example OPMU `U=500,P=20`, thr 5/window → ≤5 pw/user/window → 4
  waves of 5 → 10,000 attempts, min 4 windows+jitter. CredMaster pacing: `-t 5` (max 15, `:728`),
  `-d 2 -j` (`:730-732`), `--batch_size/--batch_delay` (`:734-735`), `--weekday_warrior` (`:739`),
  per-region rotation (`--region :729`, one API/region `:388-390`). **Jitter mandatory** (`-j/-m
  :730-731`, `:533-536`): regular intervals are a one-rule detection (§Detection artifacts);
  `-r/--randomize :736` (`:576-600`) shuffles order. `--continue-on-success` is hashcat-idiom, **not
  a CredMaster flag** (verified `:719-765`). Any lockout/OTP signal = stop that account, widen
  delays.

## AitM phishlet engineering
**Schema walkthrough (`core/phishlet.go`, §evilginx2).** Filename = name (`LoadFromFile :271,
  :283`). Fill in order: (1) `proxy_hosts` (`ConfigProxyHost :142-149
  {phish_sub,orig_sub,domain,session,is_landing,auto_filter}`) — `domain`=phish, `orig_sub`=real,
  one per subdomain; (2) `sub_filters` (`ConfigSubFilter :151-160
  {triggers_on,orig_sub,domain,search,replace,mimes,redirect_only,with_params}`) — rewrite
  HTML/JS/URLs to proxy, missing rewrites = broken login; (3) `credentials` (`:178-182` +
  `ConfigPostField :172-176 {key,search,type post|json}`, default `post :624-630`) — `key` must
  match real POST field; (4) `auth_tokens` (`:162-170 {domain,keys,type cookie|body|http,path}`) —
  session cookie post-auth = MFA bypass; (5) `login/js_inject/intercept/force_post/redirect_url`
  (`ConfigPhishlet :221-235`). **sub_filter `js_inject` for MFA prompt.** Where IdP renders
  push/number-match in JS, scope injection by `triggers_on`/`orig_sub` to the MFA path only:
  suppress native prompt / re-inject OTP field so `auth_tokens` captures it. Over-broad inject
  breaks the login. Per-IdP payloads `UNVERIFIED` — build/test per phishlet. **Cookie capture +
  replay from clean IP.** Sessions `core/session.go:9-31`, `database/db_session.go:13,30`; replay
  from clean egress (different ASN/geography — IP/ASN-bound sessions are protection and tell); never
  re-authenticate. **Domain/TLS requirements.** DNS under your control + publicly trusted cert
  (Let's Encrypt) for each `proxy_hosts[].domain`; fresh lookalike+cert is the top flag. **Phishlet
  debug workflow.** `phishlets` / `phishlets <name>` (`core/config.go:558,757`) → `AddLure :682,
  GetLureByPath :741` with own-UA `UserAgentFilter` → walk login via `GetLureUrl :779`/`GetLoginUrl
  :794` (`core/phishlet.go`) → confirm creds in `sessions` + cookie in `auth_tokens` → broaden UA.
  Gophish results `core/gophish.go:54-75`.

## Gophish campaign ops
Models §gophish; **v1 only** (`controllers/api/server.go:55-90`, no `api/v2`). (1) **Sending profile
  (SMTP)** `PostSMTP :191`/`PutSMTP :216` (`models/smtp.go`), real mailbox, matching `FromAddress`,
  custom `Headers :50`; test `/util/send_test_email :82`. (2) **Groups** `PostGroup :194`, CSV
  `Target` (`models/group.go:48, BaseRecipient :55-59`) per department, small waves for attribution.
  (3) **Landing page** `PostPage :123`, `CaptureCredentials/CapturePasswords`
  (`models/page.go:13-21`), `RedirectURL` to real site, HTTPS reputable domain (or pair evilginx2,
  §AitM). (4) **Template** `PostTemplate :124`, clone real internal mail, `EnvelopeSender` aligned.
  (5) **Campaign** `PostCampaign :452` TemplateId/PageId/SMTPId/Groups/URL, `SendBy` window;
  `Status/Events` track timeline. (6) **Results polling** `GET /api/campaigns/{id}/results :67`,
  `CompleteCampaign :643`; poll with delay. (7) **Webhook** `/api/webhooks/ :86-88` for push
  (open/click/submit) instead of polling; payload schema `UNVERIFIED` — read
  `controllers/api/webhook.go` first.

## Provider spray via CredMaster
File `credmaster.py`, plugins §CredMaster
  (`adfs,azuresso,azvault,ews,fortinetvpn,gmailenum,httpbrute,httppost,msgraph,msol,o365enum,okta,owa,pingfed,template/`;
  dynamic `:237`). **Proxy rotation model.** FireProx (`utils/fire.py`, boto3 `apigateway`,
  retries=10) per-region passthroughs; `:386-410` one API per region/thread (cap `:388-390`), header
  mapping `X-My-X-Forwarded-For→X-Forwarded-For, X-My-Authorization→Authorization`; `spray_thread
  :510-538` fresh IP + `random.choice(useragents) :617` per attempt (defeats per-IP limits;
  per-account lockout remains). **Evasion flags** §CredMaster: `-t :728`, `-j/-m :730-731`, `-d
  :732`, `--batch_size/--batch_delay :734-735`, `-r :736`, `--header :737`, `--xforwardedfor :738`,
  `--weekday_warrior :739`, `--region :729`, AWS `:756-760`, `--clean/--api_list/--api_destroy
  :763-765`. Canonical: `python3 credmaster.py --plugin okta -f users.txt -a passwords.txt -t 5 -d 2
  -j --weekday_warrior --region eu-west-1 --region us-east-1` — one password
  (`Passwords/Common-Credentials/`) × many users (`Usernames/top-usernames-shortlist.txt`),
  §Password spray maths.

## Detection artifacts
**hashcat/John:** offline only — `rules/best64.rule`, `OneRuleToRuleThemAll.rule`,
  `*.potfile`/`*.pot`, `.restore` (`options.def:115,132`), `john.log`, `*.chr`, wordlists on disk;
  protect credential stores at rest. **Spraying (CredMaster):** many users failing from many IPs
  with 1–few passwords (OPMU tell — aggregate by password-hash across users); regular timing
  (mitigated `-j/-m :730-731`); random UA (`:617`); XFF anomalies; business-hours bursts
  (`--weekday_warrior :739`); plugin fingerprints per provider. Hunt aggregate-by-password; alert
  success-after-many-failures per IP; lock out by password too. **AitM (evilginx2):** lookalike
  domain + fresh cert (`ConfigProxyHost :142-149`); session cookie on foreign IP/ASN (clean-IP
  replay is the tell); `js_inject` DOM anomalies; lure-path access (`GetLureByPath`,
  `core/config.go:741`). Controls: CT-log monitoring, session-IP/device binding.
  **Gophish/NGL-Phish:** SPF/DKIM/DMARC misalignment, tracking-URL params, header anomalies, landing
  TLS/domain age; exposed `/api/campaigns|groups|templates|pages|smtp` (`server.go:64-79`). NGL:
  IG-lookalike on generic hosting, story-link redirects. **SecLists:** no telemetry; tell is
  §Password spray maths pattern + honeypot hits (`Passwords/Honeypot-Captures/`,
  `Usernames/Honeypot-Captures/`).

*Sources: `gh api repos/{hashcat/hashcat, openwall/john, kgretzky/evilginx2, gophish/gophish,
  GSRHaX/NGL-Phish, knavesec/CredMaster, danielmiessler/SecLists}` and file reads cited inline
  `path:line`; `UNVERIFIED` where not line-read.*
