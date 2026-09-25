from __future__ import annotations

from app.models.coverage_classifier import Frame, PlayerBox, analyze_play, classify_players


def _defense(*players: PlayerBox) -> list[PlayerBox]:
    return [PlayerBox(x, y, "offense") for x, y in ((10, 55), (90, 55))] + list(players)


def test_deep_safeties_and_off_corners_classify_as_cover_three() -> None:
    players = _defense(
        PlayerBox(50, 5, "defense"), PlayerBox(52, 7, "defense"),
        PlayerBox(8, 18, "defense"), PlayerBox(92, 18, "defense"),
        PlayerBox(25, 25, "defense"), PlayerBox(75, 25, "defense"),
    )
    assert classify_players(players) == "Cover 3"


def test_single_high_press_classifies_as_cover_one_man() -> None:
    players = _defense(
        PlayerBox(50, 7, "defense"), PlayerBox(10, 17, "defense"),
        PlayerBox(90, 17, "defense"), PlayerBox(35, 25, "defense"),
        PlayerBox(65, 25, "defense"),
    )
    assert classify_players(players) == "Cover 1 Man"


def test_pre_and_post_labels_can_disagree() -> None:
    pre = Frame(0, _defense(PlayerBox(50, 5, "defense"), PlayerBox(52, 7, "defense"), PlayerBox(8, 18, "defense"), PlayerBox(92, 18, "defense"), PlayerBox(25, 25, "defense"), PlayerBox(75, 25, "defense")))
    post = Frame(1, _defense(PlayerBox(50, 17, "defense"), PlayerBox(25, 25, "defense"), PlayerBox(75, 25, "defense"), PlayerBox(35, 30, "defense"), PlayerBox(65, 30, "defense"), PlayerBox(10, 30, "defense")))
    result = analyze_play([pre, post])
    assert result.disguised is True
    assert result.preSnap != result.postSnap
