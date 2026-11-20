import pytest
from unittest.mock import patch, MagicMock
from intelligence.vision.skeletrack_v2 import SkeleTrackV2, SkeleTrackV2Config

@patch('intelligence.vision.skeletrack_v2.YOLO', MagicMock())
@patch('intelligence.vision.skeletrack_v2.SupervisionByteTrack', MagicMock())
def test_default_construction_equivalence():
    """Verify that default construction produces identical attributes as a config with defaults."""
    proxy_default = SkeleTrackV2()
    proxy_config = SkeleTrackV2(config=SkeleTrackV2Config())

    # We just need to check the attributes initialized by the config
    attrs_to_check = ['conf', 'q_base', 'r_base', 'fps', 'dt']
    for attr in attrs_to_check:
        assert getattr(proxy_default, attr) == getattr(proxy_config, attr)

@patch('intelligence.vision.skeletrack_v2.YOLO', MagicMock())
@patch('intelligence.vision.skeletrack_v2.SupervisionByteTrack', MagicMock())
def test_config_override():
    """Verify that passing a config overrides default values correctly."""
    config = SkeleTrackV2Config(conf=0.99, q_base=5.0)
    proxy = SkeleTrackV2(config=config)

    assert proxy.conf == 0.99
    assert proxy.q_base == 5.0
    # ensure un-overridden config params keep their defaults
    assert proxy.r_base == 8.0
    assert proxy.fps == 30.0

@patch('intelligence.vision.skeletrack_v2.YOLO', MagicMock())
@patch('intelligence.vision.skeletrack_v2.SupervisionByteTrack', MagicMock())
def test_old_style_keyword_overrides():
    """Verify that old-style keyword arguments override both the default and passed config."""
    config = SkeleTrackV2Config(conf=0.5, fps=60.0)

    # old-style only
    proxy_kwargs = SkeleTrackV2(conf=0.75, r_base=10.0)
    assert proxy_kwargs.conf == 0.75
    assert proxy_kwargs.r_base == 10.0
    assert proxy_kwargs.fps == 30.0 # unchanged

    # config + old-style overrides (kwargs win)
    proxy_mixed = SkeleTrackV2(config=config, fps=120.0, q_base=1.5)
    assert proxy_mixed.conf == 0.5 # from config
    assert proxy_mixed.fps == 120.0 # overridden by kwarg
    assert proxy_mixed.q_base == 1.5 # overridden by kwarg
    assert proxy_mixed.r_base == 8.0 # default config
