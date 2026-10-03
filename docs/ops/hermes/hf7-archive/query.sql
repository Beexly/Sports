SELECT COUNT(*)::int AS n FROM odds_line_snapshots;

SELECT s.key AS sport, ols.phase, COUNT(*)::int AS n
FROM odds_line_snapshots ols
JOIN games g ON g.id = ols."gameId"
JOIN sports s ON s.id = g."sportId"
WHERE s.key IN ('baseball_mlb', 'americanfootball_nfl')
GROUP BY s.key, ols.phase
ORDER BY s.key, ols.phase;

SELECT s.key AS sport, COUNT(*)::int AS n
FROM odds_line_snapshots ols
JOIN games g ON g.id = ols."gameId"
JOIN sports s ON s.id = g."sportId"
WHERE s.key IN ('baseball_mlb', 'americanfootball_nfl')
GROUP BY s.key
ORDER BY s.key;
