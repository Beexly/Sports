URL: https://opensourcefootball.com/posts/2020-08-25-defense-and-rest-time-re-visited/
TITLE: Open Source Football: Defense and rest time re-visited

Defense and rest time re-visited
Does incorporating actual rest time help us predict how a defense will do?
Does incorporating actual rest time help us predict how a defense will do?
Introduction
In this post, we revisit an old piece I did for Football Outsiders . In that piece, I looked at the relationship between defensive rest time and defensive performance, finding no evidence of a relationship. However, without a direct measure of rest time, I had to use plays of rest and time of possession of rest rather than the actual time in minutes that had gone by since the defense took the field. In the time since, nflfastR ’s release means we now have the hour, minute, and second of each snap, so we can know how much time goes by between when the defense last took the field and the start of their subsequent defensive drive.
nflfastR
A few quick notes before we dive in. This piece uses data from the 2015 through 2019 seasons. It would be possible to add more but each additional season involves some manual cleaning to remove games with clock errors and games with delays mid-game (e.g. from lightening), both of which cause all the figures to look bad. In total, I remove five games with delays and six games with assorted problems with the clock time. With five seasons of data, we still have nearly 30,000 drives to analyze.
Because this is Open Source Football, you can see how I obtained and cleaned the data by checking the source code (the source code for all posts is located here ).
Overview of rest time
With that out of the way, let’s jump in. Which defenses had the shortest rest times before they had to re-take the field since 2015?
The shortest defensive rest time since 2015 was the Colts in 2018. At 35 seconds past 2:26pm Eastern, the Texans punted. On the subsequent play, Andrew Luck was sacked by JJ Watt, which led to a fumble recovered by the Texans. The Colts defense then took the field again at 16 seconds past 2:28pm Eastern, 101 seconds after they had last been on the field (this isn’t perfect, but I’m counting punts as a defensve being on a field. This doesn’t make a big difference either way).
What about the longest rest times? Due to the length of Super Bowl halftimes, a lot of Super Bowls show up here:
The longest a defense has rested since 2015 came in Super Bowl LI. Midway through the second quarter, Matt Ryan threw a touchdown pass to Austin Hooper. The time was 7:27pm. On the subsequent drive, the Patriots drove down the field until Robert Alford picked off Tom Brady and returned it for a touchdown. The Patriots then received the ball again, driving down the field and kicking a field goal right before the second half. Following a typically long Super Bowl halftime show, the Falcons received the opening kickoff. By the time the Patriots’ defense took the field again, it was 8:36pm (the other games shown had long drives on either side of the half).
While we’ve been focusing on the extremes so far, let’s take a look at the distribution of how long a defense rests before it re-takes the field.

As shown above, defenses typically get around 5-20 minutes of rest, with the modal time being exactly 10 minutes (I’m truncating drives over 40 minutes for this plot since they are rare, though as we’ve already seen, they exist).
Rest plays versus rest time
Let’s return to what we’re actually interested in. Is using the total plays a defense has spent resting a reasonable proxy for how long they have actually rested?

In the figure above, each point represents one defensive drive, with the horizontal axis being how many plays throughout the game the defense has spent on the sidelines up to that point, and the vertical axis the number of minutes.
I’ve broken drives down by half because all defenses get some extra rest time at halftime, but aside from that, there’s a very strong relationship between the number of plays a defense has spent resting and the actual amount of time it has been on the sidelines. Thus, an initial finding is that we probably haven’t been missing much by just measuring plays of rest time rather than actual time.
While the above shows the cumulative amount of time spent resting, we can see a similar pattern when only focusing on the amount of rest time before a given drive:

Again, teams get some extra rest during halftime so the initial drive of the third quarter for each defense is systematically different than the others. Aside from that, the number of plays and the amount of time a defense has recently spent off the field tracks pretty closely.
Something that jumps out in the figure above is the number of drives where the defense only had a play or two of rest. These are typically turnovers where the defense doesn’t have much time to rest before it has to go right back on the field. Thus, we would expect a relationship between how long a defense has rested and the field position it finds itself in.
Rest time versus field position
We indeed observe a relationship between field position versus time spent resting, where low rest time is associated with bad field position from the perspective of the defense. If your offense went three and out or committed a quick turnover, you have probably put your defense in a bad position.

This means that, as in the original piece , it’s important to separate out field position effects from rest time effects. If a defense had short rest time, it’s likely that it’s also beginning with poor field position.
Rest time versus defensive results
To handle the field position issue, I subtract off the expected points at a given yardline to obtain points over expected. Another factor to consider is the ends of halves. A lot of the short rest time drives are near the end of the half when networks have already gotten in the TV timeouts required, so there isn’t an extended break between possessions like normal. But end-of-half situations are also less likely to score because of the clock being a factor. So in creating the expected points for a drive, I also account for the seconds remaining in a half when the drive started.
If rested defenses perform better, all else equal, we would expect to see a decreasing relationship between points per drive over expected and rest time. Let’s take a look:

Instead of a decreasing relationship, we have a weakly positive one, but pretty close to zero throughout the bulk of the distribution (e.g., between 5 and 20 minutes). So there doesn’t seem to be much here.
Wrapping up
This has hopefully been a useful peak at what we can do with the newly-available time of day information in nflfastR . After taking a tour of this data applied to rest time, I don’t think I’ve seen anything to change the conclusions about defensive rest obtained from measuring plays or time of possession. The most direct way an offense affects its team’s defense is through field position, with all other effects (including rest time) being secondary at best.
nflfastR
In the future, it might be interesting to look at whether repeated short drives by an offense have a measurable effect on defensive performance. Given what we’ve already seen, my guess would be no, but it can’t hurt to find out.

Share:
Corrections
If you see mistakes or want to suggest changes, please create an issue on the source repository.
Reuse
Text and figures are licensed under Creative Commons Attribution CC BY-NC 4.0 . Source code is available at https://github.com/mrcaseb/open-source-football , unless otherwise noted. The figures that have been reused from other sources don't fall under this license and can be recognized by a note in their caption: "Figure from ...".
Citation
For attribution, please cite this work as
Baldwin (2020, Aug. 31). Open Source Football: Defense and rest time re-visited. Retrieved from https://www.opensourcefootball.com/posts/2020-08-25-defense-and-rest-time-re-visited/
BibTeX citation
@misc{baldwin2020defense,
  author = {Baldwin, Ben},
  title = {Open Source Football: Defense and rest time re-visited},
  url = {https://www.opensourcefootball.com/posts/2020-08-25-defense-and-rest-time-re-visited/},
  year = {2020}
}
©2020 - Website creator Sebastian Carl (Twitter: @mrcaseb )