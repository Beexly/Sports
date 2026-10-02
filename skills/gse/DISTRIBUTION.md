# Distribution note

Not published. Concrete steps, mirroring vaisala-xweather/xweather-agent-skills, for a later human publish.

1. Keep this directory as skills/gse/ with SKILL.md plus references/. One canonical layout. Do not copy it into a second skills tree.
2. Frontmatter name is gse. Do not rename it after installers key on the name.
3. Validate before any publish: YAML frontmatter has name and description; references/ is linked from SKILL.md; no internal path, no NGS, no signal weight, no raw metric appears in the skill text.
4. Host as a public GitHub repo, separate from the engine repo, MIT, same shape as https://github.com/vaisala-xweather/xweather-agent-skills : a skills/ tree, a README that says what the skill will not do, and a version field kept in agreement with SKILL.md metadata.version.
5. Marketplace entries come after that repo exists. Claude plugin marketplace and any agentskills.io index get a pointer to the public repo, not to this private engine branch.
6. Do not publish while the ledger's substantiated-season count is 0 unless the skill text still says so. The 2026-10-02 live ledger said 0. A skill that implies a published record would be a lie.

Checked against the live site, not a mock: ledger and receipts returned HTTP 200 on 2026-10-02.
