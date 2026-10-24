URL: https://opensourcefootball.com/posts/2023-02-23-nfl-draft-value-chart/
TITLE: Open Source Football: NFL Draft Value Chart

NFL Draft Value Chart
Constructing surplus value from scratch.
Constructing surplus value from scratch.
Do we really need another draft values chart out there? No, not really.
So why does this exist? I haven’t seen a draft value chart that satisfies the following two conditions:
Is made with publicly available code and data
Shows a draft value curve when excluding quarterbacks
The latter point is especially important. If one combines quarterbacks and non-quarterbacks when constructing a draft value chart, one ends up much too rosy on the value of the top picks in the draft when these picks are not used on a quarterback. This is due to quarterbacks being very valuable, and quarterbacks selected high in the draft tending to have higher hit rates .
The goal here is to construct a transparent (i.e., the code and methodology are public) and useful draft chart. Like the Fitzgerald-Spielberger (OTC) NFL Draft Trade Value Chart , we’re going to use second contracts as a measure of player value. There are some obvious limitations to this:
We assume that a player’s value on the first 4 years of his rookie contract is well represented by what he is able to earn on his 2nd deal. For players who improved a lot at the end of their rookie deals (or suffered serious injury), the measure is far from perfect
We aren’t capturing the value provided by 5th year option for 1st round picks. This somewhat underestimates 1st round pick value, but with the new fifth-round option values introduced in the 2020 CBA , this option isn’t as valuable as it used to be. For example, CeeDee Lamb would make about $18 million in his option year due to making one Pro Bowl and Justin Jefferson $20 million due to making multiple Pro Bowls. This isn’t typically what we think of when thinking about rookie deal prices
We aren’t capturing the value of being able to re-sign a player before he hits the open market
As mentioned above, we’re only going to do this for non-QBs. The value of QBs is so different than every other position that they should be considered separately in any draft analysis.
Before moving forward, a thank you to the invaluable resource that Over The Cap represents. All of the contract data used in this post is taken from their website and this analysis wouldn’t be possible without their hard work.
Updated on February 27, 2023 : (a) added more picks to the table at the bottom so it now displays picks 1-256, (b) added on-field value to table at the bottom, and (c) re-scaled surplus value so it’s 0-to-100 (thank you to Luckym4n_ for the suggestion )/
Updated on April 11, 2023 : Add 2018 draft class to on-field value calculations. Now covers 2011 through 2018. For Calvin Ridley, assume he’ll get an extension equivalent to tag value. In addition, use archieved version of Sportrac rookie contract value to avoid site updates breaking the scrape.
Updated on April 17, 2023 : Added position-specific draft curves.
Updated on April, 2024 : Added 2019 draft class to on-field value calculations.
Updated on May 2, 2025 : Added 2020 draft class to on-field value calculations.
Part 1: Make a surplus value curve
In order to calculate the surplus value of each pick. We need two pieces of information. First, how much each pick costs (the contract); and second, how much benefit each pick provides (on-field performance).
How expensive is each draft pick’s rookie deal?
The first thing we need is the actual cost of each draft pick’s contract. Some googling led me to this page .
A couple notes on the calculations we’re be using (if you want to see the code, scroll down to the bottom of this post and click the “View source code on GitHub” button, or just click here ). First, we’re assuming cap growth rate of 7% over the next 3 seasons (i.e., 2024, 2025, and 2026) before converting the total amount of the rookie deal into a percentage of the cap. For example, the 2023 cap is about $225 million, while the average of the 2023 through 2026 caps is about $250 million using this procedure. Taking the Bears’ No. 1 pick for example, we have total value of about $41 million, which is about $10.2 million per season, or 10.2/250 = 4.1 percent of the cap. If we assumed no growth in the salary cap rates, then we would divide 10.2 by 225 which is about 4.5 percent of the cap. In other words, we’d be counting the high draft picks as too expensive.
How productive has each pick been?
This is pretty simple: take the APY in terms of percent of the cap for each drafted player’s second deal (i.e., first deal after rookie contract). For players that did not receive a second contract, we’ll assign them a value of zero. We then smooth these values to get a smooth relationship between pick number and on-field performance.
Part 2: Show the draft curves
We first plot our own draft curves and then afterwards compare to others.
On-field value versus surplus value
Using cost and on-field performance, we can now construct a surplus value curve:

How to read the chart: the first pick in the draft costs 4.1% of the salary cap (orange line). The on-field production is expected to be 6.5% of the salary cap (purple line). Thus, the surplus value associated with the first pick in the draft is 2.4% of the salary cap (green line).
We have re-produced the now-familiar result that for teams not drafting a quarterback, the surplus value of the very top picks is lower than later in the first round and even throughout most of the second round. This is because the dropoff in salary that teams have to pay to draft picks (orange line) is steeper than the dropoff in on-field value (purple line). This reflects the fact that teams are not very good at identifying the best players in the draft. We have a lot of evidence that this is the case .
This pattern of later first round picks having higher surplus value than early first round picks was originally referred to as the loser’s curse in the seminal paper by Cade Massey and Richard Thaler . Massey and Thaler wrote their paper during the pre-2011 CBA when rookie contracts were a lot more expensive; however, the pattern still holds up now. In addition, we have replicated earlier findings by PFF’s Timo Riske using a similar approach that took advantage of player contract data and yet another study by Riske that used PFF Wins Above Replacement (WAR).
In particular, our chart above looks remarkably similar to this picture below from Timo’s work , which is always a good sign that we’re on the right track:
Comparison with other draft curves
The three draft charts that I tend to see the most often are the OTC chart , the PFR chart made by Chase Stuart based on AV, and the original Jimmy Johnson chart. Here’s how they compare with the surplus and on-field values shown above.
In the figure below, we scale each draft curve so that the value of the first overall pick represents 100 draft points.

Because our surplus value chart doesn’t have the first pick as the most valuable pick, unsurprisingly, it looks very different than the other charts. Interestingly, the player value curve (i.e., on-field value of player without accounting for cost of rookie contract) is still flatter than the other three curves. This shouldn’t come as a surprise given that we have excluded quarterbacks and the other charts do not.
Unsurprisingly, draft charts tend to overvalue the top picks in the case when these picks are not used on a quarterback. This adds to the mountain of evidence discussed above that NFL teams largely do not understand the relative values of draft picks and are dramatically overconfident in their ability to pick the right players at the top of the draft. The original Jimmy Johnson chart, for example, comes nowhere close to reflecting the true value of picks.
Draft Value by Position
Inspired by Kevin Cole’s post here , we can also compute position-specific curves. Let’s show on-field value rather than surplus value because surplus value is computed using costs that are invariant to position. That is, to go from one to the other, we would subtract the pick-specific cost from each curve.

Looking at the results, we see that RB (offense) and Safety (defense) are the low positions on the totem pole. At the top, the highest returns have been for pass rushers (both edge and inside) and offensive tackles.
Part 3: Some example calculations
At the bottom of this post, I will leave a table that contains the same information presented in two ways. First, an estimated value of each pick on a familiar scale that is primarily useful for calculating trades involving draft picks only. In addition, the table contains the actual estimate of APY per year (over 4 years) in order to facilitate evaluations of pick-for-player trades. In this section, I will provide an example of both. Remember that this is for non-QBs: if a quarterback is involved, don’t use this table.
Finally, the table also presents draft values using on-field value only (i.e., the purple curve above) for comparison.
Draft day trade: example 1
Let’s start with last year’s controversial Lions-Vikings trade, in which the Vikings were panned for the lack of return they got for moving back 20 picks in the first round.
Here’s the trade with the estimated values obtained from this post (again, the full table is displayed below):
Lions receive: No. 12 (100), No. 46 (71). Total: 171
Vikings receive: No. 32 (81), No. 34 (84), No. 66 (54). Total: 219
Difference: 48, which is the value of pick No. 73
So the surplus value the Vikings obtained in this trade was the equivalent of an early third-round pick. Not bad for a trade that popular commentary thought that they lost!
What if we ignored surplus value and just looked at on-field value (i.e., player production ignoring cost)?
Lions receive: No. 12 (87), No. 46 (53). Total: 140
Vikings receive: No. 32 (65), No. 34 (64), No. 66 (40). Total: 169
Difference: 29, which is the value of pick No. 92 , or a pick towards the end of the 3rd round.
So even if you ignore the cost of players entirely (which is not a good idea in a league with a salary cap), there is no argument against the Vikings winning this trade in terms of the expected value of the picks.
Draft day trade: example 2
One of the worst draft-day trades I can remember that didn’t involve players or future picks was the Jets trading up for Alijah Vera-Tucker in 2021. Let’s see how bad it looks using the chart below:
Jets receive: No. 14 (100), No. 143 (19). Total: 119
Vikings receive: No. 23 (90), No. 66 (54), No. 86 (40). Total: 184
Difference: 65, which is more than the value of pick No. 1 (which is the same as the surplus value of pick 53)
Being extremely generous to the Jets, we could say they gave up the surplus value of a 2nd round pick to move up for a guard. Alternatively, we could say they gave up the surplus value of the No. 1 pick!
Player for picks trade
This is somewhat complicated since some of the picks were in the future. Let’s be generous to the Seahawks and discount the 2022 picks by 10 percent. We will now use the APY version of the table in order to calculate the total cost of the Adams trade and extension:
Seahawks receive: 2022 pick 109 (1.11 * .9)
Jets receive: 2021 pick 23 (3.34), 2021 pick 86 (1.50), 2022 pick 10 (3.53 * .9)
Difference: 3.34 + 1.50 + (3.53 * .9) - (1.11 * .9) = 7.0 percent of the salary cap per year over 4 years
So we have arrived at 7.0% of the salary cap in APY per year over 4 years as the value of picks given up for the Seahawks. Adams’ 4-year deal extension with the Seahawks was $17.5 APY, or 9.6% of the salary cap at the time, per OTC. Dividing 7.0% (draft surplus given up) by 9.6% (contract APY), we need to inflate Adams’ APY by 73%, arriving at a true contract cost of, 30.3 million dollars per year over 4 years .
This is the same ballpark that Bill Barnwell landed on in his review of the trade , which was written before the extension was signed. Barnwell assumed an extension of $16 million APY:
“Factor in the cost of acquiring Adams and that four-year, $64 million extension suddenly becomes a four-year, $108.5 million contract. Instead of paying Adams $16 million per year, now he has cost the Seahawks more than $27 million per season, which is more than anybody in the league who isn’t a quarterback. If their picks end up being juicier than they were expecting, that price goes up. Adams has to be the best non-quarterback in the league to make the math work.”
Combine the Seahawks being worse than expected over this time period with Adams getting a somewhat larger deal than expected, and the estimates of the true cost of the trade and extension for Adams are remarkably consistent between Barnwell’s piece and this methodology.
And hopefully now one can understand how surplus value calculations are formed.
Part 4: The full table
Here’s the full table:
Here is a link to a .csv of the table .
View source code on GitHub

Share:
Corrections
If you see mistakes or want to suggest changes, please create an issue on the source repository.
Reuse
Text and figures are licensed under Creative Commons Attribution CC BY-NC 4.0 . Source code is available at https://github.com/nflverse/open-source-football , unless otherwise noted. The figures that have been reused from other sources don't fall under this license and can be recognized by a note in their caption: "Figure from ...".
Citation
For attribution, please cite this work as
Baldwin (2025, May 14). Open Source Football: NFL Draft Value Chart. Retrieved from https://www.opensourcefootball.com/posts/2023-02-23-nfl-draft-value-chart/
BibTeX citation
@misc{baldwin2025nfl,
  author = {Baldwin, Ben},
  title = {Open Source Football: NFL Draft Value Chart},
  url = {https://www.opensourcefootball.com/posts/2023-02-23-nfl-draft-value-chart/},
  year = {2025}
}
©2020 - Website creator Sebastian Carl (Twitter: @mrcaseb )