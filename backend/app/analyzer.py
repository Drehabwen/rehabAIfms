import math

from .models import AnalysisResult, FrameAnalysis, FrontalMetrics, Landmark, PoseFrame, Quality, TimelinePoint

LEFT = {"shoulder": 11, "hip": 23, "knee": 25, "ankle": 27}
RIGHT = {"shoulder": 12, "hip": 24, "knee": 26, "ankle": 28}
REQUIRED = tuple(LEFT.values()) + tuple(RIGHT.values())


def _distance(a: Landmark, b: Landmark) -> float:
    return math.hypot(a.x - b.x, a.y - b.y)


def _angle(a: Landmark, vertex: Landmark, c: Landmark) -> float:
    ab = (a.x - vertex.x, a.y - vertex.y)
    cb = (c.x - vertex.x, c.y - vertex.y)
    denominator = math.hypot(*ab) * math.hypot(*cb)
    if denominator < 1e-9:
        return 180.0
    cosine = max(-1.0, min(1.0, (ab[0] * cb[0] + ab[1] * cb[1]) / denominator))
    return math.degrees(math.acos(cosine))


def _line_angle(a: Landmark, b: Landmark) -> float:
    return math.degrees(math.atan2(b.y - a.y, b.x - a.x))


def _valgus_percent(hip: Landmark, knee: Landmark, ankle: Landmark, center_x: float) -> float:
    dy = ankle.y - hip.y
    interpolation = 0.5 if abs(dy) < 1e-9 else (knee.y - hip.y) / dy
    expected_x = hip.x + interpolation * (ankle.x - hip.x)
    inward_sign = 1.0 if center_x > expected_x else -1.0
    leg_length = _distance(hip, knee) + _distance(knee, ankle)
    return ((knee.x - expected_x) * inward_sign / max(leg_length, 1e-6)) * 100


class FrontalSquatAnalyzer:
    def __init__(self, min_visibility: float = 0.6, smoothing_alpha: float = 0.35) -> None:
        self.min_visibility = min_visibility
        self.smoothing_alpha = smoothing_alpha
        self._knee_angle: float | None = None
        self._started_at: float | None = None
        self._window_started_at: float | None = None
        self._window: list[FrontalMetrics] = []

    def _timeline_point(self, timestamp_ms: float, metrics: FrontalMetrics) -> TimelinePoint | None:
        self._started_at = timestamp_ms if self._started_at is None else self._started_at
        self._window_started_at = timestamp_ms if self._window_started_at is None else self._window_started_at
        self._window.append(metrics)
        if timestamp_ms - self._window_started_at < 1000:
            return None
        count = len(self._window)
        point = TimelinePoint(
            second=(timestamp_ms - self._started_at) / 1000,
            kneeDistanceRatio=sum(item.kneeDistanceRatio for item in self._window) / count,
            kneeAngleAsymmetry=sum(item.kneeAngleAsymmetry for item in self._window) / count,
            centerShiftPercent=sum(item.centerShiftPercent for item in self._window) / count,
            maxValgusPercent=max(max(item.leftValgusPercent, item.rightValgusPercent) for item in self._window),
        )
        self._window = []
        self._window_started_at = timestamp_ms
        return point

    def analyze(self, frame: PoseFrame) -> AnalysisResult:
        score = min(frame.landmarks[index].visibility for index in REQUIRED)
        if score < self.min_visibility:
            return AnalysisResult(
                sequence=frame.sequence,
                timestampMs=frame.timestampMs,
                quality=Quality(valid=False, score=score, issue="low-visibility"),
                metrics=None,
                analysis=FrameAnalysis(
                    motion="finding-subject", depthProgress=0, symmetryScore=0,
                    warnings=["full_body_not_visible"],
                ),
            )

        points = frame.landmarks
        left_angle = _angle(points[LEFT["hip"]], points[LEFT["knee"]], points[LEFT["ankle"]])
        right_angle = _angle(points[RIGHT["hip"]], points[RIGHT["knee"]], points[RIGHT["ankle"]])
        raw_average = (left_angle + right_angle) / 2
        previous = self._knee_angle
        average = raw_average if previous is None else self.smoothing_alpha * raw_average + (1 - self.smoothing_alpha) * previous
        self._knee_angle = average

        hip_center_x = (points[LEFT["hip"]].x + points[RIGHT["hip"]].x) / 2
        ankle_center_x = (points[LEFT["ankle"]].x + points[RIGHT["ankle"]].x) / 2
        ankle_width = abs(points[LEFT["ankle"]].x - points[RIGHT["ankle"]].x)
        knee_width = abs(points[LEFT["knee"]].x - points[RIGHT["knee"]].x)
        hip_width = abs(points[LEFT["hip"]].x - points[RIGHT["hip"]].x)
        asymmetry = abs(left_angle - right_angle)
        left_valgus = _valgus_percent(points[LEFT["hip"]], points[LEFT["knee"]], points[LEFT["ankle"]], hip_center_x)
        right_valgus = _valgus_percent(points[RIGHT["hip"]], points[RIGHT["knee"]], points[RIGHT["ankle"]], hip_center_x)

        if average >= 155:
            motion = "standing"
        elif average <= 120:
            motion = "bottom"
        elif previous is None or abs(average - previous) < 0.5:
            motion = "holding"
        elif average < previous:
            motion = "descending"
        else:
            motion = "ascending"

        warnings: list[str] = []
        if max(left_valgus, right_valgus) > 6:
            warnings.append("knee_valgus")
        center_shift = ((hip_center_x - ankle_center_x) / max(ankle_width, 1e-6)) * 100
        if abs(center_shift) > 10:
            warnings.append("lateral_weight_shift")
        if asymmetry > 12:
            warnings.append("knee_angle_asymmetry")

        metrics = FrontalMetrics(
            leftKneeAngle=left_angle,
            rightKneeAngle=right_angle,
            averageKneeAngle=average,
            kneeAngleAsymmetry=asymmetry,
            kneeDistanceRatio=knee_width / max(ankle_width, 1e-6),
            leftValgusPercent=left_valgus,
            rightValgusPercent=right_valgus,
            pelvisTiltDeg=_line_angle(points[LEFT["hip"]], points[RIGHT["hip"]]),
            shoulderTiltDeg=_line_angle(points[LEFT["shoulder"]], points[RIGHT["shoulder"]]),
            trunkLateralLeanDeg=math.degrees(math.atan2(
                ((points[LEFT["shoulder"]].x + points[RIGHT["shoulder"]].x) / 2) - hip_center_x,
                abs(((points[LEFT["shoulder"]].y + points[RIGHT["shoulder"]].y) / 2) - ((points[LEFT["hip"]].y + points[RIGHT["hip"]].y) / 2)),
            )),
            centerShiftPercent=center_shift,
        )
        return AnalysisResult(
            sequence=frame.sequence,
            timestampMs=frame.timestampMs,
            quality=Quality(valid=True, score=score),
            metrics=metrics,
            analysis=FrameAnalysis(
                motion=motion,
                depthProgress=max(0, min(1, (170 - average) / 50)),
                symmetryScore=max(0, 100 - (asymmetry / 30) * 100),
                warnings=warnings,
            ),
            timelinePoint=self._timeline_point(frame.timestampMs, metrics),
        )
