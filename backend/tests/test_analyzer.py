from backend.app.analyzer import FrontalSquatAnalyzer
from backend.app.models import Landmark, PoseFrame


def pose_frame(knee_y: float = 0.55, knee_inset: float = 0.0, visibility: float = 0.95) -> PoseFrame:
    points = [Landmark(x=0.5, y=0.5, visibility=visibility) for _ in range(33)]
    points[11], points[12] = Landmark(x=0.42, y=0.2, visibility=visibility), Landmark(x=0.58, y=0.2, visibility=visibility)
    points[23], points[24] = Landmark(x=0.44, y=0.42, visibility=visibility), Landmark(x=0.56, y=0.42, visibility=visibility)
    points[25], points[26] = Landmark(x=0.44 + knee_inset, y=knee_y, visibility=visibility), Landmark(x=0.56 - knee_inset, y=knee_y, visibility=visibility)
    points[27], points[28] = Landmark(x=0.42, y=0.82, visibility=visibility), Landmark(x=0.58, y=0.82, visibility=visibility)
    return PoseFrame(version=1, sequence=1, timestampMs=33, landmarks=points)


def test_returns_normalized_frontal_metrics() -> None:
    result = FrontalSquatAnalyzer().analyze(pose_frame(knee_inset=0.03))
    assert result.quality.valid
    assert result.metrics is not None
    assert result.metrics.kneeDistanceRatio < 1
    assert result.metrics.leftValgusPercent > 0
    assert "knee_valgus" in result.analysis.warnings


def test_rejects_low_visibility_pose() -> None:
    result = FrontalSquatAnalyzer().analyze(pose_frame(visibility=0.2))
    assert not result.quality.valid
    assert result.metrics is None
    assert result.quality.issue == "low-visibility"
