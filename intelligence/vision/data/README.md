# vision/data — raw inputs (large), re-downloadable; extracts are tracked

The raw BDB tracking CSVs are hundreds of MB each and re-downloadable from
the public mirror. They stay OUT of git. The extracted proof-play parquet,
the nflverse players crosswalk, and pbp 2022 ARE tracked (small, and the
identity-chain proof depends on them).

Re-download command (no account, keyless):

  python -c "
  import urllib.request, shutil
  base='https://huggingface.co/datasets/ameau01/Big-Data-Bowl-2025/resolve/main/big-data-bowl-data/'
  for f in ['tracking_week_1.csv','plays.csv','players.csv','games.csv','player_play.csv']:
      req=urllib.request.Request(base+f, headers={'User-Agent':'Mozilla/5.0'})
      with urllib.request.urlopen(req, timeout=120) as r, open('intelligence/vision/data/'+f,'wb') as out:
          shutil.copyfileobj(r, out, length=8*1048576)
  "

tracking_week_1.csv = 926 MB, ~11 s on this connection.
