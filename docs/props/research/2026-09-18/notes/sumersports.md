# @tejfbanalytics / @QBgami / SumerSports — source notes (read 2026-09-18, live + index)

LIVE (verified on public pages 2026-09-18):
- https://sumersports.com/ — public copy: Sumer charts "300+ data points many times per second"; real-time pressure/route/coverage charting; formation/coverage/personnel/game-state filters; SumerPass.
- Confirmed pricing on home page (7th section, 2026-09-18): SumerPass = $10/week, $20/month, $100/year, 7-day free trial for first-time subscribers.
- https://sumersports.com/features/stats/ (opened live 2026-09-18): same play-level data powers SumerBrain and SumerLive; exposed across player/team positions; situational filters; slates update within 2 hours after the final game. Nav exposed QB/WR/TE/RB/offense/defense tables; NO developer docs/API links in nav; no public/documented API found. App link ("Open the SumerSports App") behind Sign In / paywall.
- https://www.linkedin.com/company/sumersports — SumerLive includes live WR-CB matchups, schemes, route trees; filters: formation, coverage, personnel, game state.
- Parental lead (Sep 18): LB, defensive interior, edge tables went live; preseason/postseason data from 2022; promo code WELCOME15 (15% off) — NOT independently confirmed on public pages (announcement came from parent's lead, not from sumersports.com pages I read). Flag as unconfirmed.

Under-center chart (tejfbanalytics):
- Input likely Sumer proprietary formation charting; public approximation possible if nflverse formation/short-name fields mark UNDER CENTER.
- Computation: team under-center rate = qualifying under-center snaps / qualifying offensive snaps; under-center EPA/play = sum(eEPA on those plays)/count. Exclusions (no-plays, spikes, penalties) unpublished.
- Public parallel code pattern: https://gist.github.com/morganandrew/08d550f232dddf27259e9095ed9d50fe — Week 1 regular-season pass/run plays, drop NA EPA, mean EPA by offense. Adapt by adding under-center formation filter.
- nflverse data: https://github.com/nflverse.
