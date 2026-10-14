import json, os, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nflverse_release as nr
import schedule_meta as sm
import stadiums as st
from _stamp import FailClosed

INJ = (b"season,game_type,team,week,gsis_id,position,full_name,first_name,last_name,report_primary_injury,"
       b"report_secondary_injury,report_status,practice_primary_injury,practice_secondary_injury,practice_status,date_modified\n"
       b"2023,REG,ARI,1,00-1,CB,A B,A,B,Knee,,Out,Knee,,Did Not Participate In Practice,2023-09-08T18:49:43Z\n"
       b"2023,REG,ARI,1,00-2,S,C D,C,D,,,,,,Full Participation in Practice,\n")


class TestRelease(unittest.TestCase):
    def test_injuries_reject_missing_asof(self):
        d = tempfile.mkdtemp()
        man, rows = nr.pull("injuries", 2023, d, raw=INJ)
        self.assertEqual((man["rows_accepted"], man["rows_rejected"]), (1, 1))
        self.assertEqual(rows[0]["report_primary_injury"], "Knee")
        self.assertTrue(man["observed_at"].endswith("Z")); self.assertEqual(len(man["sha256"]), 64)
        self.assertTrue(os.path.exists(os.path.join(d, "injuries_2023.manifest.json")))

    def test_missing_required_column_fails_closed(self):
        with self.assertRaises(FailClosed):
            nr.parse("snap_counts", b"game_id,season\n2023_01_A_B,2023\n")

    def test_depth_legacy_no_asof(self):
        man, _ = nr.pull("depth_charts", 2023, tempfile.mkdtemp(), raw=b"season,club_code,gsis_id\n2023,ATL,00-1\n")
        self.assertEqual(man["rows_asof_proven"], 0)


class TestSchedule(unittest.TestCase):
    def test_travel_tz_altitude_and_nulls(self):
        games = (b"game_id,season,game_type,week,gameday,weekday,gametime,away_team,home_team,location,home_rest,away_rest,roof,surface,stadium_id,stadium\n"
                 b"2023_01_KC_DEN,2023,REG,1,2023-09-10,Sunday,16:25,KC,DEN,Home,7,7,outdoors,grass,DEN00,Empower\n"
                 b"2023_02_DEN_KC,2023,REG,2,2023-09-17,Sunday,13:00,DEN,KC,Home,7,7,outdoors,grass,KAN00,Arrowhead\n"
                 b"2023_03_DEN_XX,2023,REG,3,2023-09-24,Sunday,13:00,DEN,XX,Neutral,7,7,outdoors,grass,LON00,Wembley\n")
        stad = {"rows": [{"stadium_id": "DEN00", "lat": 39.7439, "lon": -105.02, "timezone": "America/Denver", "altitude_m": 1609.0},
                         {"stadium_id": "KAN00", "lat": 39.0489, "lon": -94.4839, "timezone": "America/Chicago", "altitude_m": 270.0},
                         {"stadium_id": "LON00", "lat": None, "lon": None, "timezone": None, "altitude_m": None}]}
        rows = sm.build(games, stad, 2023, 2023)
        self.assertEqual(rows[0]["kickoff_utc"], "2023-09-10T20:25:00Z")
        self.assertAlmostEqual(rows[0]["away_travel_miles"], st.haversine_miles((39.0489, -94.4839), (39.7439, -105.02)), places=1)
        self.assertEqual(rows[0]["away_tz_shift_h"], -1.0); self.assertEqual(rows[0]["venue_altitude_m"], 1609.0)
        self.assertIsNone(rows[2]["away_travel_miles"]); self.assertIn("altitude_m", rows[2]["null_fields"])

    def test_haversine(self):
        self.assertAlmostEqual(st.haversine_miles((0, 0), (0, 1)), 69.09, delta=0.05)


if __name__ == "__main__":
    unittest.main()
