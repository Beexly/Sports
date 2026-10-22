# GSE Competitor Master Matrix
> 2026-09-08: LAUNCH KIT live in ./LAUNCH/ (00-START-HERE.md) — prod audit of galaxysportsedge.com + copy/methodology/SEO/agent-surface ready-to-paste files.

_Generated 2026-09-08 16:29 from 310 dossiers in dossiers/._ Re-run `_build_master_matrix.py` after new dossiers land._

## Dispositions
dead: 8, live: 247, walled: 55

## Tech stack x domain
| domain | disp | frontend | backend | cloud/cdn | api | sims | formulas | vendors | pricing (first found) | pain |
|---|---|---|---|---|---|---|---|---|---|---|
| 4for4.com | live | Server-rendered Drupal 7 site (meta generator 'Drupal 7'); aggregat... | Drupal 7 PHP; JSON API at /api (discovery endpoint listing resources) | NOT CONFIRMED (no CDN/infra headers captured in saved evidence)NOT ... | 2 | - | 0 | Integrations surfaced on homepage: ESPN, Sleeper (account/import li... | - | 0 |
| actionnetwork.com | live | Next.js pages-router SPA (static-web-prod.actionnetwork.com/_next/s... | REST API root api.actionnetwork.com/web (API_ROOT:'api.actionnetwor... | NOT CONFIRMED at infra level (no server/Vercel/AWS headers captured... | 5 | - | 1 | Stripe (payments, pk_live key in page config), Rudderstack (analytics), Microsoft Clarity + VWO + Google Analytics + Facebook Pixel (analyt... (+5) | PRO subscription sold via Stripe; exact monthly price not re... | 3 |
| adanos.org | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_adano... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_adanos_... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_adanos_org_h... | 0 |
| adj.news | live | {'value': '_next/static', 'citation': 'raw/i_oddsshopper_com_js___n... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\i_oddsshopper_com_js__... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\i_oddsshopper_c... | 0 |
| advisionfeeds.com | dead | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | - | - | 0 |
| aixbet.ai | walled | {'value': '_next/static', 'citation': 'raw/px_aixbet_ai_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket'], 'citation': 'raw/px_aixbet_... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_aixbet_ai_ho... | 0 |
| alerts.chat | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_alerts_chat_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_alerts_chat_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_alerts_chat_... | 0 |
| allsportsapi.com | live | Server-rendered pages + jQuery 3.3.1 + Popper 1.14.7 (cdnjs) | NOT CONFIRMED (behind Cloudflare) | Cloudflare edge (server: cloudflare, cf-ray -ATL/-BOS)Cloudflare + ... | 1 | - | 0 | - | $99 / $149 / $199 tiers with 'Discount' anchoring on soccer ... | 2 |
| alphascope.app | live | {'value': '_next/static', 'citation': 'raw/px_alphascope_app_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'kalshi', 'manifold', 'Polymarket', 'Kalsh... | {'value': ['Free'], 'citation': 'raw/px_alphascope_app_home.... | 0 |
| api-sports.io | live | NOT CONFIRMED (plain GET 403 on both www.api-football.com and api-s... | REST (public knowledge; not verifiable from saved evidence) | Cloudflare bot wallCloudflare | - | - | 0 | NOT CONFIRMED | - | 0 |
| api-tennis.com | live | Server-rendered HTML with jQuery 3.0.0 + jquery-modal (cdnjs.cloudf... | NOT CONFIRMED - apache-style 404 pages | NOT CONFIRMEDcdnjs.cloudflare.com | 3 | - | 0 | NOT CONFIRMED - no sportradar/statsperform/opta/odds-api strings in... | Tiers include 'Ultra' (top tier referenced in docs); exact t... | 1 |
| apifootball.com | live | {'value': 'vite', 'citation': 'raw/apifootball-docs-v3.txt'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\apifootball-docs-v3.txt'} | {'value': ['FREE', 'free', 'free plan', 'Free'], 'citation':... | 0 |
| apisoccer.com | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_apisoccer_com_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_apisoccer_com_home.... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_apisoccer_co... | 0 |
| apps.apple.com | live | {'value': 'svelte', 'citation': 'raw/dycers-appstore.html'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Kalshi', 'Polymarket'], 'citation': 'raw/dycers-appstor... | {'value': ['Free', 'free', 'FREE', 'Pro plan'], 'citation': ... | 0 |
| artemisanalytics.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_artem... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_artemisanalytics_co... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_artemisanaly... | 0 |
| astron.markets | live | {'value': 'NOT CONFIRMED', 'citation': 'raw/b2-astron_markets-home.... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b2-astron_markets-home... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b2-astron_marke... | 0 |
| aura.money | live | {'value': '_next/static', 'citation': 'raw/b2-aura_money-home.html'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/b2-aura_mo... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b2-aura_money-h... | 0 |
| awesemo.com | live | Next.js App Router + MUI (date pickers, docs refs in chunks) | Next.js API routes | NOT CONFIRMEDNOT CONFIRMED | 7 | - | 0 | DK/FD contest feeds (inferred) | NOT captured this run | 0 |
| balldontlie.io | live | {'value': '_next/static', 'citation': 'raw/batch2_balldontlie_io_ap... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['balldontlie', 'BALLDONTLIE'], 'citation': 'raw/batch2_b... | {'value': ['Free tier', 'Free', 'free'], 'citation': 'raw/ba... | 0 |
| ballparkpal.com | live | {'value': 'vite', 'citation': 'raw/px_ballparkpal_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_ballparkpal_com_hom... | {'value': ['Free'], 'citation': 'raw/px_ballparkpal_com_home... | 0 |
| bankr.bot | live | {'value': 'react', 'citation': 'raw/b2-bankr_bot-home.html'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b2-bankr_bot-home.html'} | {'value': ['Free', 'free', 'FREE'], 'citation': 'raw/b2-bank... | 0 |
| bankrollszn.com | live | React + Vite (index-CZYsoXcm.js), Tailwind, lucide-react | custom API: /api/apps/*/functions/* + /api/apps/*/entities/*, /api/... | Caddy origin behind CloudflareCloudflare (cf-ray a380567f980712eb-ATL) | 9 | - | 0 | nflverse | - | 2 |
| baozi.bet | live | {'value': '_next/static', 'citation': 'raw/b2-baozi_bet-home.html'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket'], 'citation': 'raw/b2-baozi_bet-home.html'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b2-baozi_bet-ho... | 0 |
| based.one | live | {'value': '_next/static', 'citation': 'raw/b2-based_one-home.html'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b2-based_one-home.html'} | {'value': ['free'], 'citation': 'raw/b2-based_one-home.html'... | 0 |
| bbb.community | live | {'value': '_next/static', 'citation': 'raw/b2-bbb_community-home.ht... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b2-bbb_community-home.... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b2-bbb_communit... | 0 |
| berryinvesting.com | live | {'value': '_next/static', 'citation': 'raw/berryinvesting.com__home... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\berryinvesting.com__ho... | {'value': ['free'], 'citation': 'raw/berryinvesting.com__hom... | 0 |
| betbetter.world | live | Vue app with inlined Google Fonts (LCP optimization) + GTM | NOT CONFIRMED | Microsoft-IIS/10.0 (unusual for consumer sports betting sites)NOT C... | - | 20,000 per game (marketing claim on homepage) | 0 | bookmaker prices displayed per-outcome ('Tap any price to add it to... | Price strings: $2.97, $89, $399 (tier map NOT CONFIRMED); ex... | 0 |
| betfame.com | live | Server-rendered PHP-style multi-page site (English/Chinese/Indonesi... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | - | Paid per tip / tipster subscriptions (marketplace); exact ti... | 0 |
| betiq.teamrankings.com | live | Apache-served custom site + GTM | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | TeamRankings historical data pedigree (sister domain) | - | 0 |
| betmoar.fun | live | {'value': '_next/static', 'citation': 'raw/betmoar.fun__chunk-big.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket'], 'citation': 'raw/betmoar.fu... | {'value': ['free', 'Free'], 'citation': 'raw/betmoar.fun__ch... | 0 |
| betql.co | live | Next.js on Vercel (server header) with Stripe integrations | NOT CONFIRMED | Vercel + StripeVercel edge | - | 10,000 simulations per game (stated on homepage) | 0 | 'Exclusive Public Betting Data' + expert betting data + community c..., Polymarket moneyline picks article surfaced (coverage expansion) | - | 0 |
| betradar.com | walled | WordPress (betradar theme) + jQuery 3.6.0, Bootstrap, CountUp, ligh... | WordPress PHP (wp-content, wp-json observable but 403 on sitemap; 4... | - | 2 | - | 0 | Brand name suggests Betradar is itself a vendor to other sportsbook... | - | 0 |
| betsapi.com | walled | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | - | ~$30/mo claimed via Reddit citation (NOT CONFIRMED — no prim... | 1 |
| betstack.app | live | {'value': 'vite', 'citation': 'raw/betstack.app__chunk-index.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/betstack.a... | {'value': ['Free'], 'citation': 'raw/betstack.app__chunk-ind... | 0 |
| betstamp.com | live | Next.js | NOT CONFIRMED | DigitalOcean (assets on betstamp-public.sfo2.cdn.digitaloceanspaces... | - | - | 0 | B2B odds-feed positioning: 'Powering the PRO Odds Screen and sports... | Price strings $14/$16/$19-$22 present (tier map NOT CONFIRME... | 0 |
| bettingdata.com | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_bettingdata_com_home... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_bettingdata_com_hom... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_bettingdata_... | 0 |
| bettingpros.com | live | Islands-architecture SPA (custom islands-runtime, Vite-built /dist/... | REST API https://api.bettingpros.com/v3 (axios instance with static... | AWS (CloudFront edge + AWS RUM us-east-1 dataplane); Apache/Ubuntu ... | 4 | - | 0 | FantasyPros (parent brand — shared player videos cdn.fantasypros.co..., Braze (messaging), Mixpanel + Meta Pixel + AWS RUM (analytics) (+3) | Premium $9.99/mo billed annually ($119.99/year single charge... | 2 |
| bettoredge.com | live | Next.js on Vercel | peer-to-peer matching engine (proprietary) | VercelVercel | - | - | 0 | user-to-user order matching — no traditional odds vendor; 'Instead ... | P2P marketplace ('no built-in house edge', 'better price tha... | 0 |
| billybets.ai | live | {'value': 'live site, framework unclear', 'citation': 'raw/billybet... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\billybets.ai__home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\billybets.ai__h... | 0 |
| birdievantage.com | live | Next.js on Vercel | NOT CONFIRMED | VercelVercel | - | 10,000+ tournament simulations per slate (made-cut prob, finish distributions... | 0 | Data Golf (projections + strokes-gained source, named explicitly) | completely free (positioning: 'same features paid tools char... | 0 |
| blockworks.com | live | {'value': '_next/static', 'citation': 'raw/blockworks.com__home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\blockworks.com__home.r... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\blockworks.com_... | 0 |
| brokersports.com | dead | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_brokersports_com_hom... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_brokersports_com_ho... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_brokersports... | 0 |
| brosonpm.trade | live | {'value': 'NOT CONFIRMED', 'citation': 'raw/brosonpm.trade__home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\brosonpm.trade__home.r... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\brosonpm.trade_... | 0 |
| cbssports.com | live | {'value': '_next/static', 'citation': 'raw/px_cbssports_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['opta', 'Opta'], 'citation': 'raw/px_cbssports_com_home.... | {'value': ['free'], 'citation': 'raw/px_cbssports_com_home.r... | 0 |
| cheatsheetwarroom.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_cheat... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_cheatsheetwarroom_c... | {'value': ['free'], 'citation': 'raw/px_cheatsheetwarroom_co... | 0 |
| clickhouse.com | live | {'value': '_next/static', 'citation': 'raw/b45_com_clickhouse_com_h... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b45_com_clickhouse_com... | {'value': ['free', 'enterprise', 'Free'], 'citation': 'raw/b... | 0 |
| clutch.market | dead | {'value': 'NOT CONFIRMED', 'citation': 'raw/b45_com_clutch_market_h... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'no-evidence'} | {'value': 'NOT CONFIRMED', 'citation': 'no-evidence'} | 0 |
| compose.build | live | {'value': '_next/static', 'citation': 'raw/b45_com_compose_build_ho... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket'], 'citation': 'raw/b45_com_co... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b45_com_compose... | 0 |
| converge.market | dead | {'value': 'NOT CONFIRMED', 'citation': 'raw/b45_com_converge_market... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b45_com_converge_marke... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b45_com_converg... | 0 |
| cookie.fun | live | {'value': '_next/static', 'citation': 'raw/b45_com_cookie_fun_home.... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b45_com_cookie_fun_hom... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\b45_com_cookie_... | 0 |
| covers.com | live | Server-rendered ASP.NET (Kestrel server header) with jQuery 3.5.1 +... | ASP.NET Core on Kestrel (Server: Kestrel header); odds grids fully ... | AWS CloudFront CDN (x-amz-cf-pop IAH50-P5, 'Miss from cloudfront');... | 2 | - | 1 | Adobe (Analytics/Launch), CookieBot (consent), jQuery/floatThead/swiper (UI libs) (+1) | App exists ('Download on the App Store' badge on odds page);... | 3 |
| crazyninjaodds.com | live | Server-rendered ASP.NET (.aspx routes) behind Cloudflare | ASP.NET (Subscribe.aspx) | CloudflareCloudflare | 1 | Monte Carlo Simulator listed as a tool (nav); parameters NOT CONFIRMED | 0 | NOT CONFIRMED | - | 0 |
| cricketapi.com | live | Large SSR HTML (651KB home) + Google Optimize + Razorpay checkout.j... | NOT CONFIRMED - robots.txt blocks /nimda/ /rest/ /apps/ /orders/ /a... | AWS CloudFront CDN (d16ppiey8peuxi.cloudfront.net)AWS CloudFront | graphql | - | 0 | NOT CONFIRMED - no sportradar/statsperform/opta strings in fetched ... | Essential: INR 15,902/mo billed annually (INR 17,669 billed ... | 0 |
| dailyfantasyfuel.com | live | Server-rendered jQuery 2.2.4 SPA-style app + GSAP + Swiper; main ap... | Node/Express (x-powered-by: Express); JSON session endpoint /auth/u... | AWS S3 (dff-common.s3.amazonaws.com) + Express hostNOT CONFIRMED (n... | 1 | - | 1 | NOT CONFIRMED (no vendor strings in fetched HTML/JS; DraftKings/Fan... | {'detail': 'NOT CONFIRMED - /premium/ and /signup fetched (H... | 8 |
| dailyfantasyoptimizer.com | live | Next.js (x-powered-by: Next.js, Turbopack chunks _next/static/chunk... | NOT CONFIRMED (server-side optimizer; /faq cites 'heavy server dema... | Cloudflare (cf-ray ...-IAH)Cloudflare | - | - | 1 | NOT CONFIRMED (no vendor strings in fetched HTML/JS; in-house proje..., DraftKings/FanDuel as contest integration targets | FREE ('The optimizer is free to use and works on desktop, ta... | 8 |
| dataforceff.com | live | jQuery + server-rendered PHP site (PHPSESSID-style hidden inputs, a... | PHP (commented POST to common/ajax_admin.php visible in homepage so... | Cloudflare (server: cloudflare)Cloudflare | 1 | - | 1 | SportsData.io (live stats feed - homepage logo row: 'Our live stats..., 4for4 (projections integrate with 'The Wonk'), Fantasy Nerds (projections) (+2) | {'detail': "NOT CONFIRMED from homepage - entry/league fees ... | 8 |
| datalayer.xyz | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_datal... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_datalayer_xyz_home.... | {'value': ['free', 'Free', 'Enterprise'], 'citation': 'raw/p... | 0 |
| datarade.ai | live | {'value': 'vite', 'citation': 'raw/px_datarade_ai_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_datarade_ai_home.raw'} | {'value': ['free'], 'citation': 'raw/px_datarade_ai_home.raw... | 0 |
| deepbetting.io | live | Server-rendered marketing page (nginx 1.24.0 Ubuntu direct) | NOT CONFIRMED | nginx on Ubuntu; contact via api.web3forms.comNOT CONFIRMED | - | - | 0 | NOT CONFIRMED | Free + Premium tiers confirmed; premium price number NOT CON... | 0 |
| deepnewz.com | live | {'value': '_next/static', 'citation': 'raw/deepnewz.com.html'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\deepnewz.com.html'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\deepnewz.com.ht... | 0 |
| defillama.com | live | {'value': '_next/static', 'citation': 'raw/defillama.com.html'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket'], 'citation': 'raw/defillama.... | {'value': ['free'], 'citation': 'raw/defillama.com.html'} | 0 |
| dexu.ai | live | {'value': '_next/static', 'citation': 'raw/dexu.ai.html'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\dexu.ai.html'} | {'value': ['Free plan', 'free plan', 'free', 'Free tier'], '... | 0 |
| dfsace.com | dead | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | - | - | 0 |
| dfshero.com | live | {'value': '_next/static', 'citation': 'raw/px_dfshero_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_dfshero_com_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_dfshero_com_... | 0 |
| dgfantasy.com | live | Next.js (x-powered-by: Next.js; buildId YjMV8iAWbmWbqcejgf3T-; _nex... | Express (x-powered-by: Express on /robots.txt, behind same host); /... | Google Cloud Run or GCP LB (via: 1.1 google) + CloudflareCloudflare... | 1 | - | 1 | NOT CONFIRMED in dgfantasy JS (white-label OddsJam stack implies Od... | {'detail': "AI SLIP GENERATOR PLAN: Monthly $59.99/mo; Quart... | 8 |
| dimers.com | live | Angular (polyfills-RV3JTMEC.js / main-5EYIASKB.js bundles) | Headless CMS: Cosmic JS, bucket ciphercms-production queried client... | NOT CONFIRMEDcdn.ciphersports.io (Cipher Sports own CDN) | 1 | - | 0 | Bookmaker integrations observed: BetMGM, DraftKings, FanDuel, Willi... | $99 for 6 months (subscription CTA) | 0 |
| dimes.fi | live | {'value': 'live site, framework unclear', 'citation': 'raw/dimes.fi... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi'], 'citation': 'raw/dimes.fi.html'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\dimes.fi.html'} | 0 |
| domeapi.io | live | {'value': 'React', 'citation': 'raw/domeapi.io.assets.js'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket', 'kalshi', 'Kalshi'], 'citati... | {'value': ['free', 'Free'], 'citation': 'raw/domeapi.io.asse... | 0 |
| donbest.com | live | {'value': '_next/static', 'citation': 'raw/px_donbest_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_donbest_com_home.raw'} | {'value': ['free', 'Free'], 'citation': 'raw/px_donbest_com_... | 0 |
| draftedge.com | live | NOT CONFIRMED (scan fetched 0 JS bundles; home.html shows inline va... | Server headers show 'Sucuri/Cloudproxy' at edge; /api/optimizer ret... | Sucuri Cloudproxy WAF/CDN in front of origin (raw/scan-draftedge_co... | 1 | - | 0 | NOT CONFIRMED (grep for sportradar|statsperform|opta|genius|the-odd... | Rookie $34.85/mo, Pro $49.95/mo, Sharp $74.95/mo; month-to-m... | 2 |
| draftkings.com/predictions | dead | NOT CONFIRMED at /predictions (404); DK content platform fingerprin... | NOT CONFIRMED | robots.txt served with server: AmazonS3 via CloudFront (raw/scan-dr... | - | - | 0 | - | N/A (sportsbook) | 2 |
| draftsharks.com | live | Vue 3.2.47 (vue.global.prod.js) + custom 'dsvue' apps (LandingDomin... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED (self-hosted /js/ and /assets/ with vers... | - | - | 0 | MFL/ESPN/NFL strings present (league-import links, not confirmed da... | Stripe Checkout, embedded price matrix in homepage HTML: mon... | 0 |
| draftwise.app | live | React SPA (Vite build, /assets/index-CGVAth7Q.js), TailwindCSS | Supabase (project ngjjwkxgyvfjhtzaooqy.supabase.co) — PostgREST tab... | Supabase + Cloudflare (server: cloudflare, cf-ray IAH)Cloudflare | 4 | - | 0 | - | Free + Premium tiers exist; prices NOT CONFIRMED (pricing pa... | 0 |
| dune.com | live | {'value': 'NOT CONFIRMED', 'citation': 'raw/dune.api-root.json'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\dune.api-root.json'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\dune.api-root.j... | 0 |
| dycers.app | live | NOT CONFIRMED (domain dead) | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | - | domain dycers.app does not resolve (NXDOMAIN, https+http) — ... | 0 |
| elastics.ai | live | {'value': 'vite', 'citation': 'raw/px_elastics_ai_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi'], 'citation': 'raw/px_elastics_ai... | {'value': ['Enterprise', 'free'], 'citation': 'raw/px_elasti... | 0 |
| elontweets.live | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_elont... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_elontweets_live_hom... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_elontweets_l... | 0 |
| establishtherun.com | live | WordPress + WooCommerce 11.0.0 + WooCommerce Memberships 1.29.1 (wp... | PHP/WordPress (Apache behind Cloudflare) | CloudflareCloudflare + cdn.establishtherun.com (Cloudflare CDN wp-c... | 1 | - | 1 | SportsData.io (footer sponsor logo, cdn.establishtherun.com/.../spo..., SparkLoop (newsletter referral, js.sparkloop.app/team_a5a08658b31b.js), reCAPTCHA (+1) | {'detail': "Tier structure NOT CONFIRMED from fetched pages:... | 8 |
| eventarb.com | walled | {'value': '_next/static', 'citation': 'raw/px_eventarb_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Kalshi', 'Polymarket'], 'citation': 'raw/px_eventarb_co... | {'value': ['free'], 'citation': 'raw/px_eventarb_com_home.ra... | 0 |
| eventwaves.io | live | {'value': 'svelte', 'citation': 'raw/px_eventwaves_io_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi', 'polymarket'], 'citation': 'raw/... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_eventwaves_i... | 0 |
| fake-a-polymarket.com | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_fake-a-polymarket_co... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_fake-a-polymarket_c... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_fake-a-polym... | 0 |
| fanduel.com/predicts | live | Next.js (/_next/static/chunks/polyfills-42372ed130431b0a.js, webpac... | openresty (server header) | AWS CloudFront — double-hop via header 'via: 1.1 ...cloudfront.net ... | 1 | - | 0 | - | N/A — free sportsbook-owned predictions/content product (acq... | 2 |
| fantasy.espn.com | live | SPA (empty-body 202 on plain GET) | hidden fantasy API (public, undocumented; known laxa/espn-fantasy l... | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | first-party ESPN data | free core product | 0 |
| fantasycalc.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_fanta... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_fantasycalc_com_hom... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_fantasycalc_... | 0 |
| fantasycruncher.com | live | server-rendered PHP-era UI | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | n/a (optimizer focus) | 0 | DK/FD contest feeds (inferred) | tiered subscription (exact $ NOT captured this run) | 9 |
| fantasydata.com | live | Server-rendered marketing UI + main-202606191903.js bundle | REST API behind /nfl/api/* (docs gated) | nginx + CloudFrontCloudFront; static on fantasydata-static.s3.amazo... | 1 | - | 0 | positions as data vendor: 'Fantasy Rankings, DFS Tools, Player Stat... | - | 0 |
| fantasyfootballanalytics.net | live | WordPress | NOT CONFIRMED (no exposure) | Apache/2.4.58 (Ubuntu)NOT CONFIRMED | 2 | - | 0 | NOT CONFIRMED (none found in fetched JS/HTML) | {'url': 'https://fantasyfootballanalytics.net/wp-content/plu... | 8 |
| fantasyfootballcalculator.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_fanta... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['sportsdata.io'], 'citation': 'raw/px_fantasyfootballcal... | {'value': ['Free', 'free'], 'citation': 'raw/px_fantasyfootb... | 0 |
| fantasyguru.com | live | Next.js front over WordPress-era content (both markers) | NOT CONFIRMED | CloudflareCloudflare | - | - | 0 | NOT CONFIRMED | Track-based plans: Football MVP-style track $219.99/yr start... | 0 |
| fantasylabs.com | live | legacy app (Cloudflare fronted; sitemap generated by Screaming Frog) | PHP 7.4.9 (X-Powered-By leaked on probe) | CloudflareCloudflare | 1 | - | 0 | DraftKings/FanDuel contest feeds (inferred from product) NOT CONFIRMED | subscription; /tools page captured (content behind app shell... | 0 |
| fantasylife.com | live | Next.js | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | league sync ('My Teams' synced leagues), tools: Strength of Schedule, Player Stats, Rookie Super Model | FantasyLife+ two tiers, published: Tier 1 $3.33/mo billed an... | 0 |
| fantasynerds.com | live | {'value': 'React', 'citation': 'raw/batch2_fantasynerds_com_apiprob... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\batch2_fantasynerds_co... | {'value': ['free', 'Free'], 'citation': 'raw/batch2_fantasyn... | 0 |
| fantasypoints.com | live | Nuxt 3 (x-powered-by: Nuxt, Vite chunks /_nuxt/*), Firebase Auth cl... | Nuxt/Nitro server routes under /api/* (auth/log, auth/login, auth/l... | Cloudflare (server: cloudflare, cf-ray a38030b14b566c58-DFW)Cloudflare | 29 | - | 2 | fantasydata (string present in homepage HTML) | {'url': 'https://fantasypoints.com/plans', 'status': 200, 'd... | 8 |
| fantasypros.com | live | Custom JS SPA-ish site on own CDN (cdn.fantasypros.com); Akamai edg... | NOT CONFIRMED (server-side; /api/c1/*.php endpoints imply PHP backend) | NOT CONFIRMEDAkamai (middycdn-a.akamaihd.net) + cdn.fantasypros.com... | 2 | - | 0 | 'Opta' and 'ESPN' strings present in homepage (exact role unconfirmed) | - | 0 |
| fantasyteamadvice.com | live | Tailwind CSS + Stimulus controllers (data-controller attributes e.g... | Rails-style stack: @rails/actioncable bundled in main JS (node_modu... | Cloudflare (server: cloudflare, cf-ray a38047b0c92c2dab-BOS) (raw/s... | 3 | - | 0 | NOT CONFIRMED (vendor-string grep found only false positives: 'opta... | FTA+ Monthly $39.99/mo; Annual $149.99/yr with early-bird fi... | 2 |
| feedinco.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_feedi... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_feedinco_com_home.r... | {'value': ['Free', 'free', 'FREE'], 'citation': 'raw/px_feed... | 0 |
| fereai.xyz | live | {'value': '_next/static', 'citation': 'raw/px_fereai_xyz_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_fereai_... | {'value': ['free'], 'citation': 'raw/px_fereai_xyz_home.raw'... | 0 |
| firefly.social | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_firefly_social_home.... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_firefly_social_home... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_firefly_soci... | 0 |
| fireplace.gg | live | {'value': '_next/static', 'citation': 'raw/px_fireplace_gg_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_firepla... | {'value': ['free'], 'citation': 'raw/px_fireplace_gg_home.ra... | 0 |
| firepolymarket.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_firep... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'PolyMarket', 'polymarket'], 'citation': '... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_firepolymark... | 0 |
| football-data.org | live | Server-rendered + small main.js; STOMP client (@stomp/stompjs@5.0.0... | nginx/1.14.2 (server header); app server NOT CONFIRMED | self-hosted signals (nginx 1.14.2, no cloud headers)jsdelivr for ST... | 1 | - | 0 | self: first-party football data provider (Opta-style licensed data ... | Free EUR 0 (10 calls/min); Standard EUR 49; PRO EUR 59 (EUR ... | 2 |
| football.fantasysports.yahoo.com | live | Yahoo server-rendered portal (912KB HTML) | Yahoo Fantasy public API (documented, OAuth) — NOT CONFIRMED probes... | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | first-party Yahoo data; public fantasy API with OAuth (positioning) | free core; price strings $0-$81 (likely DFS/promo context) | 0 |
| footballcsv.github.io | live | static GitHub Pages site | none (CSV datasets) | GitHub PagesGitHub Pages | - | - | 0 | open data community (Open Sports & Friends Forum) | free public domain | 0 |
| footballguys.com | live | Custom bundle.js app + wz-tooltip static JS; Zendesk widget; Conver... | NOT CONFIRMED | NOT CONFIRMEDCloudflare (Turnstile captcha widget embedded: challen... | - | - | 0 | No vendor strings (sportradar/statsperform/opta etc.) in homepage | - | 0 |
| forcazt.xyz | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_forca... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_forcazt_xyz_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_forcazt_xyz_... | 0 |
| fractionai.xyz | walled | {'value': '_next/static', 'citation': 'raw/px_fractionai_xyz_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_fractionai_xyz_home... | {'value': ['free'], 'citation': 'raw/px_fractionai_xyz_home.... | 0 |
| frontseat.co | live | {'value': '_next/static', 'citation': 'raw/px_frontseat_co_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_frontseat_co_home.r... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_frontseat_co... | 0 |
| ftnfantasy.com | live | WordPress + Elementor 3.21.3, jQuery 3.7.1, SystemJS, Zendesk widge... | WordPress (WordPress-SEO sitemaps) | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | Affiliate sportsbook offers surfaced ($200 / $350 bonus-bet CTAs, $... | - | 0 |
| future.fun | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_future_fun_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_future_fun_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_future_fun_h... | 0 |
| geniussports.com | walled | Next.js React (Vercel cle1:iad1 edge) on top of WordPress content (... | NOT CONFIRMED — no API endpoints visible; site is marketing shell f... | - | 1 | - | 0 | Genius Sports is itself a primary official-data vendor: 25 homepage... | - | 0 |
| getarbitragebets.com | live | {'value': '_next/static', 'citation': 'raw/px_getarbitragebets_com_... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['kalshi', 'Polymarket', 'Kalshi', 'polymarket', 'PolyMar... | {'value': ['free', 'Free'], 'citation': 'raw/px_getarbitrage... | 0 |
| github.com/bakedziti88/sportsbook-api | live | none | JavaScript scraper/aggregator API | n/an/a | 1 | - | 0 | FanDuel, DraftKings (scraped) | free/open source | 0 |
| github.com/BenBrostoff/draftfast | live | none (CLI lib) | Python | n/an/a | 1 | none (deterministic optimizer) | 1 | DraftKings salaries CSV, FanDuel salaries CSV | free OSS | 0 |
| github.com/chanzer0/MLB-DFS-Tools | live | none (library/notebooks) | Python | n/an/a | graphql | GPP contest simulator (src/mlb_gpp_simulator.py) | 1 | NOT CONFIRMED | free/open source | 0 |
| github.com/eddwebster/football_analytics | live | none (library/notebooks) | Jupyter Notebook | n/an/a | graphql | - | 2 | Opta, Metrica Sports (notebook datasets) | free/open source | 0 |
| github.com/floodlight-sports/floodlight | live | none (library/notebooks) | Python (poetry-managed) | n/an/a | graphql | - | 1 | NOT CONFIRMED | free/open source | 0 |
| github.com/georgedouzas/sports-betting | live | n/a (Python lib) | Python (sklearn, pandas, numpy) | n/an/a | 1 | n/a | 2 | football-data.co.uk | free (MIT) | 0 |
| github.com/J-A-Stone-LLC/fantasy-football-gm | live | NOT CONFIRMED | NOT CONFIRMED | n/an/a | - | - | 0 | NOT CONFIRMED | n/a | 0 |
| github.com/jscanga/Sports-Arbitrage-Finder | live | Next.js app (next.config.ts, src/) | TypeScript | Vercel deployment (sports-arbitrage-finder.vercel.app)n/a | 1 | - | 1 | sportsbook odds (names NOT CONFIRMED) | free/open source | 0 |
| github.com/martineastwood/penaltyblog | live | none (Python lib) | Python (scipy, numpy, pandas) | n/an/a | 1 | Monte Carlo helpers in models module | 3 | FBref, Understat | free OSS (MIT) | 0 |
| github.com/n-roth12/DFSLineupOptimizer | live | none (library/notebooks) | Python | n/an/a | 1 | - | 1 | DraftKings, FanDuel, Yahoo (salary CSVs) | free/open source | 0 |
| github.com/pretrehr/Sports-betting | live | Python lib (+UI) | Python | n/an/a | 1 | - | 1 | bookmaker odds feeds | free OSS (MIT) | 0 |
| github.com/sedemmler/WagerBrain | live | Python lib | Python | n/an/a | 1 | - | 1 | bookmaker odds feeds | free OSS (MIT) | 0 |
| github.com/sportsdataverse (org) | live | n/a (data packages) | R (hoopR, cfbfastR, fastRhockey, sportyR) + Python (sportsdataverse... | n/an/a | 1 | n/a | 2 | NFL Shield API, ESPN APIs, MLB Stats API (+2) | free | 0 |
| github.com/thespread/api | live | none | n/a (4KB repo — README/docs only) | n/an/a | 1 | - | 0 | Vegas sportsbook odds aggregation (TheSpread.io) | n/a | 0 |
| github.com/tonyntran/fantasy-auction-assistant | live | React dashboard (dashboard/src, extension dir) | Python | n/an/a | 1 | - | 2 | Sleeper, ESPN | free/open source | 0 |
| goalserve.com | live | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 1 | - | 0 | NOT CONFIRMED | Custom / Contact for Pricing | 2 |
| goldsky.com | live | {'value': '_next/static', 'citation': 'raw/px_goldsky_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket'], 'citation': 'raw/px_goldsky... | {'value': ['free', 'enterprise', 'Free', 'Enterprise'], 'cit... | 0 |
| gondor.fi | walled | {'value': '_next/static', 'citation': 'raw/px_gondor_fi_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_gondor_fi_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_gondor_fi_ho... | 0 |
| grid.gg | live | Cloudflare-fronted marketing site; HelpJuice-hosted developer docs | GraphQL API (probe file saved) + Central Data API + File Download API | CloudflareCloudflare | 2 | - | 0 | RIGHTS-HOLDER data supplier: official esports data via Riot, ESL, B... | Open Access free tier; partner pricing NOT CONFIRMED (agreem... | 0 |
| hashdive.com | live | {'value': 'React', 'citation': 'raw/px_hashdive_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_hashdiv... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_hashdive_com... | 0 |
| horseapi.com | dead | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | - | - | 0 |
| hyperodd.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_hyper... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_hyperodd_com_home.raw'} | {'value': ['free'], 'citation': 'raw/px_hyperodd_com_home.ra... | 0 |
| inside.fyi | walled | {'value': '_next/static', 'citation': 'raw/px_inside_fyi_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_inside_... | {'value': ['free'], 'citation': 'raw/px_inside_fyi_home.raw'... | 0 |
| isportsapi.com | live | {'value': 'nuxt', 'citation': 'raw/px_isportsapi_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_isportsapi_com_home... | {'value': ['free', 'Free'], 'citation': 'raw/px_isportsapi_c... | 0 |
| jsonodds.com | walled | {'value': 'live site, framework unclear', 'citation': 'raw/px_jsono... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_jsonodds_com_home.r... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_jsonodds_com... | 0 |
| juicereel.com | live | Next.js | /api-docs route exists (developer-facing API surface) | NOT CONFIRMEDimages.juiceintegration.com asset host | 1 | - | 0 | Sportsbook-sync verification: 'every bet is synced straight from th... | Pick/membership price strings observed: $4.99, $11, $12.50, ... | 0 |
| kairos.trade | live | {'value': '_next/static', 'citation': 'raw/px_kairos_trade_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['kalshi', 'polymarket', 'Kalshi', 'Polymarket'], 'citati... | {'value': ['enterprise', 'Enterprise'], 'citation': 'raw/px_... | 0 |
| kaito.ai | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_kaito_ai_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_kaito_ai_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_kaito_ai_hom... | 0 |
| kalshi.com | walled | Next.js (React SSR, /_next/static), client bundles 01ztipe50ml3b.js... | NOT CONFIRMED — Vercel Serverless; origin stack not exposed in fetc... | - | 2 | - | 0 | NOT CONFIRMED | - | 0 |
| kuest.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_kuest... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket', 'kalshi', 'Kalshi'], 'citati... | {'value': ['enterprise', 'Enterprise', 'Free', 'FREE'], 'cit... | 0 |
| layerhub.xyz | walled | {'value': '_next/static', 'citation': 'raw/px_layerhub_xyz_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket'], 'citation': 'raw/px_layerhu... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_layerhub_xyz... | 0 |
| leans.ai | live | WordPress + Stripe + GTM | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | NOT CONFIRMED | membership with 7-day free trial; strings $12/$19/$25/$55/$6... | 0 |
| lineupdrafter.com | live | Nuxt/Vue 3 + Vuetify (x-powered-by: Nuxt; _nuxt chunks; Vuetify CSS... | NOT CONFIRMED (app logic in lazy-loaded per-route Nuxt chunks, e.g.... | NOT CONFIRMED (Cloudflare-fronted)Cloudflare (cf-ray -BOS/-ATL) | - | - | 1 | NOT CONFIRMED (no vendor strings in fetched HTML/JS), DraftKings as export/integration target | - | 1 |
| lsports.eu | live | WordPress + Elementor 4.0.2 + WPML multilingual, jQuery 3.7.1, WP R... | WordPress (wp-json/oembed seen in saved /api page); marketing site ... | Cloudflare (server: cloudflare, cf-ray ...-DFW); assets on sec-cdn.... | 3 | - | 0 | LSports is itself an upstream vendor: data from 'over 100 live sour... | n/a | 2 |
| marketlens.trade | live | {'value': 'react', 'citation': 'raw/px_marketlens_trade_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_marketlens_trade_home... | {'value': ['Free', 'Free tier', 'free'], 'citation': 'raw/px... | 0 |
| markiumpro.com | live | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_markiumpro_com_home.... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_markiumpro_com_home... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_markiumpro_c... | 0 |
| matchr.xyz | live | {'value': '_next/static', 'citation': 'raw/px_matchr_xyz_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi'], 'citation': 'raw/px_matchr_xyz_... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_matchr_xyz_h... | 0 |
| mentionmarkets.com | live | {'value': '_next/static', 'citation': 'raw/px_mentionmarkets_com_ho... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi'], 'citation': 'raw/px_mentionmark... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_mentionmarke... | 0 |
| metabet.ai | live | {'value': 'react', 'citation': 'raw/batch2_metabet_ai_home.html'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\batch2_metabet_ai_home... | {'value': ['Free'], 'citation': 'raw/batch2_metabet_ai_home.... | 0 |
| metaforecast.org | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_metaf... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['manifold', 'Manifold'], 'citation': 'raw/px_metaforecas... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_metaforecast... | 0 |
| mobyscreener.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_mobys... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_mobyscreener_com_ho... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_mobyscreener... | 0 |
| monitoredtips.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_monit... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_monitoredtips_com_h... | {'value': ['Free', 'free'], 'citation': 'raw/px_monitoredtip... | 0 |
| moonshotsmlb.com | walled | {'value': 'live site, framework unclear', 'citation': 'raw/px_moons... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_moonshotsmlb_com_ho... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_moonshotsmlb... | 0 |
| netlify.app | live | {'value': 'Next.js', 'citation': 'raw/px_netlify_app_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Opta'], 'citation': 'raw/px_netlify_app_home.raw'} | {'value': ['Free tier', 'enterprise', 'Enterprise', 'free'],... | 0 |
| nevua.markets | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_nevua... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_nevua_markets_home.... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_nevua_market... | 0 |
| ninjatrader.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_ninja... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Opta'], 'citation': 'raw/px_ninjatrader_com_home.raw'} | {'value': ['free', 'Free', 'FREE'], 'citation': 'raw/px_ninj... | 0 |
| notboring.co | walled | {'value': 'vite', 'citation': 'raw/px_notboring_co_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket'], 'citation': 'raw/px_notboring_co_home.raw'} | {'value': ['free', 'Free'], 'citation': 'raw/px_notboring_co... | 0 |
| novig.com | live | Expo (React Native Web) SPA - _expo/static/js/web/*, no __NEXT_DATA__ | REST https://api.novig.us/nbx/v1 + GraphQL https://api.novig.us/v1/... | AWS S3 + CloudFront; auth.novig.us (likely Cognito); Stripe live ke... | 2 | - | 0 | Sportradar (17 string hits in bundle), Sportsdata.io (2 hits), Opta (39 hits, incl possible minified false positives) | No subscription - no-vig P2P exchange; exchange rebate 0.62%... | 4 |
| octagonai.co | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_octag... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Kalshi', 'Polymarket', 'kalshi', 'polymarket'], 'citati... | {'value': ['Free', 'free', 'Enterprise', 'Pro plan'], 'citat... | 0 |
| oddpool.com | live | Next.js React SSR (/_next/static/chunks 1749,3994,5250,8069,9660); ... | API at https://api.oddpool.com + WS at wss://feeds.oddpool.com/ws; ... | - | 11 | - | 0 | Aggregates Kalshi + Polymarket APIs (peer venues); oddpool position... | Free $0 (1 req/s,1000 quota) | Pro $30/mo (10 req/s,1M quota... | 0 |
| oddschecker.com | live | Mixed legacy AngularJS + modern Next.js-style app (static.oddscheck... | api.oddschecker.com (ODDSCHECKER_API 'https://api.oddschecker.com/a... | Cloudflare in front of www (403 bot wall to urllib on live site); i... | 3 | - | 0 | Opta (VIEW_OPTA_FACTS string in OC+ bundle references; 'View Opta f..., Stripe (billing), ProsperStack (subscription portal) (+3) | OC+ Essential £9.99/month ('less than 35p per day'); OC+ Pre... | 2 |
| oddsjam.com | live | Next.js-style app behind Cloudflare (robots.txt confirms /api/backe... | Express-style /api/backend/* (live response captured) | Cloudflare (bot wall on unauthenticated API fetch)cdn.oddsjam.com +... | 3 | - | 0 | sportsbook odds via own scraping layer (book logos on GCS; book fla... | subscription (tiers NOT re-verified this run) | 0 |
| oddspapi.io | live | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 1 | - | 0 | NOT CONFIRMED | Free (250 req/mo), Custom Plan, B2B Plan | 1 |
| oddspedia.com | live | Nuxt (Vue) behind Cloudflare (window.__NUXT__/Cloudflare markers) | NOT CONFIRMED | CloudflareCloudflare | - | - | 0 | Sportradar + DraftKings + FanDuel strings present in homepage (role... | - | 0 |
| oddsportal.com | live | Next.js (App Router, Turbopack chunks, RSC/React Server Components,... | NOT CONFIRMED — no server framework exposed in headers (nginx front... | Custom edge cache (headers x-dc: TT2, x-cache: cached, x-hash: true... | - | - | 2 | Opta (asset opta_logo.3kpl4yp9m91ot.svg loaded on homepage — likely... | - | 4 |
| oddsshopper.com | live | Next.js (_next/static chunks; bf6a786c chunk saved) | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | Bookmaker references in homepage: Pinnacle, DraftKings, FanDuel (od... | a $6 price string present on homepage (tier context NOT CONF... | 0 |
| oddstrader.com | live | React SPA (webpack chunks on otcdn.virginia.us-east-1.oddstrader.co... | Microservice gateway at ms.virginia.us-east-1.oddstrader.com with t... | Google Cloud (Cloud Functions us-central1, Firebase project oddstra... | 4 | - | 1 | Advision Feeds (advisionfeeds.com — httpproxy host http.virginia.us..., Firebase/Google Cloud, Square (payments, squarePayConfig) (+3) | Subscription managed through App Store (apps.apple.com/accou... | 2 |
| oddsview.com | dead | NOT CONFIRMED (Vercel hosting only evidence) | NOT CONFIRMED | VercelVercel edge (cle1) | - | - | 0 | - | HISTORICAL: was free, then pay-to-view (2024, per Reddit) be... | 4 |
| og.com | live | Next.js (app router; chunks on web-assets.og.com asset domain) | NOT CONFIRMED | CloudFront via 1.1 d779abd... + Cloudflare edgeCloudflare + CloudFront | - | - | 0 | - | No subscription; trading platform with contract prices $0.01... | 3 |
| okaybet.app | walled | {'value': '_next/static', 'citation': 'raw/px_okaybet_app_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_okaybet... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_okaybet_app_... | 0 |
| onyxodds.com | live | Webflow (cdn.prod.website-files.com site 69ff17734f8534eae93a17e7) ... | NOT CONFIRMED | Cloudflare + CloudFrontCloudflare + CloudFront | - | - | 0 | - | No subscription; free-to-play sweepstakes + deposit promos (... | 4 |
| openmundi.github.io | live | static GitHub Pages | none (world.db datasets) | GitHub PagesGitHub Pages | - | - | 0 | public domain dedication | free public domain | 0 |
| opticodds.com | live | {'value': 'react', 'citation': 'raw/px_opticodds_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['statsperform', 'kalshi', 'Kalshi', 'sportradar', 'Sport... | {'value': ['free'], 'citation': 'raw/px_opticodds_com_home.r... | 0 |
| optimaldfs.com | live | Joomla CMS (meta generator 'Joomla! - Open Source Content Managemen... | Apache with PHP/7.1.33 (x-powered-by header) (raw/scan-optimaldfs_c... | NOT CONFIRMED (no cloud/CDN markers; direct Apache origin)NOT CONFI... | 1 | - | 0 | NOT CONFIRMED (no vendor strings in raw files) | - | 0 |
| orderbook.trade | walled | {'value': 'tailwind', 'citation': 'raw/px_orderbook_trade_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_orderbook_trade_hom... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_orderbook_tr... | 0 |
| ostium.com | live | {'value': '_next/static', 'citation': 'raw/px_ostium_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_ostium_com_home.raw'} | {'value': ['free'], 'citation': 'raw/px_ostium_com_home.raw'... | 0 |
| outlier.bet | live | React/Redux SPA (redux-toolkit refs in bundle) | api.outlier.bet REST + possible graphql endpoint | AWS (aws-amplify SDK in bundle -> Cognito auth)NOT CONFIRMED | 3 | - | 0 | sportsbook odds comparison (own collection) | subscription; App Store listing captured raw/outlier_bet_ext... | 0 |
| pandascore.co | live | Docs portal on ReadMe.io; marketing site (app subdomain) | REST API at api.pandascore.co (v2-style resource routes) + WebSocke... | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | first-party official esports data: 13 major titles (LoL, CS, DotA2,... | Plan ladder confirmed; price numbers NOT CONFIRMED in saved ... | 0 |
| parsec.fi | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_parsec_fi_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_parsec_fi_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_parsec_fi_ho... | 0 |
| pff.com | live | Custom JS SPA-ish site (hashed /js/*-<sha>.js bundles; shared_nav b... | Same-origin REST under www.pff.com/api/* (fantasy leagues POST, /ap... | Cloudflare (server: cloudflare, cf-ray ...-IAH); auth via clerk.pff... | 6 | - | 0 | First-party: PFF grades/Premium Stats are their own charted data (3... | Free tier $0; PFF+ Monthly $9.99/mo; PFF+ Annual $99.99/yr (... | 4 |
| picktheodds.app | live | Next.js + React behind Cloudflare (dedicated app pages: /expectedva... | NOT CONFIRMED | CloudflareCloudflare | - | - | 0 | Pinnacle, DraftKings, FanDuel odds references | Price points $0/$1/$10/$20/$100/$110/$130/$150/$160/$170/$10... | 0 |
| pigeon.trade | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_pigeo... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_pigeon_trade_home.r... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_pigeon_trade... | 0 |
| pikkit.com | live | Webflow marketing site (cdn.prod.website-files.com, d3e54v103j8qbb.... | app.pikkit.com app backend; links.pikkit.com deep links | Netlify build artifact present (2ac24b63...netlify.app); Cloudflare... | - | - | 0 | BookSync: automatic sportsbook bet sync ('Learn more about BookSync... | App Store app | 0 |
| pizzint.watch | live | {'value': '_next/static', 'citation': 'raw/px_pizzint_watch_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_pizzint... | {'value': ['Free'], 'citation': 'raw/px_pizzint_watch_home.r... | 0 |
| play.google.com | live | {'value': 'angular', 'citation': 'raw/dycers-playstore.html'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket', 'kalshi', 'Kalshi'], 'citati... | {'value': ['free'], 'citation': 'raw/dycers-playstore.html'} | 0 |
| playerprops.ai | live | Next.js (__className_578517 pattern; Vercel-style HTML) | Next.js API routes | Vercel (likely)NOT CONFIRMED | 2 | - | 0 | NOT CONFIRMED | deep-link app confirmed via AASA/assetlinks | 0 |
| pm.wiki | live | {'value': 'React', 'citation': 'raw/brosonpm.trade__home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['sportradar', 'KALSHI', 'POLYMARKET', 'Sportradar', 'Kal... | {'value': ['free', 'Free', 'FREE', 'enterprise'], 'citation'... | 0 |
| polyalerthub.com | live | {'value': '_next/static', 'citation': 'raw/px_polyalerthub_com_home... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_polyale... | {'value': ['free', 'free plan'], 'citation': 'raw/px_polyale... | 0 |
| polybot.trading | live | {'value': '_next/static', 'citation': 'raw/px_polybot_trading_home.... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_polybot... | {'value': ['Free'], 'citation': 'raw/px_polybot_trading_home... | 0 |
| polybro.app | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_polybro_app_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polybro_app_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polybro_app_... | 0 |
| polyburg.com | live | {'value': '_next/static', 'citation': 'raw/px_polyburg_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_polybur... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyburg_com... | 0 |
| polycool.live | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_polyc... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_polycoo... | {'value': ['Free'], 'citation': 'raw/px_polycool_live_home.r... | 0 |
| polycopy.app | live | {'value': '_next/static', 'citation': 'raw/px_polycopy_app_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'POLYMARKET', 'polymarket'], 'citation': '... | {'value': ['free', 'Free', 'FREE', 'Free Tier'], 'citation':... | 0 |
| polycule.trade | walled | {'value': '_next/static', 'citation': 'raw/px_polycule_trade_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_polycule_trade_home.r... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polycule_tra... | 0 |
| polyfactual.com | walled | {'value': '_next/static', 'citation': 'raw/px_polyfactual_com_home.... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_polyfactual_com_home.... | {'value': ['enterprise', 'Enterprise'], 'citation': 'raw/px_... | 0 |
| polyfakeit.com | walled | {'value': 'vite', 'citation': 'raw/px_polyfakeit_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_polyfakeit_com_home.r... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyfakeit_c... | 0 |
| polyfund.so | walled | {'value': '_next/static', 'citation': 'raw/px_polyfund_so_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_polyfund_so_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyfund_so_... | 0 |
| polyguana.com | live | {'value': 'react', 'citation': 'raw/px_polyguana_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Kalshi', 'Polymarket'], 'citation': 'raw/px_polyguana_c... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyguana_co... | 0 |
| polyhedg.com | live | {'value': '_next/static', 'citation': 'raw/px_polyhedg_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyhedg_com_home.r... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyhedg_com... | 0 |
| polyinsider.io | live | {'value': '_next/static', 'citation': 'raw/px_polyinsider_io_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_polyins... | {'value': ['free'], 'citation': 'raw/px_polyinsider_io_home.... | 0 |
| polylayer.xyz | walled | {'value': '_next/static', 'citation': 'raw/px_polylayer_xyz_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket'], 'citation': 'raw/px_polylay... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polylayer_xy... | 0 |
| polym.trade | live | {'value': '_next/static', 'citation': 'raw/polymarket-docs_polymark... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket', 'opTa', 'PolyMarket'], 'cita... | {'value': ['free', 'Free'], 'citation': 'raw/polymarket-docs... | 0 |
| polymarket.com | live | Next.js React SSR (/_next/static/chunks). Homepage HTML 299KB; bund... | Multi-service: Gamma API (markets metadata), CLOB API (trading), St... | - | 7 | - | 0 | NOT CONFIRMED (self-hosted markets; no third-party sports vendor st... | - | 0 |
| polymarket.tips | live | {'value': '_next/static', 'citation': 'raw/polymarket-docs_polymark... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket', 'opTa', 'PolyMarket'], 'cita... | {'value': ['free', 'Free'], 'citation': 'raw/polymarket-docs... | 0 |
| polymarketanalytics.com | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_polymarketanalytics_... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polymarketanalytics... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polymarketan... | 0 |
| polymarketdash.com | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_polymarketdash_com_h... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polymarketdash_com_... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polymarketda... | 0 |
| polymaster.io | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_polym... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_polymas... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polymaster_i... | 0 |
| polynoob.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_polyn... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket', 'PolyMarket'], 'citation': '... | {'value': ['free'], 'citation': 'raw/px_polynoob_com_home.ra... | 0 |
| polyoracle.com | walled | {'value': '_next/static', 'citation': 'raw/px_polyoracle_com_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi'], 'citation': 'raw/px_polyoracle_... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyoracle_c... | 0 |
| polyprophet.com | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_polyprophet_com_home... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyprophet_com_hom... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyprophet_... | 0 |
| polypulse.tech | live | {'value': '_next/static', 'citation': 'raw/px_polypulse_tech_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_polypulse_tech_home.r... | {'value': ['free', 'Free'], 'citation': 'raw/px_polypulse_te... | 0 |
| polyradar.io | live | {'value': 'React', 'citation': 'raw/px_polyradar_io_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyradar_io_home.r... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyradar_io... | 0 |
| polyrouter.io | walled | {'value': '_next/static', 'citation': 'raw/px_polyrouter_io_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi', 'kalshi', 'polymarket', 'Manifol... | {'value': ['free tier', 'Free'], 'citation': 'raw/px_polyrou... | 0 |
| polyscalping.org | live | {'value': '_next/static', 'citation': 'raw/px_polyscalping_org_home... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket'], 'citation': 'raw/px_polysca... | {'value': ['Free'], 'citation': 'raw/px_polyscalping_org_hom... | 0 |
| polyseer.xyz | live | {'value': '_next/static', 'citation': 'raw/px_polyseer_xyz_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi', 'polymarket', 'kalshi'], 'citati... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyseer_xyz... | 0 |
| polysights.xyz | walled | {'value': '_next/static', 'citation': 'raw/px_polysights_xyz_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_polysig... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polysights_x... | 0 |
| polysimplr.com | walled | {'value': '_next/static', 'citation': 'raw/px_polysimplr_com_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket', 'Kalshi', 'kalshi'], 'citati... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polysimplr_c... | 0 |
| polytale.live | walled | {'value': '_next/static', 'citation': 'raw/px_polytale_live_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket', 'PolyMarket'], 'citation': '... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polytale_liv... | 0 |
| polyteller.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_polyt... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_polytel... | {'value': ['Free'], 'citation': 'raw/px_polyteller_com_home.... | 0 |
| polytrack.cash | live | {'value': '_next/static', 'citation': 'raw/px_polytrack_cash_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_polytra... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polytrack_ca... | 0 |
| polytrader.ai | walled | {'value': '_next/static', 'citation': 'raw/px_polytrader_ai_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_polytra... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polytrader_a... | 0 |
| polytrend.xyz | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_polytrend_xyz_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polytrend_xyz_home.... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polytrend_xy... | 0 |
| polywallet.info | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_polyw... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polywallet_info_hom... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polywallet_i... | 0 |
| polyxbot.org | walled | {'value': '_next/static', 'citation': 'raw/px_polyxbot_org_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_polyxbot_org_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_polyxbot_org... | 0 |
| poolgenius.teamrankings.com | live | Apache-served custom site + GTM | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | Splash Sports (paid partnership, contest entry) | price strings $21/$39/$49/$98/$176 (tier map NOT CONFIRMED);... | 0 |
| predictfolio.com | live | {'value': '_next/static', 'citation': 'raw/px_predictfolio_com_home... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket', 'kalshi'], 'citation': 'raw/... | {'value': ['free'], 'citation': 'raw/px_predictfolio_com_hom... | 0 |
| predicting.top | live | {'value': 'react', 'citation': 'raw/px_predicting_top_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi', 'polymarket', 'kalshi'], 'citati... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_predicting_t... | 0 |
| predictiondata.io | live | SPA (marketing shell + JS-loaded pricing) | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | aggregates sportsbook + prediction-market feeds (Pinnacle/Kalshi/Po... | - | 0 |
| predictionhunt.com | live | {'value': '_next/static', 'citation': 'raw/px_predictionhunt_com_ho... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['kalshi', 'polymarket', 'Kalshi', 'Polymarket'], 'citati... | {'value': ['Free', 'free'], 'citation': 'raw/px_predictionhu... | 0 |
| predictionindex.xyz | walled | {'value': '_next/static', 'citation': 'raw/px_predictionindex_xyz_h... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'kalshi'], 'citation': 'raw/px_predictioni... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_predictionin... | 0 |
| predictionnews.com | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_predictionnews_com_h... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_predictionnews_com_... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_predictionne... | 0 |
| predicts.guru | live | {'value': '_next/static', 'citation': 'raw/fanduel_com_predicts_hom... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'sportradar'], 'citation': 'raw/fanduel_co... | {'value': ['free', 'Free'], 'citation': 'raw/fanduel_com_pre... | 0 |
| predictshark.io | walled | {'value': '_next/static', 'citation': 'raw/px_predictshark_io_home.... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_predictshark_io_home.... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_predictshark... | 0 |
| prediedge.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_predi... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_prediedge_com_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_prediedge_co... | 0 |
| predly.ai | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_predl... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi'], 'citation': 'raw/px_predly_ai_h... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_predly_ai_ho... | 0 |
| predscan.io | live | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_predscan_io_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_predscan_io_robots.... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_predscan_io_... | 0 |
| pro.oddsassist.com | live | NOT CONFIRMED (no framework marker in saved homepage) | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | Pinnacle, DraftKings, FanDuel odds references | Price points observed: $5, $10, $20, $25, $50, $100, $250, $... | 0 |
| probalytics.io | live | {'value': 'nuxt', 'citation': 'raw/px_probalytics_io_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi', 'polymarket', 'kalshi', 'POLYMAR... | {'value': ['free'], 'citation': 'raw/px_probalytics_io_home.... | 0 |
| propfinder.app | live | Next.js (X-Powered-By: Next.js), React (+3) | .NET (Hangfire job-scheduler dashboards at hangfire/hangfire-odds s..., nginx/1.24.0 (Ubuntu) | DigitalOcean (web www/staging: 104.131.63.28, api: 45.55.120.10, ha..., NOT CONFIRMED - no CF-RAY/x-vercel-id/Via headers; served directly ... | 3 | - | 0 | NOT CONFIRMED - no sportradar/statsperform/opta/genius/the-odds-api... | Free $0; Monthly $14.99 USD/month (Stripe price_1RGL0fC4i2Oo... | 3 |
| prophetnotes.com | live | {'value': 'vite', 'citation': 'raw/px_prophetnotes_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_prophet... | {'value': ['free', 'Free'], 'citation': 'raw/px_prophetnotes... | 0 |
| prophetx.co | live | {'value': 'nuxt', 'citation': 'raw/prophetx.co_home.html'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['sportradar'], 'citation': 'raw/prophetx.co_home.html'} | {'value': ['free', 'Free'], 'citation': 'raw/prophetx.co_hom... | 0 |
| prophetx.com | live | prophetx.com: WordPress (WP Engine); prophetx.co: Nuxt/Vue SPA | NOT CONFIRMED (SPA; API not exposed in small _nuxt chunks) | prophetx.co: CloudFront (via header); prophetx.com: WP Engine + Clo... | - | - | 0 | - | App Store: ProphetX Prediction Market, id6504584166 | 3 |
| props.cash | live | JS SPA | Heroku + Express (Server header + Via: 1.1 vegur on direct probe) | HerokuCloudflare | 2 | - | 0 | sportsbook odds (aggregation, vendor NOT CONFIRMED) | subscription tiers NOT re-verified this run | 0 |
| propsbot.ai | live | WordPress (wp-json exposed) | PHP/WordPress | NOT CONFIRMEDNOT CONFIRMED | 1 | - | 0 | NOT CONFIRMED | - | 0 |
| propsiq.app | live | Next.js on Vercel (x-vercel-id cle1) + SvelteKit immutable chunk na... | NOT CONFIRMED (API robots-disallowed) | VercelVercel edge (x-vercel-id cle1::x628n) | - | - | 0 | Statcast (MLB public data) | Monthly CA$17.99/mo; Annual CA$189.99/yr (one plan, two bill... | 0 |
| propsmadness.com | live | Next.js (React), Chakra-style fonts (chakrapetch), data-dpl deploym... | NOT CONFIRMED (server-rendered Next.js; no client API routes exposed) | Vercel-style dpl ids behind Cloudflare (data-dpl-id, ?dpl= build pa... | - | - | 0 | - | subscription exists; /premium + /billing-portal pages presen... | 1 |
| propsoptimizer.com | live | Next.js + GTM; has /.well-known/ai-plugin.json (ChatGPT plugin mani... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | DraftKings, FanDuel, Underdog, PrizePicks, BetMGM line comparison +... | freemium: 'Access premium data free with ads' + Go Pro ad-fr... | 0 |
| pydfs-lineup-optimizer.readthedocs.io | live | Sphinx docs site | Python library (pip-installable) | readthedocs.io hostingreadthedocs | - | - | 0 | - | Free open source (MIT-class); no paid tiers | 0 |
| quickintel.io | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_quick... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_quickintel_io_home.... | {'value': ['free', 'Free', 'enterprise'], 'citation': 'raw/p... | 0 |
| rainmaker.fun | walled | {'value': '_next/static', 'citation': 'raw/px_rainmaker_fun_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi', 'polymarket'], 'citation': 'raw/... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_rainmaker_fu... | 0 |
| rithmm.com | live | Webflow (window.__WEBFLOW_CURRENCY_SETTINGS in pricing page) + app ... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | - | $29.99/mo, $49.99/mo (Scout usage included), $99.99/mo tier;... | 0 |
| robin.markets | live | {'value': '_next/static', 'citation': 'raw/px_robin_markets_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_robin_markets_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_robin_market... | 0 |
| rotogrinders.com | live | content platform + tools | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | SimLabs product | 0 | DK/FD contest feeds (inferred) | $39.99/mo to $129.99/mo tiers ($9.99-$29.99 3-day trials; 6/... | 0 |
| rotowire.com | live | {'value': 'vIte', 'citation': 'raw/px_rotowire_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_rotowire_com_home.r... | {'value': ['Free', 'free'], 'citation': 'raw/px_rotowire_com... | 0 |
| rotowire.com/dfs | walled | NOT CONFIRMED (home 403; no JS bundles fetched) | NOT CONFIRMED (origin behind Cloudflare, cf-ray a38048374ac12c8f-DFW) | Cloudflare edge (server: cloudflare on all requests, raw/scan-rotow... | - | - | 0 | - | - | 3 |
| sabersim.com | live | Angular-style SPA (polyfills/main chunks captured) | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 1 | simulations power lineup sims (product copy) | 0 | DK/FD contest feeds (inferred) | $7 for 7 days trial; $97 / $197 / $297 per month tiers | 9 |
| seda.xyz | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_seda_... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'Polymarket', 'kalshi', 'Kalshi'], 'citati... | {'value': ['free'], 'citation': 'raw/px_seda_xyz_home.raw'} | 0 |
| semanticlayer.io | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_seman... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_semanticlayer_io_ho... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_semanticlaye... | 0 |
| sharpeterminal.com | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_sharpeterminal_com_h... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_sharpeterminal_com_... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_sharpetermin... | 0 |
| sharplines.ai | live | SPA marketing site; GTM-K2S59D92, Google Ads AW-752478570, GA4 G-61... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | NOT CONFIRMED | - | 0 |
| simmer.markets | live | {'value': 'react', 'citation': 'raw/px_simmer_markets_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi', 'polymarket'], 'citation': 'raw/... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_simmer_marke... | 0 |
| soccertipsters.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_socce... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_soccertipsters_com_... | {'value': ['free', 'Free'], 'citation': 'raw/px_soccertipste... | 0 |
| sportmonks.com | live | WordPress marketing site (WP Engine header, Stimmt.digital build) | Proprietary REST API v2/v3 (my.sportmonks.com portal + data API) | Cloudflare + WP EngineCloudflare | 2 | - | 0 | First-party data collector; 99.99% uptime / 6.4B API requests per m... | - | 0 |
| sportradar.com | live | Marketing site Next.js React (Vercel cle1:iad1 edge). Developer doc... | API host https://api.sportradar.com serving Odds Comparison v2 (pre... | - | 6 | - | 0 | Sportradar is itself a primary odds/data vendor — Odds Comparison a... | - | 0 |
| sports-ai.dev | live | Next.js on Vercel + Stripe | /api/checkout_sessions (Stripe checkout route) | Vercel + StripeVercel | - | - | 0 | 40+ bookmakers odds scanned | $6.99/$12.99/$34.99/$99.00 price points observed | 0 |
| sportsapi.com | live | Custom ASP.NET-style server-rendered site behind Cloudflare (cf-ray... | Not exposed — informational directory site, no public API of its own | Cloudflare-proxiedCloudflare (cf-ray present every response) | - | - | 0 | Aggregates third-party vendor listings: FantasyNerds, FantasyData.c... | No own pricing; publishes third-party vendor prices (e.g. AP... | 0 |
| sportsdata.io | live | ASP.NET MVC + AngularJS 1.x templates ({{operation.Method}} binding... | Microsoft IIS/10.0 + ASP.NET (x-powered-by); API behind Azure API M... | Azure (APIM), IIS on Windowsvarnish fronting (via: 1.1 varnish); cd... | 6 | CONFIRMED only as product name: 'Offseason Game Simulations API' — simulation... | 0 | self-described full-stack provider (own data collection) | public prices NOT CONFIRMED on-site (sales-contact model). R... | 4 |
| sportsgameodds.com | live | {'value': '_next/static', 'citation': 'raw/px_sportsgameodds_com_ho... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi', 'the-odds-api', 'sportradar', 'S... | {'value': ['Free tier', 'Free', 'free', 'free tier'], 'citat... | 0 |
| sportshandle.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_sport... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['kalshi', 'Kalshi', 'polymarket', 'Polymarket'], 'citati... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_sportshandle... | 0 |
| sportstensor.com | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_sportstensor_com_hom... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_sportstensor_com_ho... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_sportstensor... | 0 |
| sportstrade.io | live | Plain PHP-served HTML + jQuery 3.4.1/jquery-ui, Swiper 11, firebase... | PHP (server: Apache; AJAX endpoints are *.php scripts: a_api.php, a... | Apache on unnamed host; no Cloudflare/Vercel/AWS headers seenNo com... | 3 | - | 0 | No commercial data vendor found (sportradar/statsperform/opta/geniu... | No public per-tip price list captured; credits purchased the... | 2 |
| stand.trade | live | {'value': '_next/static', 'citation': 'raw/px_stand_trade_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi'], 'citation': 'raw/px_stand_trade... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_stand_trade_... | 0 |
| statisticsports.com | live | Server-rendered HTML + vanilla JS bundle public_base-e77736ccdb.js ... | Custom server app (form-POST login 'login_form', hidden product_pri... | Cloudflare (server: cloudflare; cf-ray a3802e464824bd31-DFW on home... | - | - | 0 | No third-party data vendor named anywhere in homepage, pricing page... | Lite 17.00 EUR/month; Deluxe 37.00 EUR/month; Platinum 77.00... | 3 |
| statpal.io | live | {'value': 'react', 'citation': 'raw/batch2_statpal_io_apiprobe.txt'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\batch2_statpal_io_apip... | {'value': ['free', 'Free'], 'citation': 'raw/batch2_statpal_... | 0 |
| statpick.ai | live | Next.js + GTM, Cloudflare-fronted | NOT CONFIRMED | CloudflareCloudflare | - | - | 0 | stats + odds aggregation (testimonial: 'replaced 3 apps'); specific... | free tier ('Start free - no payment required') + upgrade; pr... | 0 |
| statsniper.com | live | Next.js + Stripe, Cloudflare-fronted | NOT CONFIRMED | Cloudflare + StripeCloudflare | - | - | 0 | NOT CONFIRMED | price strings $5/$17/$19.99/$30/$100-$191.90 (tier map NOT C... | 0 |
| stocktwits.com | live | {'value': '_next/static', 'citation': 'raw/px_stocktwits_com_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['opta', 'Opta', 'Polymarket', 'polymarket'], 'citation':... | {'value': ['enterprise'], 'citation': 'raw/px_stocktwits_com... | 0 |
| stokastic.com | live | Next.js (Vercel; dpl build ids in HTML) | Next API routes + /api/checkout/redirect (Stripe) | VercelVercel | 5 | - | 0 | DK/FD contest feeds (inferred) | tiered /mo subscriptions via Stripe (plan_SpybXQ7gngTLJY, pl... | 0 |
| suibets.com | walled | {'value': 'Vite', 'citation': 'raw/px_suibets_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_suibets_com_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_suibets_com_... | 0 |
| synthesis.trade | live | {'value': '_next/static', 'citation': 'raw/px_synthesis_trade_home.... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'kalshi'], 'citation': 'raw/px_synthesis_t... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_synthesis_tr... | 0 |
| the-odds-api.com | live | VuePress static site (hashed webpack bundles /assets/js/app.77b96ff... | REST API on api.the-odds-api.com behind AWS CloudFront (via: '1.1 .... | AWS (CloudFront edge, x-amz-cf-id response header)CloudFront | 6 | NOT APPLICABLE | 0 | direct bookmaker feed aggregation — covered bookmakers incl. DraftK... | Starter FREE 500 credits/mo; 20K $30/mo; 100K $59/mo; 5M $11... | 5 |
| thefantasyfootballers.com | live | {'value': 'react', 'citation': 'raw/px_thefantasyfootballers_com_ho... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_thefantasyfootballe... | {'value': ['Free', 'free'], 'citation': 'raw/px_thefantasyfo... | 0 |
| theover.ai | live | Laravel Livewire (livewire.min.js saved) behind Cloudflare + GTM — ... | PHP/Laravel Livewire app | CloudflareCloudflare | - | - | 0 | DraftKings/FanDuel strings; arbitrage explainer content on page | strings $19/$31/$42/$57/$64 (tier map NOT CONFIRMED) | 0 |
| therundown.io | live | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 1 | - | 0 | NOT CONFIRMED | Free ($0), Starter ($49/mo), Pro ($149/mo), Ultra ($399/mo) | 0 |
| thesolver.com | live | Next.js (React) static-exported pages; X-Powered-By: Next.js; __NEX... | ASP.NET Core on AWS Lambda (api.thesolver.com and api-sim.thesolver... | AWS (Lambda + S3 bucket the-solver-prod.s3.us-east-2.amazonaws.com ... | 4 | "tens of thousands" per contest; exact number varies by slate and contest (NO... | 2 | ETR / Establish The Run (default player projections; company founde..., Partner projection sync: MoonshotsMLB, BallPark Pal (user-synced th..., DraftKings, FanDuel, Yahoo, DraftStars (lineup export targets) | {'optimizer_single_lineup_simulator': '$24.99/mo or $224.29/... | 2 |
| thesportsdb.com | live | Server-rendered PHP (XHTML-strict error pages); JS: app.rybbit.io/a... | PHP server-rendered (apache-style error pages) | NOT CONFIRMEDNOT CONFIRMED (local /js/ paths) | 3 | - | 0 | NOT CONFIRMED - crowd-sourced (user-contributed data/artwork, edito... | Free tier + Premium (USD 9-tier visible on pricing/api page;... | 2 |
| tokenterminal.com | live | {'value': '_next/static', 'citation': 'raw/px_tokenterminal_com_hom... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_tokenterminal_com_h... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_tokentermina... | 0 |
| trade.fun | live | {'value': 'react', 'citation': 'raw/brosonpm.trade__home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['kalshi', 'polymarket', 'Kalshi', 'Polymarket', 'Opta'],... | {'value': ['free', 'Free', '$150 pro', 'FREE'], 'citation': ... | 0 |
| trade360.com | walled | NOT CONFIRMED | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | - | - | 0 |
| tradingtechnologies.com | live | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_tradingtechnologies_... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_tradingtechnologies... | {'value': ['enterprise', 'Enterprise'], 'citation': 'raw/px_... | 0 |
| truegamestats.com | live | Squarespace placeholder ("Coming Soon") | NOT CONFIRMED (none exposed) | SquarespaceSquarespace/UploadServer + varnish (via header) | - | - | 0 | - | - | 0 |
| tryokbet.com | walled | {'value': 'vite', 'citation': 'raw/px_tryokbet_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'Kalshi'], 'citation': 'raw/px_tryokbet_co... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_tryokbet_com... | 0 |
| turbinefi.com | live | {'value': '_next/static', 'citation': 'raw/px_turbinefi_com_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Kalshi', 'Polymarket', 'kalshi', 'polymarket', 'Manifol... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_turbinefi_co... | 0 |
| txodds.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_txodd... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_txodds_com_home.raw'} | {'value': ['Enterprise', 'enterprise'], 'citation': 'raw/px_... | 0 |
| uma.rocks | walled | {'value': '_next/static', 'citation': 'raw/px_uma_rocks_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket', 'polymarket'], 'citation': 'raw/px_uma_roc... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_uma_rocks_ho... | 0 |
| unabated.com | live | Modern SPA/SSR app with full commerce state inline ('gssp' markers,... | Stripe Checkout commerce (price_ IDs embedded); package/price objec... | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | DraftKings, FanDuel referenced on homepage, first-party projections for props | Full price matrix in page JSON (Stripe-backed): Premium thro... | 0 |
| underdogfantasy.com/predict | live | Webflow marketing shell over app (cdn.prod.website-files.com/67d86b... | NOT CONFIRMED (app behind shell) | Cloudflare edge (server: cloudflare, cf-ray -IAH)Cloudflare + Webfl... | - | - | 0 | - | N/A — free-to-entry pickem/DFS product with paid entry (UDX ... | 2 |
| underdogsports.com | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_under... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_underdogsports_com_... | {'value': ['free', 'FREE'], 'citation': 'raw/px_underdogspor... | 0 |
| unifai.network | walled | {'value': '_next/static', 'citation': 'raw/px_unifai_network_home.r... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['polymarket', 'PolyMarket', 'Polymarket'], 'citation': '... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_unifai_netwo... | 0 |
| upside.tools | live | Next.js | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | - | - | 0 | 30+ sportsbooks scanned; Pinnacle/DraftKings/FanDuel strings presen... | 5-day free trial ($0 today, card required), then 'From $59.9... | 0 |
| useliquid.xyz | walled | {'value': '_next/static', 'citation': 'raw/px_useliquid_xyz_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_useliquid_xyz_home.... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_useliquid_xy... | 0 |
| userocket.app | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_usero... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_userocket_app_home.... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_userocket_ap... | 0 |
| vercel.app | live | {'value': '_next/static', 'citation': 'raw/px_vercel_app_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['Polymarket'], 'citation': 'raw/px_vercel_app_home.raw'} | {'value': ['enterprise', 'Enterprise', 'free'], 'citation': ... | 0 |
| verso.trading | live | {'value': 'live site, framework unclear', 'citation': 'raw/px_verso... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_verso_trading_home.... | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_verso_tradin... | 0 |
| vsin.com/pro | live | WordPress (wp-json, Newspaper/td theme classes) + custom VSiN Pro c... | WordPress REST (wp-json/oembed observed) | NOT CONFIRMEDCloudflare (cf-ray DFW) | 1 | - | 0 | Opta (Opta AI prop projections), Fantasy Points (WR/CB matchup tool) | - | 4 |
| wethr.net | walled | {'value': 'live site, framework unclear', 'citation': 'raw/px_wethr... | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': ['kalshi', 'polymarket', 'Polymarket', 'Kalshi'], 'citati... | {'value': ['free'], 'citation': 'raw/px_wethr_net_home.raw'} | 0 |
| wintherace.info | live | WordPress + Stripe + GTM | NOT CONFIRMED | CloudflareCloudflare | - | 200K simulations per race ('200K Simulations + FMV') | 0 | NOT CONFIRMED | $90 / $200 price points (tier map NOT CONFIRMED) | 0 |
| yesorno.ai | live | Vike (vite-plugin-ssr successor) + React + NutUI component lib, Vit... | NOT CONFIRMED (site now NXDOMAIN) | Cloudflare (static.cloudflareinsights.com beacon in archived page; ... | - | - | 0 | - | dead domain (NXDOMAIN on https+http as of 2026-09-08) | 0 |
| zapper.xyz | walled | {'value': 'NOT CONFIRMED', 'citation': 'raw/px_zapper_xyz_home.raw'} | NOT CONFIRMED | NOT CONFIRMEDNOT CONFIRMED | 2 | - | 0 | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_zapper_xyz_home.raw'} | {'value': 'NOT CONFIRMED', 'citation': 'raw\\px_zapper_xyz_h... | 0 |

## Extracted algorithm evidence (36 domains)
| domain | formulas | num_sims | correlation |
|---|---|---|---|
| actionnetwork.com | 1 | - | NOT CONFIRMED |
| bankrollszn.com | 0 | - | correlation in strategy content only; sim correlat |
| betbetter.world | 0 | 20,000 per game (marketing claim on homepage) | NOT CONFIRMED |
| betql.co | 0 | 10,000 simulations per game (stated on homepage) | NOT CONFIRMED |
| birdievantage.com | 0 | 10,000+ tournament simulations per slate (made-cut prob, finish distributions, floors/ceilings) | NOT CONFIRMED |
| covers.com | 1 | - | NOT CONFIRMED |
| crazyninjaodds.com | 0 | Monte Carlo Simulator listed as a tool (nav); parameters NOT CONFIRMED | NOT CONFIRMED |
| dailyfantasyfuel.com | 1 | - | NOT CONFIRMED |
| dailyfantasyoptimizer.com | 1 | - | Stacking tools (same-game stacks); 'Avoid Opposing |
| dataforceff.com | 1 | - | NOT CONFIRMED |
| dgfantasy.com | 1 | - | NOT CONFIRMED (getCorrelationSportOrLeague suggest |
| establishtherun.com | 1 | - | NOT CONFIRMED |
| fantasycruncher.com | 0 | n/a (optimizer focus) | n/a |
| fantasypoints.com | 2 | - | NOT CONFIRMED |
| fantasyteamadvice.com | 0 | - | Betting tools implement same-game-parley correlati |
| github.com/BenBrostoff/draftfast | 1 | none (deterministic optimizer) | none |
| github.com/chanzer0/MLB-DFS-Tools | 1 | GPP contest simulator (src/mlb_gpp_simulator.py) | NOT CONFIRMED |
| github.com/eddwebster/football_analytics | 2 | - | NOT CONFIRMED |
| github.com/floodlight-sports/floodlight | 1 | - | NOT CONFIRMED |
| github.com/georgedouzas/sports-betting | 2 | n/a | n/a |
| github.com/jscanga/Sports-Arbitrage-Finder | 1 | - | NOT CONFIRMED |
| github.com/martineastwood/penaltyblog | 3 | Monte Carlo helpers in models module | Dixon-Coles low-score adjustment |
| github.com/n-roth12/DFSLineupOptimizer | 1 | - | NOT CONFIRMED |
| github.com/pretrehr/Sports-betting | 1 | - | NOT CONFIRMED |
| github.com/sedemmler/WagerBrain | 1 | - | NOT CONFIRMED |
| github.com/sportsdataverse (org) | 2 | n/a | n/a |
| github.com/tonyntran/fantasy-auction-assistant | 2 | - | NOT CONFIRMED |
| lineupdrafter.com | 1 | - | NOT CONFIRMED |
| oddsportal.com | 2 | - | NOT CONFIRMED |
| oddstrader.com | 1 | - | NOT CONFIRMED |
| rotogrinders.com | 0 | SimLabs product | NOT CONFIRMED |
| sabersim.com | 0 | simulations power lineup sims (product copy) | NOT CONFIRMED |
| sportsdata.io | 0 | CONFIRMED only as product name: 'Offseason Game Simulations API' — simulation count NOT CONFIRMED | NOT CONFIRMED |
| the-odds-api.com | 0 | NOT APPLICABLE | NOT APPLICABLE |
| thesolver.com | 2 | "tens of thousands" per contest; exact number varies by slate and contest (NOT CONFIRMED beyond this wording) | explicit same-team and same-game player correlatio |
| wintherace.info | 0 | 200K simulations per race ('200K Simulations + FMV') | NOT CONFIRMED |

## Data supply chain rollup (298 vendors)
- dk/fd contest feeds (inferred) — 5 domains: awesemo.com, fantasycruncher.com, rotogrinders.com, sabersim.com, stokastic.com
- recaptcha — 2 domains: actionnetwork.com, establishtherun.com
- bookmaker odds feeds — 2 domains: github.com/pretrehr/Sports-betting, github.com/sedemmler/WagerBrain
- pinnacle, draftkings, fanduel odds references — 2 domains: picktheodds.app, pro.oddsassist.com
- {'value': ['polymarket', 'polymarket', 'opta', 'polymarket'], 'citation': 'raw/polymarket-docs_polymarket_com_.txt'} — 2 domains: polym.trade, polymarket.tips
- integrations surfaced on homepage: espn, sleeper (account/import links, not confirmed data vendors) — 1 domains: 4for4.com
- stripe (payments, pk_live key in page config) — 1 domains: actionnetwork.com
- rudderstack (analytics) — 1 domains: actionnetwork.com
- microsoft clarity + vwo + google analytics + facebook pixel (analytics) — 1 domains: actionnetwork.com
- rollbar (errors) — 1 domains: actionnetwork.com
- onetrust (consent) — 1 domains: actionnetwork.com
- butter cms (butter key) + leaddyno (affiliate) — 1 domains: actionnetwork.com
- apple/google/spotify oauth clients — 1 domains: actionnetwork.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_adanos_org_home.raw'} — 1 domains: adanos.org
- {'value': 'not confirmed', 'citation': 'raw\\i_oddsshopper_com_js___next_static_chunks_bf6a786c_af04107773f583ad_js.js.txt'} — 1 domains: adj.news
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_aixbet_ai_home.raw'} — 1 domains: aixbet.ai
- {'value': 'not confirmed', 'citation': 'raw\\px_alerts_chat_home.raw'} — 1 domains: alerts.chat
- {'value': ['polymarket', 'kalshi', 'manifold', 'polymarket', 'kalshi', 'manifold'], 'citation': 'raw/px_alphascope_app_home.raw'} — 1 domains: alphascope.app
- {'value': 'not confirmed', 'citation': 'raw\\apifootball-docs-v3.txt'} — 1 domains: apifootball.com
- {'value': 'not confirmed', 'citation': 'raw\\px_apisoccer_com_home.raw'} — 1 domains: apisoccer.com
- {'value': ['kalshi', 'polymarket'], 'citation': 'raw/dycers-appstore.html'} — 1 domains: apps.apple.com
- {'value': 'not confirmed', 'citation': 'raw\\px_artemisanalytics_com_home.raw'} — 1 domains: artemisanalytics.com
- {'value': 'not confirmed', 'citation': 'raw\\b2-astron_markets-home.html'} — 1 domains: astron.markets
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/b2-aura_money-home.html'} — 1 domains: aura.money
- {'value': ['balldontlie', 'balldontlie'], 'citation': 'raw/batch2_balldontlie_io_apiprobe.txt'} — 1 domains: balldontlie.io
- {'value': 'not confirmed', 'citation': 'raw\\px_ballparkpal_com_home.raw'} — 1 domains: ballparkpal.com
- {'value': 'not confirmed', 'citation': 'raw\\b2-bankr_bot-home.html'} — 1 domains: bankr.bot
- nflverse — 1 domains: bankrollszn.com
- {'value': ['polymarket'], 'citation': 'raw/b2-baozi_bet-home.html'} — 1 domains: baozi.bet
- {'value': 'not confirmed', 'citation': 'raw\\b2-based_one-home.html'} — 1 domains: based.one
- {'value': 'not confirmed', 'citation': 'raw\\b2-bbb_community-home.html'} — 1 domains: bbb.community
- {'value': 'not confirmed', 'citation': 'raw\\berryinvesting.com__home.raw'} — 1 domains: berryinvesting.com
- bookmaker prices displayed per-outcome ('tap any price to add it to your slip'); sportsbook names not confirmed — 1 domains: betbetter.world
- teamrankings historical data pedigree (sister domain) — 1 domains: betiq.teamrankings.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/betmoar.fun__chunk-big.raw'} — 1 domains: betmoar.fun
- 'exclusive public betting data' + expert betting data + community consensus ('trending bets' combines model, sharp, community) — 1 domains: betql.co
- polymarket moneyline picks article surfaced (coverage expansion) — 1 domains: betql.co
- brand name suggests betradar is itself a vendor to other sportsbooks (not a consumer of upstream); no upstream vendor strings (sportradar/statsperform/opta/fantasydata) found in fetched js — 1 domains: betradar.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/betstack.app__chunk-index.raw'} — 1 domains: betstack.app
- b2b odds-feed positioning: 'powering the pro odds screen and sportsbook pricing feed'; 'market makers hang lines, exchanges seed markets, and prediction markets price contracts - all off the same true line'; widget-ready odds for affiliate placements; 200+ books claimed on pro odds screen — 1 domains: betstamp.com
- {'value': 'not confirmed', 'citation': 'raw\\px_bettingdata_com_home.raw'} — 1 domains: bettingdata.com
- fantasypros (parent brand — shared player videos cdn.fantasypros.com, api.fantasypros.com cross-calls, fantasypros nav) — 1 domains: bettingpros.com
- braze (messaging) — 1 domains: bettingpros.com
- mixpanel + meta pixel + aws rum (analytics) — 1 domains: bettingpros.com
- pubfig/pubnetwork (ads) — 1 domains: bettingpros.com
- onetrust — 1 domains: bettingpros.com
- onesignal-adjacent btloader.com tag — 1 domains: bettingpros.com
- user-to-user order matching — no traditional odds vendor; 'instead of a sportsbook setting the price, you trade with real people' — 1 domains: bettoredge.com
- {'value': 'not confirmed', 'citation': 'raw\\billybets.ai__home.raw'} — 1 domains: billybets.ai
- data golf (projections + strokes-gained source, named explicitly) — 1 domains: birdievantage.com
- {'value': 'not confirmed', 'citation': 'raw\\blockworks.com__home.raw'} — 1 domains: blockworks.com
- {'value': 'not confirmed', 'citation': 'raw\\px_brokersports_com_home.raw'} — 1 domains: brokersports.com
- {'value': 'not confirmed', 'citation': 'raw\\brosonpm.trade__home.raw'} — 1 domains: brosonpm.trade
- {'value': ['opta', 'opta'], 'citation': 'raw/px_cbssports_com_home.raw'} — 1 domains: cbssports.com
- {'value': 'not confirmed', 'citation': 'raw\\px_cheatsheetwarroom_com_home.raw'} — 1 domains: cheatsheetwarroom.com
- {'value': 'not confirmed', 'citation': 'raw\\b45_com_clickhouse_com_home.txt'} — 1 domains: clickhouse.com
- {'value': 'not confirmed', 'citation': 'no-evidence'} — 1 domains: clutch.market
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/b45_com_compose_build_home.txt'} — 1 domains: compose.build
- {'value': 'not confirmed', 'citation': 'raw\\b45_com_converge_market_home.txt'} — 1 domains: converge.market
- {'value': 'not confirmed', 'citation': 'raw\\b45_com_cookie_fun_home.txt'} — 1 domains: cookie.fun
- adobe (analytics/launch) — 1 domains: covers.com
- cookiebot (consent) — 1 domains: covers.com
- jquery/floatthead/swiper (ui libs) — 1 domains: covers.com
- affiliate scripts (affscript.js) — 1 domains: covers.com
- draftkings/fanduel as contest integration targets — 1 domains: dailyfantasyoptimizer.com
- sportsdata.io (live stats feed - homepage logo row: 'our live stats feed comes from sportsdata.io') — 1 domains: dataforceff.com
- 4for4 (projections integrate with 'the wonk') — 1 domains: dataforceff.com
- fantasy nerds (projections) — 1 domains: dataforceff.com
- fantasypros (accuracy logo) — 1 domains: dataforceff.com
- fantasycalc (linked) — 1 domains: dataforceff.com
- {'value': 'not confirmed', 'citation': 'raw\\px_datalayer_xyz_home.raw'} — 1 domains: datalayer.xyz
- {'value': 'not confirmed', 'citation': 'raw\\px_datarade_ai_home.raw'} — 1 domains: datarade.ai
- {'value': 'not confirmed', 'citation': 'raw\\deepnewz.com.html'} — 1 domains: deepnewz.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/defillama.com.html'} — 1 domains: defillama.com
- {'value': 'not confirmed', 'citation': 'raw\\dexu.ai.html'} — 1 domains: dexu.ai
- {'value': 'not confirmed', 'citation': 'raw\\px_dfshero_com_home.raw'} — 1 domains: dfshero.com
- bookmaker integrations observed: betmgm, draftkings, fanduel, william hill (odds/affiliate links; feed vendor not confirmed) — 1 domains: dimers.com
- {'value': ['polymarket', 'kalshi'], 'citation': 'raw/dimes.fi.html'} — 1 domains: dimes.fi
- {'value': ['polymarket', 'polymarket', 'kalshi', 'kalshi'], 'citation': 'raw/domeapi.io.assets.js'} — 1 domains: domeapi.io
- {'value': 'not confirmed', 'citation': 'raw\\px_donbest_com_home.raw'} — 1 domains: donbest.com
- mfl/espn/nfl strings present (league-import links, not confirmed data vendors) — 1 domains: draftsharks.com
- {'value': 'not confirmed', 'citation': 'raw\\dune.api-root.json'} — 1 domains: dune.com
- {'value': ['polymarket', 'kalshi'], 'citation': 'raw/px_elastics_ai_home.raw'} — 1 domains: elastics.ai
- {'value': 'not confirmed', 'citation': 'raw\\px_elontweets_live_home.raw'} — 1 domains: elontweets.live
- sportsdata.io (footer sponsor logo, cdn.establishtherun.com/.../sportsdataio-dark-270.png) — 1 domains: establishtherun.com
- sparkloop (newsletter referral, js.sparkloop.app/team_a5a08658b31b.js) — 1 domains: establishtherun.com
- metorik (woo helper) — 1 domains: establishtherun.com
- {'value': ['kalshi', 'polymarket'], 'citation': 'raw/px_eventarb_com_home.raw'} — 1 domains: eventarb.com
- {'value': ['polymarket', 'kalshi', 'polymarket'], 'citation': 'raw/px_eventwaves_io_home.raw'} — 1 domains: eventwaves.io
- {'value': 'not confirmed', 'citation': 'raw\\px_fake-a-polymarket_com_home.raw'} — 1 domains: fake-a-polymarket.com
- first-party espn data — 1 domains: fantasy.espn.com
- {'value': 'not confirmed', 'citation': 'raw\\px_fantasycalc_com_home.raw'} — 1 domains: fantasycalc.com
- positions as data vendor: 'fantasy rankings, dfs tools, player stats' homepage; sportsdata.io + espn strings present — 1 domains: fantasydata.com
- {'value': ['sportsdata.io'], 'citation': 'raw/px_fantasyfootballcalculator_com_home.raw'} — 1 domains: fantasyfootballcalculator.com
- draftkings/fanduel contest feeds (inferred from product) not confirmed — 1 domains: fantasylabs.com
- league sync ('my teams' synced leagues) — 1 domains: fantasylife.com
- tools: strength of schedule, player stats, rookie super model — 1 domains: fantasylife.com
- {'value': 'not confirmed', 'citation': 'raw\\batch2_fantasynerds_com_apiprobe.txt'} — 1 domains: fantasynerds.com
- fantasydata (string present in homepage html) — 1 domains: fantasypoints.com
- 'opta' and 'espn' strings present in homepage (exact role unconfirmed) — 1 domains: fantasypros.com
- {'value': 'not confirmed', 'citation': 'raw\\px_feedinco_com_home.raw'} — 1 domains: feedinco.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_fereai_xyz_home.raw'} — 1 domains: fereai.xyz
- {'value': 'not confirmed', 'citation': 'raw\\px_firefly_social_home.raw'} — 1 domains: firefly.social
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_fireplace_gg_home.raw'} — 1 domains: fireplace.gg
- {'value': ['polymarket', 'polymarket', 'polymarket'], 'citation': 'raw/px_firepolymarket_com_home.raw'} — 1 domains: firepolymarket.com
- self: first-party football data provider (opta-style licensed data not confirmed) — 1 domains: football-data.org
- first-party yahoo data; public fantasy api with oauth (positioning) — 1 domains: football.fantasysports.yahoo.com
- open data community (open sports & friends forum) — 1 domains: footballcsv.github.io
- no vendor strings (sportradar/statsperform/opta etc.) in homepage — 1 domains: footballguys.com
- {'value': 'not confirmed', 'citation': 'raw\\px_forcazt_xyz_home.raw'} — 1 domains: forcazt.xyz
- {'value': 'not confirmed', 'citation': 'raw\\px_fractionai_xyz_home.raw'} — 1 domains: fractionai.xyz
- {'value': 'not confirmed', 'citation': 'raw\\px_frontseat_co_home.raw'} — 1 domains: frontseat.co
- affiliate sportsbook offers surfaced ($200 / $350 bonus-bet ctas, $10-deposit-$25 + free month of goat product); espn string present — 1 domains: ftnfantasy.com
- {'value': 'not confirmed', 'citation': 'raw\\px_future_fun_home.raw'} — 1 domains: future.fun
- genius sports is itself a primary official-data vendor: 25 homepage refs to nfl (official league data partner) and 13 refs to fiba; 'official data' positioning. no upstream vendor strings (sportradar/statsperform/opta) found in fetched assets. — 1 domains: geniussports.com
- {'value': ['kalshi', 'polymarket', 'kalshi', 'polymarket', 'polymarket'], 'citation': 'raw/px_getarbitragebets_com_home.raw'} — 1 domains: getarbitragebets.com
- fanduel, draftkings (scraped) — 1 domains: github.com/bakedziti88/sportsbook-api
- draftkings salaries csv — 1 domains: github.com/BenBrostoff/draftfast
- fanduel salaries csv — 1 domains: github.com/BenBrostoff/draftfast
- opta, metrica sports (notebook datasets) — 1 domains: github.com/eddwebster/football_analytics
- football-data.co.uk — 1 domains: github.com/georgedouzas/sports-betting
- sportsbook odds (names not confirmed) — 1 domains: github.com/jscanga/Sports-Arbitrage-Finder
- fbref — 1 domains: github.com/martineastwood/penaltyblog
- understat — 1 domains: github.com/martineastwood/penaltyblog
- draftkings, fanduel, yahoo (salary csvs) — 1 domains: github.com/n-roth12/DFSLineupOptimizer
- nfl shield api — 1 domains: github.com/sportsdataverse (org)
- espn apis — 1 domains: github.com/sportsdataverse (org)
- mlb stats api — 1 domains: github.com/sportsdataverse (org)
- baseball savant — 1 domains: github.com/sportsdataverse (org)
- cfbd — 1 domains: github.com/sportsdataverse (org)
- vegas sportsbook odds aggregation (thespread.io) — 1 domains: github.com/thespread/api
- sleeper, espn — 1 domains: github.com/tonyntran/fantasy-auction-assistant
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_goldsky_com_home.raw'} — 1 domains: goldsky.com
- {'value': ['polymarket'], 'citation': 'raw/px_gondor_fi_home.raw'} — 1 domains: gondor.fi
- rights-holder data supplier: official esports data via riot, esl, blast partnerships; sells to 'fantasy and betting operators'; also 'grid play / grid esports' consumer products — 1 domains: grid.gg
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_hashdive_com_home.raw'} — 1 domains: hashdive.com
- {'value': ['polymarket'], 'citation': 'raw/px_hyperodd_com_home.raw'} — 1 domains: hyperodd.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_inside_fyi_home.raw'} — 1 domains: inside.fyi
- {'value': 'not confirmed', 'citation': 'raw\\px_isportsapi_com_home.raw'} — 1 domains: isportsapi.com
- {'value': 'not confirmed', 'citation': 'raw\\px_jsonodds_com_home.raw'} — 1 domains: jsonodds.com
- sportsbook-sync verification: 'every bet is synced straight from the sportsbook' — verified handicapper records; specific books not confirmed — 1 domains: juicereel.com
- {'value': ['kalshi', 'polymarket', 'kalshi', 'polymarket'], 'citation': 'raw/px_kairos_trade_home.raw'} — 1 domains: kairos.trade
- {'value': 'not confirmed', 'citation': 'raw\\px_kaito_ai_home.raw'} — 1 domains: kaito.ai
- {'value': ['polymarket', 'polymarket', 'kalshi', 'kalshi'], 'citation': 'raw/px_kuest_com_home.raw'} — 1 domains: kuest.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_layerhub_xyz_home.raw'} — 1 domains: layerhub.xyz
- draftkings as export/integration target — 1 domains: lineupdrafter.com
- lsports is itself an upstream vendor: data from 'over 100 live sources' covering 100+ sports; scouts feed powered by 1,000+ trained on-site scouts + low-latency tv sources with per-event quality controllers; sister/related product trade360 (margin customization vs 'industry benchmarks and leading bookies odds') is positioned as the odds-provider tool alongside oddservice. no reliance on sportradar/statsperform/opta admitted (0 mentions) - they market as a sportradar alternative. — 1 domains: lsports.eu
- {'value': ['polymarket'], 'citation': 'raw/px_marketlens_trade_home.raw'} — 1 domains: marketlens.trade
- {'value': 'not confirmed', 'citation': 'raw\\px_markiumpro_com_home.raw'} — 1 domains: markiumpro.com
- {'value': ['polymarket', 'kalshi'], 'citation': 'raw/px_matchr_xyz_home.raw'} — 1 domains: matchr.xyz
- {'value': ['polymarket', 'kalshi'], 'citation': 'raw/px_mentionmarkets_com_home.raw'} — 1 domains: mentionmarkets.com
- {'value': 'not confirmed', 'citation': 'raw\\batch2_metabet_ai_home.html'} — 1 domains: metabet.ai
- {'value': ['manifold', 'manifold'], 'citation': 'raw/px_metaforecast_org_home.raw'} — 1 domains: metaforecast.org
- {'value': 'not confirmed', 'citation': 'raw\\px_mobyscreener_com_home.raw'} — 1 domains: mobyscreener.com
- {'value': 'not confirmed', 'citation': 'raw\\px_monitoredtips_com_home.raw'} — 1 domains: monitoredtips.com
- {'value': 'not confirmed', 'citation': 'raw\\px_moonshotsmlb_com_home.raw'} — 1 domains: moonshotsmlb.com
- {'value': ['opta'], 'citation': 'raw/px_netlify_app_home.raw'} — 1 domains: netlify.app
- {'value': 'not confirmed', 'citation': 'raw\\px_nevua_markets_home.raw'} — 1 domains: nevua.markets
- {'value': ['opta'], 'citation': 'raw/px_ninjatrader_com_home.raw'} — 1 domains: ninjatrader.com
- {'value': ['polymarket'], 'citation': 'raw/px_notboring_co_home.raw'} — 1 domains: notboring.co
- sportradar (17 string hits in bundle) — 1 domains: novig.com
- sportsdata.io (2 hits) — 1 domains: novig.com
- opta (39 hits, incl possible minified false positives) — 1 domains: novig.com
- {'value': ['kalshi', 'polymarket', 'kalshi', 'polymarket'], 'citation': 'raw/px_octagonai_co_home.raw'} — 1 domains: octagonai.co
- aggregates kalshi + polymarket apis (peer venues); oddpool positions itself as the data provider layering whales/arbitrage on top — 1 domains: oddpool.com
- opta (view_opta_facts string in oc+ bundle references; 'view opta facts' ui feature) — 1 domains: oddschecker.com
- stripe (billing) — 1 domains: oddschecker.com
- prosperstack (subscription portal) — 1 domains: oddschecker.com
- unleash feature flags (gitlab occloud.io) — 1 domains: oddschecker.com
- diffusion (pushtechnology real-time streaming) — 1 domains: oddschecker.com
- sentry (error monitoring) — 1 domains: oddschecker.com
- sportsbook odds via own scraping layer (book logos on gcs; book flags incl. exchanges + prediction markets) — 1 domains: oddsjam.com
- sportradar + draftkings + fanduel strings present in homepage (roles not confirmed) — 1 domains: oddspedia.com
- opta (asset opta_logo.3kpl4yp9m91ot.svg loaded on homepage — likely data attribution partner; 'data by' footer string present) — 1 domains: oddsportal.com
- bookmaker references in homepage: pinnacle, draftkings, fanduel (odds comparison sources; feed vendor not confirmed) — 1 domains: oddsshopper.com
- advision feeds (advisionfeeds.com — httpproxy host http.virginia.us-east-1.advisionfeeds.com and 'advisiondevelopment-data-provider' webpack chunk names; advisionid field on events) — 1 domains: oddstrader.com
- firebase/google cloud — 1 domains: oddstrader.com
- square (payments, squarepayconfig) — 1 domains: oddstrader.com
- configcat (feature flags) — 1 domains: oddstrader.com
- mixpanel + gtm (analytics) — 1 domains: oddstrader.com
- sentry — 1 domains: oddstrader.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_okaybet_app_home.raw'} — 1 domains: okaybet.app
- public domain dedication — 1 domains: openmundi.github.io
- {'value': ['statsperform', 'kalshi', 'kalshi', 'sportradar', 'sportradar'], 'citation': 'raw/px_opticodds_com_home.raw'} — 1 domains: opticodds.com
- {'value': 'not confirmed', 'citation': 'raw\\px_orderbook_trade_home.raw'} — 1 domains: orderbook.trade
- {'value': 'not confirmed', 'citation': 'raw\\px_ostium_com_home.raw'} — 1 domains: ostium.com
- sportsbook odds comparison (own collection) — 1 domains: outlier.bet
- first-party official esports data: 13 major titles (lol, cs, dota2, valorant highlighted); also powers 'fantasy' product and odds product page — 1 domains: pandascore.co
- {'value': 'not confirmed', 'citation': 'raw\\px_parsec_fi_home.raw'} — 1 domains: parsec.fi
- first-party: pff grades/premium stats are their own charted data (32 pro teams, seasons of grades). no sportradar/statsperform/opta/genius strings in fetched bundles (all 0 hits). clerk = auth vendor; status.pff.com exists; restish (rest.sh) cli is the supported client. — 1 domains: pff.com
- {'value': 'not confirmed', 'citation': 'raw\\px_pigeon_trade_home.raw'} — 1 domains: pigeon.trade
- booksync: automatic sportsbook bet sync ('learn more about booksync') — sportsbook account-linking integrations, names not confirmed — 1 domains: pikkit.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_pizzint_watch_home.raw'} — 1 domains: pizzint.watch
- {'value': ['polymarket', 'polymarket', 'kalshi', 'kalshi'], 'citation': 'raw/dycers-playstore.html'} — 1 domains: play.google.com
- {'value': ['sportradar', 'kalshi', 'polymarket', 'sportradar', 'kalshi', 'polymarket'], 'citation': 'raw/brosonpm.trade__home.raw'} — 1 domains: pm.wiki
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polyalerthub_com_home.raw'} — 1 domains: polyalerthub.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polybot_trading_home.raw'} — 1 domains: polybot.trading
- {'value': 'not confirmed', 'citation': 'raw\\px_polybro_app_home.raw'} — 1 domains: polybro.app
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polyburg_com_home.raw'} — 1 domains: polyburg.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polycool_live_home.raw'} — 1 domains: polycool.live
- {'value': ['polymarket', 'polymarket', 'polymarket'], 'citation': 'raw/px_polycopy_app_home.raw'} — 1 domains: polycopy.app
- {'value': ['polymarket'], 'citation': 'raw/px_polycule_trade_home.raw'} — 1 domains: polycule.trade
- {'value': ['polymarket'], 'citation': 'raw/px_polyfactual_com_home.raw'} — 1 domains: polyfactual.com
- {'value': ['polymarket'], 'citation': 'raw/px_polyfakeit_com_home.raw'} — 1 domains: polyfakeit.com
- {'value': ['polymarket'], 'citation': 'raw/px_polyfund_so_home.raw'} — 1 domains: polyfund.so
- {'value': ['kalshi', 'polymarket'], 'citation': 'raw/px_polyguana_com_home.raw'} — 1 domains: polyguana.com
- {'value': 'not confirmed', 'citation': 'raw\\px_polyhedg_com_home.raw'} — 1 domains: polyhedg.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polyinsider_io_home.raw'} — 1 domains: polyinsider.io
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polylayer_xyz_home.raw'} — 1 domains: polylayer.xyz
- {'value': 'not confirmed', 'citation': 'raw\\px_polymarketanalytics_com_home.raw'} — 1 domains: polymarketanalytics.com
- {'value': 'not confirmed', 'citation': 'raw\\px_polymarketdash_com_home.raw'} — 1 domains: polymarketdash.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polymaster_io_home.raw'} — 1 domains: polymaster.io
- {'value': ['polymarket', 'polymarket', 'polymarket'], 'citation': 'raw/px_polynoob_com_home.raw'} — 1 domains: polynoob.com
- {'value': ['polymarket', 'kalshi'], 'citation': 'raw/px_polyoracle_com_home.raw'} — 1 domains: polyoracle.com
- {'value': 'not confirmed', 'citation': 'raw\\px_polyprophet_com_home.raw'} — 1 domains: polyprophet.com
- {'value': ['polymarket'], 'citation': 'raw/px_polypulse_tech_home.raw'} — 1 domains: polypulse.tech
- {'value': 'not confirmed', 'citation': 'raw\\px_polyradar_io_home.raw'} — 1 domains: polyradar.io
- {'value': ['polymarket', 'kalshi', 'kalshi', 'polymarket', 'manifold', 'manifold'], 'citation': 'raw/px_polyrouter_io_home.raw'} — 1 domains: polyrouter.io
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polyscalping_org_home.raw'} — 1 domains: polyscalping.org
- {'value': ['polymarket', 'kalshi', 'polymarket', 'kalshi'], 'citation': 'raw/px_polyseer_xyz_home.raw'} — 1 domains: polyseer.xyz
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polysights_xyz_home.raw'} — 1 domains: polysights.xyz
- {'value': ['polymarket', 'polymarket', 'kalshi', 'kalshi'], 'citation': 'raw/px_polysimplr_com_home.raw'} — 1 domains: polysimplr.com
- {'value': ['polymarket', 'polymarket', 'polymarket'], 'citation': 'raw/px_polytale_live_home.raw'} — 1 domains: polytale.live
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polyteller_com_home.raw'} — 1 domains: polyteller.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polytrack_cash_home.raw'} — 1 domains: polytrack.cash
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_polytrader_ai_home.raw'} — 1 domains: polytrader.ai
- {'value': 'not confirmed', 'citation': 'raw\\px_polytrend_xyz_home.raw'} — 1 domains: polytrend.xyz
- {'value': 'not confirmed', 'citation': 'raw\\px_polywallet_info_home.raw'} — 1 domains: polywallet.info
- {'value': ['polymarket'], 'citation': 'raw/px_polyxbot_org_home.raw'} — 1 domains: polyxbot.org
- splash sports (paid partnership, contest entry) — 1 domains: poolgenius.teamrankings.com
- {'value': ['polymarket', 'polymarket', 'kalshi'], 'citation': 'raw/px_predictfolio_com_home.raw'} — 1 domains: predictfolio.com
- {'value': ['polymarket', 'kalshi', 'polymarket', 'kalshi'], 'citation': 'raw/px_predicting_top_home.raw'} — 1 domains: predicting.top
- aggregates sportsbook + prediction-market feeds (pinnacle/kalshi/polymarket/draftkings named as product surfaces) — 1 domains: predictiondata.io
- {'value': ['kalshi', 'polymarket', 'kalshi', 'polymarket'], 'citation': 'raw/px_predictionhunt_com_home.raw'} — 1 domains: predictionhunt.com
- {'value': ['polymarket', 'kalshi'], 'citation': 'raw/px_predictionindex_xyz_home.raw'} — 1 domains: predictionindex.xyz
- {'value': 'not confirmed', 'citation': 'raw\\px_predictionnews_com_home.raw'} — 1 domains: predictionnews.com
- {'value': ['polymarket', 'sportradar'], 'citation': 'raw/fanduel_com_predicts_home.html'} — 1 domains: predicts.guru
- {'value': ['polymarket'], 'citation': 'raw/px_predictshark_io_home.raw'} — 1 domains: predictshark.io
- {'value': ['polymarket'], 'citation': 'raw/px_prediedge_com_home.raw'} — 1 domains: prediedge.com
- {'value': ['polymarket', 'kalshi'], 'citation': 'raw/px_predly_ai_home.raw'} — 1 domains: predly.ai
- {'value': 'not confirmed', 'citation': 'raw\\px_predscan_io_robots.raw'} — 1 domains: predscan.io
- {'value': ['polymarket', 'kalshi', 'polymarket', 'kalshi', 'polymarket'], 'citation': 'raw/px_probalytics_io_home.raw'} — 1 domains: probalytics.io
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_prophetnotes_com_home.raw'} — 1 domains: prophetnotes.com
- {'value': ['sportradar'], 'citation': 'raw/prophetx.co_home.html'} — 1 domains: prophetx.co
- sportsbook odds (aggregation, vendor not confirmed) — 1 domains: props.cash
- statcast (mlb public data) — 1 domains: propsiq.app
- draftkings, fanduel, underdog, prizepicks, betmgm line comparison + direct slip send — 1 domains: propsoptimizer.com
- {'value': 'not confirmed', 'citation': 'raw\\px_quickintel_io_home.raw'} — 1 domains: quickintel.io
- {'value': ['polymarket', 'kalshi', 'polymarket'], 'citation': 'raw/px_rainmaker_fun_home.raw'} — 1 domains: rainmaker.fun
- {'value': ['polymarket'], 'citation': 'raw/px_robin_markets_home.raw'} — 1 domains: robin.markets
- {'value': 'not confirmed', 'citation': 'raw\\px_rotowire_com_home.raw'} — 1 domains: rotowire.com
- {'value': ['polymarket', 'polymarket', 'kalshi', 'kalshi'], 'citation': 'raw/px_seda_xyz_home.raw'} — 1 domains: seda.xyz
- {'value': 'not confirmed', 'citation': 'raw\\px_semanticlayer_io_home.raw'} — 1 domains: semanticlayer.io
- {'value': 'not confirmed', 'citation': 'raw\\px_sharpeterminal_com_home.raw'} — 1 domains: sharpeterminal.com
- {'value': ['polymarket', 'kalshi', 'polymarket'], 'citation': 'raw/px_simmer_markets_home.raw'} — 1 domains: simmer.markets
- {'value': 'not confirmed', 'citation': 'raw\\px_soccertipsters_com_home.raw'} — 1 domains: soccertipsters.com
- first-party data collector; 99.99% uptime / 6.4b api requests per month claim; football + cricket + f1 api products — 1 domains: sportmonks.com
- sportradar is itself a primary odds/data vendor — odds comparison aggregator across 140+ global bookmakers (oc core) and 9 us bookmakers (default prematch pipeline); not confirmed as consumer of upstream stats vendors from fetched docs — 1 domains: sportradar.com
- 40+ bookmakers odds scanned — 1 domains: sports-ai.dev
- aggregates third-party vendor listings: fantasynerds, fantasydata.com, cricketapi, footballapi, statpal, goalserve, api-sports.io, sportmonks, the odds api, jsonodds, horseapi, broker sports; also lists betradar, bettingdata.com, allsports api, balldontlie — 1 domains: sportsapi.com
- self-described full-stack provider (own data collection) — 1 domains: sportsdata.io
- {'value': ['polymarket', 'kalshi', 'the-odds-api', 'sportradar', 'sportradar'], 'citation': 'raw/px_sportsgameodds_com_home.raw'} — 1 domains: sportsgameodds.com
- {'value': ['kalshi', 'kalshi', 'polymarket', 'polymarket'], 'citation': 'raw/px_sportshandle_com_home.raw'} — 1 domains: sportshandle.com
- {'value': 'not confirmed', 'citation': 'raw\\px_sportstensor_com_home.raw'} — 1 domains: sportstensor.com
- no commercial data vendor found (sportradar/statsperform/opta/genius: 0 hits). footer link-exchange to nowgoal livescore (free livescore site) and 'white label tipping apps' partner links (monitoredtips.com, soccertipsters.com, betfame.com, feedinco.com) - suggests a tipster-network/white-label operator family. — 1 domains: sportstrade.io
- {'value': ['polymarket', 'kalshi'], 'citation': 'raw/px_stand_trade_home.raw'} — 1 domains: stand.trade
- no third-party data vendor named anywhere in homepage, pricing page, or public js (sportradar/statsperform/opta/genius all 0 hits). positioning is first-party football statistics since 2013 plus b2b2c angle ('trusted by major sportsbooks', new 'prediction markets' section on homepage). — 1 domains: statisticsports.com
- {'value': 'not confirmed', 'citation': 'raw\\batch2_statpal_io_apiprobe.txt'} — 1 domains: statpal.io
- stats + odds aggregation (testimonial: 'replaced 3 apps'); specific feeds not confirmed — 1 domains: statpick.ai
- {'value': ['opta', 'opta', 'polymarket', 'polymarket'], 'citation': 'raw/px_stocktwits_com_home.raw'} — 1 domains: stocktwits.com
- {'value': 'not confirmed', 'citation': 'raw\\px_suibets_com_home.raw'} — 1 domains: suibets.com
- {'value': ['polymarket', 'kalshi'], 'citation': 'raw/px_synthesis_trade_home.raw'} — 1 domains: synthesis.trade
- direct bookmaker feed aggregation — covered bookmakers incl. draftkings, fanduel, betmgm, caesars, bovada, mybookie.ag, unibet, william hill, ladbrokes, betfair, bet victor, paddy power, 1xbet, pinnacle, sportsbet, tab, neds — 1 domains: the-odds-api.com
- {'value': 'not confirmed', 'citation': 'raw\\px_thefantasyfootballers_com_home.raw'} — 1 domains: thefantasyfootballers.com
- draftkings/fanduel strings; arbitrage explainer content on page — 1 domains: theover.ai
- etr / establish the run (default player projections; company founded by etr founders - in-house) — 1 domains: thesolver.com
- partner projection sync: moonshotsmlb, ballpark pal (user-synced third-party premium projections) — 1 domains: thesolver.com
- draftkings, fanduel, yahoo, draftstars (lineup export targets) — 1 domains: thesolver.com
- {'value': 'not confirmed', 'citation': 'raw\\px_tokenterminal_com_home.raw'} — 1 domains: tokenterminal.com
- {'value': ['kalshi', 'polymarket', 'kalshi', 'polymarket', 'opta'], 'citation': 'raw/brosonpm.trade__home.raw'} — 1 domains: trade.fun
- {'value': 'not confirmed', 'citation': 'raw\\px_tradingtechnologies_com_home.raw'} — 1 domains: tradingtechnologies.com
- {'value': ['polymarket', 'kalshi'], 'citation': 'raw/px_tryokbet_com_home.raw'} — 1 domains: tryokbet.com
- {'value': ['kalshi', 'polymarket', 'kalshi', 'polymarket', 'manifold'], 'citation': 'raw/px_turbinefi_com_home.raw'} — 1 domains: turbinefi.com
- {'value': 'not confirmed', 'citation': 'raw\\px_txodds_com_home.raw'} — 1 domains: txodds.com
- {'value': ['polymarket', 'polymarket'], 'citation': 'raw/px_uma_rocks_home.raw'} — 1 domains: uma.rocks
- draftkings, fanduel referenced on homepage — 1 domains: unabated.com
- first-party projections for props — 1 domains: unabated.com
- {'value': 'not confirmed', 'citation': 'raw\\px_underdogsports_com_home.raw'} — 1 domains: underdogsports.com
- {'value': ['polymarket', 'polymarket', 'polymarket'], 'citation': 'raw/px_unifai_network_home.raw'} — 1 domains: unifai.network
- 30+ sportsbooks scanned; pinnacle/draftkings/fanduel strings present; prizepicks result context (25x verified claim) — 1 domains: upside.tools
- {'value': 'not confirmed', 'citation': 'raw\\px_useliquid_xyz_home.raw'} — 1 domains: useliquid.xyz
- {'value': 'not confirmed', 'citation': 'raw\\px_userocket_app_home.raw'} — 1 domains: userocket.app
- {'value': ['polymarket'], 'citation': 'raw/px_vercel_app_home.raw'} — 1 domains: vercel.app
- {'value': 'not confirmed', 'citation': 'raw\\px_verso_trading_home.raw'} — 1 domains: verso.trading
- opta (opta ai prop projections) — 1 domains: vsin.com/pro
- fantasy points (wr/cb matchup tool) — 1 domains: vsin.com/pro
- {'value': ['kalshi', 'polymarket', 'polymarket', 'kalshi'], 'citation': 'raw/px_wethr_net_home.raw'} — 1 domains: wethr.net
- {'value': 'not confirmed', 'citation': 'raw\\px_zapper_xyz_home.raw'} — 1 domains: zapper.xyz

## Build-priority gaps (297 domains with flags)
Flags: api=no API architecture confirmed, no-algo-evidence=no formulas/sims found, pricing=all tiers NOT CONFIRMED, no-pain-data=empty community pain.
| domain | disp | flags |
|---|---|---|
| 4for4.com | live | no-algo-evidence,pricing,no-pain-data |
| adanos.org | live | no-algo-evidence,no-pain-data |
| adj.news | live | no-algo-evidence,no-pain-data |
| advisionfeeds.com | dead | api,no-algo-evidence,pricing,no-pain-data |
| aixbet.ai | walled | no-algo-evidence,no-pain-data |
| alerts.chat | walled | no-algo-evidence,no-pain-data |
| allsportsapi.com | live | no-algo-evidence |
| alphascope.app | live | no-algo-evidence,no-pain-data |
| api-sports.io | live | no-algo-evidence,pricing,no-pain-data |
| api-tennis.com | live | no-algo-evidence |
| apifootball.com | live | no-algo-evidence,no-pain-data |
| apisoccer.com | walled | no-algo-evidence,no-pain-data |
| apps.apple.com | live | no-algo-evidence,no-pain-data |
| artemisanalytics.com | live | no-algo-evidence,no-pain-data |
| astron.markets | live | no-algo-evidence,no-pain-data |
| aura.money | live | no-algo-evidence,no-pain-data |
| awesemo.com | live | no-algo-evidence,no-pain-data |
| balldontlie.io | live | no-algo-evidence,no-pain-data |
| ballparkpal.com | live | no-algo-evidence,no-pain-data |
| bankr.bot | live | no-algo-evidence,no-pain-data |
| bankrollszn.com | live | no-algo-evidence,pricing |
| baozi.bet | live | no-algo-evidence,no-pain-data |
| based.one | live | no-algo-evidence,no-pain-data |
| bbb.community | live | no-algo-evidence,no-pain-data |
| berryinvesting.com | live | no-algo-evidence,no-pain-data |
| betbetter.world | live | no-pain-data |
| betfame.com | live | api,no-algo-evidence,no-pain-data |
| betiq.teamrankings.com | live | no-algo-evidence,pricing,no-pain-data |
| betmoar.fun | live | no-algo-evidence,no-pain-data |
| betql.co | live | pricing,no-pain-data |
| betradar.com | walled | no-algo-evidence,pricing,no-pain-data |
| betsapi.com | walled | api,no-algo-evidence |
| betstack.app | live | no-algo-evidence,no-pain-data |
| betstamp.com | live | no-algo-evidence,no-pain-data |
| bettingdata.com | walled | no-algo-evidence,no-pain-data |
| bettingpros.com | live | no-algo-evidence |
| bettoredge.com | live | no-algo-evidence,no-pain-data |
| billybets.ai | live | no-algo-evidence,no-pain-data |
| birdievantage.com | live | no-pain-data |
| blockworks.com | live | no-algo-evidence,no-pain-data |
| brokersports.com | dead | no-algo-evidence,no-pain-data |
| brosonpm.trade | live | no-algo-evidence,no-pain-data |
| cbssports.com | live | no-algo-evidence,no-pain-data |
| cheatsheetwarroom.com | live | no-algo-evidence,no-pain-data |
| clickhouse.com | live | no-algo-evidence,no-pain-data |
| clutch.market | dead | no-algo-evidence,no-pain-data |
| compose.build | live | no-algo-evidence,no-pain-data |
| converge.market | dead | no-algo-evidence,no-pain-data |
| cookie.fun | live | no-algo-evidence,no-pain-data |
| crazyninjaodds.com | live | pricing,no-pain-data |
| cricketapi.com | live | no-algo-evidence,no-pain-data |
| datalayer.xyz | live | no-algo-evidence,no-pain-data |
| datarade.ai | live | no-algo-evidence,no-pain-data |
| deepbetting.io | live | no-algo-evidence,no-pain-data |
| deepnewz.com | live | no-algo-evidence,no-pain-data |
| defillama.com | live | no-algo-evidence,no-pain-data |
| dexu.ai | live | no-algo-evidence,no-pain-data |
| dfsace.com | dead | api,no-algo-evidence,pricing,no-pain-data |
| dfshero.com | live | no-algo-evidence,no-pain-data |
| dimers.com | live | no-algo-evidence,no-pain-data |
| dimes.fi | live | no-algo-evidence,no-pain-data |
| domeapi.io | live | no-algo-evidence,no-pain-data |
| donbest.com | live | no-algo-evidence,no-pain-data |
| draftedge.com | live | no-algo-evidence |
| draftkings.com/predictions | dead | no-algo-evidence |
| draftsharks.com | live | no-algo-evidence,no-pain-data |
| draftwise.app | live | no-algo-evidence,no-pain-data |
| dune.com | live | no-algo-evidence,no-pain-data |
| dycers.app | live | api,no-algo-evidence,no-pain-data |
| elastics.ai | live | no-algo-evidence,no-pain-data |
| elontweets.live | live | no-algo-evidence,no-pain-data |
| eventarb.com | walled | no-algo-evidence,no-pain-data |
| eventwaves.io | live | no-algo-evidence,no-pain-data |
| fake-a-polymarket.com | walled | no-algo-evidence,no-pain-data |
| fanduel.com/predicts | live | no-algo-evidence |
| fantasy.espn.com | live | no-algo-evidence,no-pain-data |
| fantasycalc.com | live | no-algo-evidence,no-pain-data |
| fantasycruncher.com | live | api |
| fantasydata.com | live | no-algo-evidence,pricing,no-pain-data |
| fantasyfootballanalytics.net | live | no-algo-evidence |
| fantasyfootballcalculator.com | live | no-algo-evidence,no-pain-data |
| fantasyguru.com | live | no-algo-evidence,no-pain-data |
| fantasylabs.com | live | no-algo-evidence,no-pain-data |
| fantasylife.com | live | no-algo-evidence,no-pain-data |
| fantasynerds.com | live | no-algo-evidence,no-pain-data |
| fantasypros.com | live | no-algo-evidence,pricing,no-pain-data |
| fantasyteamadvice.com | live | no-algo-evidence |
| feedinco.com | live | no-algo-evidence,no-pain-data |
| fereai.xyz | live | no-algo-evidence,no-pain-data |
| firefly.social | walled | no-algo-evidence,no-pain-data |
| fireplace.gg | live | no-algo-evidence,no-pain-data |
| firepolymarket.com | live | no-algo-evidence,no-pain-data |
| football-data.org | live | no-algo-evidence |
| football.fantasysports.yahoo.com | live | no-algo-evidence,no-pain-data |
| footballcsv.github.io | live | no-algo-evidence,no-pain-data |
| footballguys.com | live | no-algo-evidence,pricing,no-pain-data |
| forcazt.xyz | live | no-algo-evidence,no-pain-data |
| fractionai.xyz | walled | no-algo-evidence,no-pain-data |
| frontseat.co | live | no-algo-evidence,no-pain-data |
| ftnfantasy.com | live | no-algo-evidence,pricing,no-pain-data |
| future.fun | walled | no-algo-evidence,no-pain-data |
| geniussports.com | walled | no-algo-evidence,pricing,no-pain-data |
| getarbitragebets.com | live | no-algo-evidence,no-pain-data |
| github.com/bakedziti88/sportsbook-api | live | no-algo-evidence,no-pain-data |
| github.com/BenBrostoff/draftfast | live | no-pain-data |
| github.com/chanzer0/MLB-DFS-Tools | live | no-pain-data |
| github.com/eddwebster/football_analytics | live | no-pain-data |
| github.com/floodlight-sports/floodlight | live | no-pain-data |
| github.com/georgedouzas/sports-betting | live | no-pain-data |
| github.com/J-A-Stone-LLC/fantasy-football-gm | live | no-algo-evidence,no-pain-data |
| github.com/jscanga/Sports-Arbitrage-Finder | live | no-pain-data |
| github.com/martineastwood/penaltyblog | live | no-pain-data |
| github.com/n-roth12/DFSLineupOptimizer | live | no-pain-data |
| github.com/pretrehr/Sports-betting | live | no-pain-data |
| github.com/sedemmler/WagerBrain | live | no-pain-data |
| github.com/sportsdataverse (org) | live | no-pain-data |
| github.com/thespread/api | live | no-algo-evidence,no-pain-data |
| github.com/tonyntran/fantasy-auction-assistant | live | no-pain-data |
| goalserve.com | live | no-algo-evidence |
| goldsky.com | live | no-algo-evidence,no-pain-data |
| gondor.fi | walled | no-algo-evidence,no-pain-data |
| grid.gg | live | no-algo-evidence,no-pain-data |
| hashdive.com | live | no-algo-evidence,no-pain-data |
| horseapi.com | dead | api,no-algo-evidence,pricing,no-pain-data |
| hyperodd.com | live | no-algo-evidence,no-pain-data |
| inside.fyi | walled | no-algo-evidence,no-pain-data |
| isportsapi.com | live | no-algo-evidence,no-pain-data |
| jsonodds.com | walled | no-algo-evidence,no-pain-data |
| juicereel.com | live | no-algo-evidence,no-pain-data |
| kairos.trade | live | no-algo-evidence,no-pain-data |
| kaito.ai | walled | no-algo-evidence,no-pain-data |
| kalshi.com | walled | no-algo-evidence,pricing,no-pain-data |
| kuest.com | live | no-algo-evidence,no-pain-data |
| layerhub.xyz | walled | no-algo-evidence,no-pain-data |
| leans.ai | live | no-algo-evidence,no-pain-data |
| lineupdrafter.com | live | pricing |
| lsports.eu | live | no-algo-evidence |
| marketlens.trade | live | no-algo-evidence,no-pain-data |
| markiumpro.com | live | no-algo-evidence,no-pain-data |
| matchr.xyz | live | no-algo-evidence,no-pain-data |
| mentionmarkets.com | live | no-algo-evidence,no-pain-data |
| metabet.ai | live | no-algo-evidence,no-pain-data |
| metaforecast.org | live | no-algo-evidence,no-pain-data |
| mobyscreener.com | live | no-algo-evidence,no-pain-data |
| monitoredtips.com | live | no-algo-evidence,no-pain-data |
| moonshotsmlb.com | walled | no-algo-evidence,no-pain-data |
| netlify.app | live | no-algo-evidence,no-pain-data |
| nevua.markets | live | no-algo-evidence,no-pain-data |
| ninjatrader.com | live | no-algo-evidence,no-pain-data |
| notboring.co | walled | no-algo-evidence,no-pain-data |
| novig.com | live | no-algo-evidence |
| octagonai.co | live | no-algo-evidence,no-pain-data |
| oddpool.com | live | no-algo-evidence,no-pain-data |
| oddschecker.com | live | no-algo-evidence |
| oddsjam.com | live | no-algo-evidence,no-pain-data |
| oddspapi.io | live | no-algo-evidence |
| oddspedia.com | live | no-algo-evidence,pricing,no-pain-data |
| oddsportal.com | live | pricing |
| oddsshopper.com | live | no-algo-evidence,no-pain-data |
| oddsview.com | dead | api,no-algo-evidence |
| og.com | live | no-algo-evidence |
| okaybet.app | walled | no-algo-evidence,no-pain-data |
| onyxodds.com | live | no-algo-evidence |
| openmundi.github.io | live | no-algo-evidence,no-pain-data |
| opticodds.com | live | no-algo-evidence,no-pain-data |
| optimaldfs.com | live | no-algo-evidence,pricing,no-pain-data |
| orderbook.trade | walled | no-algo-evidence,no-pain-data |
| ostium.com | live | no-algo-evidence,no-pain-data |
| outlier.bet | live | no-algo-evidence,no-pain-data |
| pandascore.co | live | no-algo-evidence,no-pain-data |
| parsec.fi | walled | no-algo-evidence,no-pain-data |
| pff.com | live | no-algo-evidence |
| picktheodds.app | live | no-algo-evidence,no-pain-data |
| pigeon.trade | live | no-algo-evidence,no-pain-data |
| pikkit.com | live | no-algo-evidence,no-pain-data |
| pizzint.watch | live | no-algo-evidence,no-pain-data |
| play.google.com | live | no-algo-evidence,no-pain-data |
| playerprops.ai | live | no-algo-evidence,no-pain-data |
| pm.wiki | live | no-algo-evidence,no-pain-data |
| polyalerthub.com | live | no-algo-evidence,no-pain-data |
| polybot.trading | live | no-algo-evidence,no-pain-data |
| polybro.app | walled | no-algo-evidence,no-pain-data |
| polyburg.com | live | no-algo-evidence,no-pain-data |
| polycool.live | live | no-algo-evidence,no-pain-data |
| polycopy.app | live | no-algo-evidence,no-pain-data |
| polycule.trade | walled | no-algo-evidence,no-pain-data |
| polyfactual.com | walled | no-algo-evidence,no-pain-data |
| polyfakeit.com | walled | no-algo-evidence,no-pain-data |
| polyfund.so | walled | no-algo-evidence,no-pain-data |
| polyguana.com | live | no-algo-evidence,no-pain-data |
| polyhedg.com | live | no-algo-evidence,no-pain-data |
| polyinsider.io | live | no-algo-evidence,no-pain-data |
| polylayer.xyz | walled | no-algo-evidence,no-pain-data |
| polym.trade | live | no-algo-evidence,no-pain-data |
| polymarket.com | live | no-algo-evidence,pricing,no-pain-data |
| polymarket.tips | live | no-algo-evidence,no-pain-data |
| polymarketanalytics.com | walled | no-algo-evidence,no-pain-data |
| polymarketdash.com | walled | no-algo-evidence,no-pain-data |
| polymaster.io | live | no-algo-evidence,no-pain-data |
| polynoob.com | live | no-algo-evidence,no-pain-data |
| polyoracle.com | walled | no-algo-evidence,no-pain-data |
| polyprophet.com | walled | no-algo-evidence,no-pain-data |
| polypulse.tech | live | no-algo-evidence,no-pain-data |
| polyradar.io | live | no-algo-evidence,no-pain-data |
| polyrouter.io | walled | no-algo-evidence,no-pain-data |
| polyscalping.org | live | no-algo-evidence,no-pain-data |
| polyseer.xyz | live | no-algo-evidence,no-pain-data |
| polysights.xyz | walled | no-algo-evidence,no-pain-data |
| polysimplr.com | walled | no-algo-evidence,no-pain-data |
| polytale.live | walled | no-algo-evidence,no-pain-data |
| polyteller.com | live | no-algo-evidence,no-pain-data |
| polytrack.cash | live | no-algo-evidence,no-pain-data |
| polytrader.ai | walled | no-algo-evidence,no-pain-data |
| polytrend.xyz | walled | no-algo-evidence,no-pain-data |
| polywallet.info | live | no-algo-evidence,no-pain-data |
| polyxbot.org | walled | no-algo-evidence,no-pain-data |
| poolgenius.teamrankings.com | live | no-algo-evidence,no-pain-data |
| predictfolio.com | live | no-algo-evidence,no-pain-data |
| predicting.top | live | no-algo-evidence,no-pain-data |
| predictiondata.io | live | no-algo-evidence,pricing,no-pain-data |
| predictionhunt.com | live | no-algo-evidence,no-pain-data |
| predictionindex.xyz | walled | no-algo-evidence,no-pain-data |
| predictionnews.com | walled | no-algo-evidence,no-pain-data |
| predicts.guru | live | no-algo-evidence,no-pain-data |
| predictshark.io | walled | no-algo-evidence,no-pain-data |
| prediedge.com | live | no-algo-evidence,no-pain-data |
| predly.ai | live | no-algo-evidence,no-pain-data |
| predscan.io | live | no-algo-evidence,no-pain-data |
| pro.oddsassist.com | live | no-algo-evidence,no-pain-data |
| probalytics.io | live | no-algo-evidence,no-pain-data |
| propfinder.app | live | no-algo-evidence |
| prophetnotes.com | live | no-algo-evidence,no-pain-data |
| prophetx.co | live | no-algo-evidence,no-pain-data |
| prophetx.com | live | no-algo-evidence |
| props.cash | live | no-algo-evidence,no-pain-data |
| propsbot.ai | live | no-algo-evidence,pricing,no-pain-data |
| propsiq.app | live | no-algo-evidence,no-pain-data |
| propsmadness.com | live | api,no-algo-evidence |
| propsoptimizer.com | live | no-algo-evidence,no-pain-data |
| pydfs-lineup-optimizer.readthedocs.io | live | no-algo-evidence,no-pain-data |
| quickintel.io | live | no-algo-evidence,no-pain-data |
| rainmaker.fun | walled | no-algo-evidence,no-pain-data |
| rithmm.com | live | no-algo-evidence,no-pain-data |
| robin.markets | live | no-algo-evidence,no-pain-data |
| rotogrinders.com | live | api,no-pain-data |
| rotowire.com | live | no-algo-evidence,no-pain-data |
| rotowire.com/dfs | walled | no-algo-evidence,pricing |
| seda.xyz | live | no-algo-evidence,no-pain-data |
| semanticlayer.io | live | no-algo-evidence,no-pain-data |
| sharpeterminal.com | walled | no-algo-evidence,no-pain-data |
| sharplines.ai | live | no-algo-evidence,pricing,no-pain-data |
| simmer.markets | live | no-algo-evidence,no-pain-data |
| soccertipsters.com | live | no-algo-evidence,no-pain-data |
| sportmonks.com | live | no-algo-evidence,pricing,no-pain-data |
| sportradar.com | live | no-algo-evidence,pricing,no-pain-data |
| sports-ai.dev | live | no-algo-evidence,no-pain-data |
| sportsapi.com | live | no-algo-evidence,no-pain-data |
| sportsgameodds.com | live | no-algo-evidence,no-pain-data |
| sportshandle.com | live | no-algo-evidence,no-pain-data |
| sportstensor.com | walled | no-algo-evidence,no-pain-data |
| sportstrade.io | live | no-algo-evidence |
| stand.trade | live | no-algo-evidence,no-pain-data |
| statisticsports.com | live | no-algo-evidence |
| statpal.io | live | no-algo-evidence,no-pain-data |
| statpick.ai | live | no-algo-evidence,no-pain-data |
| statsniper.com | live | no-algo-evidence,no-pain-data |
| stocktwits.com | live | no-algo-evidence,no-pain-data |
| stokastic.com | live | no-algo-evidence,no-pain-data |
| suibets.com | walled | no-algo-evidence,no-pain-data |
| synthesis.trade | live | no-algo-evidence,no-pain-data |
| thefantasyfootballers.com | live | no-algo-evidence,no-pain-data |
| theover.ai | live | no-algo-evidence,no-pain-data |
| therundown.io | live | no-algo-evidence,no-pain-data |
| thesportsdb.com | live | no-algo-evidence |
| tokenterminal.com | live | no-algo-evidence,no-pain-data |
| trade.fun | live | no-algo-evidence,no-pain-data |
| trade360.com | walled | api,no-algo-evidence,pricing,no-pain-data |
| tradingtechnologies.com | live | no-algo-evidence,no-pain-data |
| truegamestats.com | live | no-algo-evidence,pricing,no-pain-data |
| tryokbet.com | walled | no-algo-evidence,no-pain-data |
| turbinefi.com | live | no-algo-evidence,no-pain-data |
| txodds.com | live | no-algo-evidence,no-pain-data |
| uma.rocks | walled | no-algo-evidence,no-pain-data |
| unabated.com | live | no-algo-evidence,no-pain-data |
| underdogfantasy.com/predict | live | no-algo-evidence |
| underdogsports.com | live | no-algo-evidence,no-pain-data |
| unifai.network | walled | no-algo-evidence,no-pain-data |
| upside.tools | live | no-algo-evidence,no-pain-data |
| useliquid.xyz | walled | no-algo-evidence,no-pain-data |
| userocket.app | live | no-algo-evidence,no-pain-data |
| vercel.app | live | no-algo-evidence,no-pain-data |
| verso.trading | live | no-algo-evidence,no-pain-data |
| vsin.com/pro | live | no-algo-evidence,pricing |
| wethr.net | walled | no-algo-evidence,no-pain-data |
| wintherace.info | live | no-pain-data |
| yesorno.ai | live | api,no-algo-evidence,no-pain-data |
| zapper.xyz | walled | no-algo-evidence,no-pain-data |
