#!/usr/bin/env python3
import pathlib, re

t = pathlib.Path("docs/predictions/research/2026-11-05/THURSDAY-MORNING-READY-TO-POST-REVENUE-QUEUE.md").read_text()
threads = re.split(r'^### THREAD', t, flags=re.M)[1:]
pattern = re.compile(r'Tweet \d+/\d+')
counts = [len(pattern.findall(th)) for th in threads]
partb = t.split('## PART B')[1]
replies = re.findall(r'^\d+\. \*\*`@', partb, re.M)
print("threads:", len(threads), "tweet counts:", counts, "total tweets:", sum(counts))
print("sniper replies:", len(replies))
print("emails:", t.count('### EMAIL'))
print("checklist:", t.count('- [ ]'))
print("OK" if (counts == [7, 6, 7] and len(replies) == 10 and t.count('### EMAIL') == 3) else "MISMATCH")
