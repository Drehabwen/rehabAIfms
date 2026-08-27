from backend.app.analyzer import FrontalSquatAnalyzer
from backend.app.models import Landmark, PoseFrame, RepetitionSummary, SessionEnd


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


def test_emits_one_second_timeline_aggregate() -> None:
    analyzer = FrontalSquatAnalyzer()
    first = pose_frame()
    analyzer.analyze(first)
    later = pose_frame(knee_inset=0.02)
    later.sequence = 31
    later.timestampMs = 1050
    result = analyzer.analyze(later)
    assert result.timelinePoint is not None
    assert result.timelinePoint.second > 1


def test_builds_session_report_from_frontend_rep_boundaries() -> None:
    analyzer = FrontalSquatAnalyzer()
    analyzer.analyze(pose_frame())
    session = SessionEnd(
        type="session-end-v1", durationMs=3200, repetitions=1, partialRepetitions=1,
        reps=[RepetitionSummary(
            repId=1, startedAtMs=200, bottomAtMs=1200, completedAtMs=2400,
            durationMs=2200, minKneeAngle=112,
        )],
    )
    report = analyzer.report(session)
    assert report.repetitions == 1
    assert report.partialRepetitions == 1
    assert report.validFrameRate == 100
    assert report.qualityLevel == "good"
    assert report.p95CenterShiftPercent == 0
    assert report.kneeStabilityScore == 100
    assert report.symmetryScore is not None
    assert report.reps[0].repId == 1


def test_low_quality_report_suppresses_symmetry_score() -> None:
    analyzer = FrontalSquatAnalyzer()
    analyzer.analyze(pose_frame())
    analyzer.analyze(pose_frame(visibility=0.2))
    session = SessionEnd(type="session-end-v1", durationMs=1000, repetitions=0, partialRepetitions=0, reps=[])
    report = analyzer.report(session)
    assert report.qualityLevel == "low"
    assert report.symmetryScore is None
    assert "重新采集" in report.qualityMessage


def test_detects_repeated_lateral_knee_wobble() -> None:
    analyzer = FrontalSquatAnalyzer()
    results = []
    for index, inset in enumerate([0.0, 0.025, -0.025, 0.025, -0.025]):
        frame = pose_frame(knee_inset=inset)
        frame.sequence = index
        frame.timestampMs = index * 33
        results.append(analyzer.analyze(frame))
    assert any("knee_instability" in result.analysis.warnings for result in results)
    report = analyzer.report(SessionEnd(type="session-end-v1", durationMs=500, repetitions=0, partialRepetitions=0, reps=[]))
    assert report.p95KneeWobblePercent is not None
    assert report.p95KneeWobblePercent > 2.5
    assert report.kneeStabilityScore is not None
    assert report.kneeStabilityScore < 100


def test_detects_pelvis_and_trunk_lateral_control_warnings() -> None:
    analyzer = FrontalSquatAnalyzer()
    frame = pose_frame()
    frame.landmarks[24].y += 0.04
    frame.landmarks[11].x += 0.06
    frame.landmarks[12].x += 0.06
    result = analyzer.analyze(frame)
    assert "pelvis_tilt" in result.analysis.warnings
    assert "trunk_lateral_lean" in result.analysis.warnings


def test_scores_repeatability_from_multiple_repetitions() -> None:
    analyzer = FrontalSquatAnalyzer()
    analyzer.analyze(pose_frame())
    session = SessionEnd(
        type="session-end-v1", durationMs=5000, repetitions=2, partialRepetitions=0,
        reps=[
            RepetitionSummary(repId=1, startedAtMs=0, bottomAtMs=1000, completedAtMs=2000, durationMs=2000, minKneeAngle=0, maxDepthPercent=25),
            RepetitionSummary(repId=2, startedAtMs=2500, bottomAtMs=3500, completedAtMs=4500, durationMs=2000, minKneeAngle=0, maxDepthPercent=25),
        ],
    )
    report = analyzer.report(session)
    assert report.repetitionConsistencyScore == 100
