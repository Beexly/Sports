"""Team-total sign. Listed spread is the book home number.

mu_margin = -listed_spread.
Home total = (T + mu) / 2. Away total = (T - mu) / 2.
Listed -3 on 48.5 is home 25.75 / away 22.75.
The favorite scores more. Not a pick.
"""


def team_total_wrong(total, listed_spread):
    """The bug. (T + listed) / 2 gives the favorite the smaller total."""
    return (total + listed_spread) / 2.0, (total - listed_spread) / 2.0


def team_total_split(total, listed_spread):
    mu = -float(listed_spread)
    return (total + mu) / 2.0, (total - mu) / 2.0


def self_check():
    home, away = team_total_split(48.5, -3.0)
    bad_home, bad_away = team_total_wrong(48.5, -3.0)
    print("listed -3 on 48.5 -> home %.2f away %.2f" % (home, away))
    print("wrong form -> home %.2f away %.2f" % (bad_home, bad_away))
    assert abs(home - 25.75) < 1e-12
    assert abs(away - 22.75) < 1e-12
    assert abs(bad_home - 22.75) < 1e-12
    assert home > away
    print("team_total_sign ok")


if __name__ == "__main__":
    self_check()
